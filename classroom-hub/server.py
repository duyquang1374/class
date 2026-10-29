"""LAN classroom server. Python 3.11+, standard library only."""
import argparse
import hmac
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import sqlite3
import threading
import time
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import unicodedata
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
VN = timezone(timedelta(hours=7))
EQUIPMENT_IDS = ('lights', 'fan_1', 'fan_2', 'projector', 'ac')


def remove_accents(input_str):
    if not input_str:
        return ""
    s = str(input_str).replace('đ', 'd').replace('Đ', 'D')
    return "".join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))


def stamp():
    return datetime.now(VN).isoformat(timespec='seconds')


def uid_value(value):
    uid = re.sub(r'[:\s-]', '', str(value)).upper()
    if uid and (not re.fullmatch(r'[0-9A-F]+', uid) or len(uid) not in (8, 14, 20)):
        raise ValueError('UID phải có 8, 14 hoặc 20 ký tự hex.')
    return uid


class Store:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.enroll_state = {
            'active': False,
            'name': '',
            'id': '',
            'status': 'idle',
            'error': '',
            'uid': '',
            'started_at': 0
        }
        self.db = sqlite3.connect(self.directory / 'classroom.db', check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.executescript('''
          PRAGMA journal_mode=WAL;
          CREATE TABLE IF NOT EXISTS students(
            id TEXT PRIMARY KEY, name TEXT NOT NULL, uid TEXT UNIQUE,
            inside INTEGER DEFAULT 0, last_at TEXT, last_action TEXT);
          CREATE TABLE IF NOT EXISTS events(
            id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT UNIQUE,
            student_id TEXT, name TEXT, uid TEXT, action TEXT, at TEXT, created REAL);
          CREATE TABLE IF NOT EXISTS readings(
            id INTEGER PRIMARY KEY, temperature REAL, humidity REAL, at TEXT);
          CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
          CREATE TABLE IF NOT EXISTS equipment(
            id TEXT PRIMARY KEY, on_state INTEGER NOT NULL, updated_at TEXT NOT NULL);
        ''')
        self.db.commit()
        credential_path = self.directory / 'credentials.json'
        if not credential_path.exists():
            credential_path.write_text(json.dumps({
                'admin_token': secrets.token_urlsafe(32),
                'device_token': secrets.token_urlsafe(32)
            }, indent=2), encoding='utf-8')
            try:
                credential_path.chmod(0o600)
            except OSError:
                pass
        self.credentials = json.loads(credential_path.read_text(encoding='utf-8'))
        self.pending_commands = {}

    def state(self):
        with self.lock:
            students = [dict(r) for r in self.db.execute('SELECT * FROM students ORDER BY name')]
            events = [dict(r) for r in self.db.execute('SELECT * FROM events ORDER BY id DESC LIMIT 500')]
            readings = [dict(r) for r in self.db.execute('SELECT * FROM readings ORDER BY id DESC LIMIT 120')][::-1]
            meta = {r['key']: r['value'] for r in self.db.execute('SELECT * FROM meta')}
            equipment = [{'id': r['id'], 'status': 'on' if r['on_state'] else 'off',
                          'updated_at': r['updated_at']} for r in self.db.execute('SELECT * FROM equipment ORDER BY id')]
            day = datetime.now(VN).date().isoformat()
            attended = [r[0] for r in self.db.execute(
                "SELECT DISTINCT student_id FROM events WHERE action='in' AND at LIKE ?", (day + '%',))]
            return {'students': students, 'events': events, 'readings': readings,
                    'device': meta, 'equipment': equipment, 'attended': attended,
                    'school': {'name': 'Trường Tiểu học Phúc Lợi', 'campuses': ['main', 'branch'],
                               'active_class': '1A1', 'active_campus': 'main'},
                    'serverTime': stamp(), 'mode': 'live'}

    def touch_device(self, body, at):
        for key, value in [('lastSeen', at), ('ip', str(body.get('_ip', ''))),
                           ('transport', str(body.get('_transport', 'wifi'))),
                           ('serialPort', str(body.get('_port', '')))]:
            self.db.execute('INSERT OR REPLACE INTO meta VALUES(?,?)', (key, value))
        if 'rssi' in body:
            self.db.execute("INSERT OR REPLACE INTO meta VALUES('rssi',?)", (str(body['rssi']),))

    def heartbeat(self, body):
        with self.lock, self.db:
            self.touch_device(body, stamp())
        return {'ok': True}

    def equipment_status(self, body):
        # Only the implemented classroom may report. A missing report is never OFF.
        if body.get('campus_id', 'main') != 'main' or body.get('class_id', '1A1') != '1A1':
            raise ValueError('Chỉ lớp 1A1 tại trường chính được kết nối trong phiên bản này.')
        states = body.get('states')
        if not isinstance(states, dict) or not states or any(
                key not in EQUIPMENT_IDS or not isinstance(value, bool) for key, value in states.items()):
            raise ValueError('Trạng thái thiết bị phải là true/false và dùng đúng mã thiết bị.')
        at = stamp()
        with self.lock, self.db:
            for key, value in states.items():
                self.db.execute('INSERT OR REPLACE INTO equipment VALUES(?,?,?)', (key, int(value), at))
            self.touch_device(body, at)
        return {'ok': True, 'received': len(states)}

    def control_equipment(self, equip_id, state):
        if equip_id not in EQUIPMENT_IDS:
            raise ValueError('Mã thiết bị không hợp lệ.')
        if not isinstance(state, bool):
            raise ValueError('Trạng thái thiết bị phải là true hoặc false.')
        at = stamp()
        with self.lock, self.db:
            self.db.execute('INSERT OR REPLACE INTO equipment VALUES(?,?,?)', (equip_id, int(state), at))
            self.pending_commands[equip_id] = {'id': equip_id, 'state': state, 'at': at}
        return {'ok': True, 'id': equip_id, 'state': state, 'updated_at': at}

    def pop_commands(self):
        with self.lock:
            cmds = list(self.pending_commands.values())
            self.pending_commands.clear()
            return cmds

    def start_enroll(self, name, sid=None):
        name = str(name).strip()
        if not name or len(name) > 100:
            raise ValueError('Tên học sinh phải dài từ 1 đến 100 ký tự.')
        with self.lock:
            self.enroll_state = {
                'active': True,
                'name': name,
                'id': sid or '',
                'status': 'waiting',
                'error': '',
                'uid': '',
                'started_at': time.time()
            }
            self.pending_commands['enroll'] = {'cmd': 'enroll', 'name': remove_accents(name), 'id': 'enroll'}
            return dict(self.enroll_state)

    def cancel_enroll(self):
        with self.lock:
            self.enroll_state['active'] = False
            self.enroll_state['status'] = 'idle'
            self.pending_commands.pop('enroll', None)
            self.pending_commands['standby'] = {'cmd': 'lcd_standby', 'id': 'standby'}
            return {'ok': True}

    def get_enroll_status(self):
        with self.lock:
            if self.enroll_state.get('active') and time.time() - self.enroll_state.get('started_at', 0) > 60:
                self.enroll_state['active'] = False
                self.enroll_state['status'] = 'error'
                self.enroll_state['error'] = 'Hết thời gian chờ quẹt thẻ (quá 60 giây). Vui lòng thử lại.'
            return dict(self.enroll_state)

    def student(self, body):
        name = str(body.get('name', '')).strip()
        uid = uid_value(body.get('uid', '')) or None
        if not name or len(name) > 100:
            raise ValueError('Tên học sinh phải dài từ 1 đến 100 ký tự.')
        sid = str(body.get('id') or secrets.token_hex(8))
        with self.lock, self.db:
            exists = self.db.execute('SELECT id FROM students WHERE id=?', (sid,)).fetchone()
            if exists:
                self.db.execute('UPDATE students SET name=?, uid=? WHERE id=?', (name, uid, sid))
            else:
                self.db.execute('INSERT INTO students(id,name,uid) VALUES(?,?,?)', (sid, name, uid))
        return {'ok': True, 'id': sid}

    def delete_student(self, sid):
        with self.lock, self.db:
            r = self.db.execute('SELECT inside FROM students WHERE id=?', (sid,)).fetchone()
            if not r:
                raise ValueError('Không tìm thấy học sinh.')
            if r['inside']:
                raise ValueError('Học sinh cần quét thẻ ra lớp trước khi xóa.')
            self.db.execute('DELETE FROM students WHERE id=?', (sid,))
        return {'ok': True}

    def scan(self, body):
        uid = uid_value(body.get('uid', ''))
        event_id = str(body.get('event_id', ''))
        if not uid or not re.fullmatch(r'[A-Za-z0-9_-]{8,100}', event_id):
            raise ValueError('Cần UID và event_id hợp lệ để chống gửi trùng.')
        now = time.time()
        at = stamp()
        with self.lock, self.db:
            if self.enroll_state.get('active'):
                if now - self.enroll_state.get('started_at', 0) > 60:
                    self.enroll_state['active'] = False
                else:
                    target_id = self.enroll_state.get('id')
                    existing = self.db.execute('SELECT * FROM students WHERE uid=?', (uid,)).fetchone()
                    if existing and existing['id'] != target_id:
                        err_msg = f"Thẻ đã tồn tại (đã gán cho học sinh: {existing['name']})"
                        self.enroll_state.update(active=False, status='error', error=err_msg, uid=uid)
                        return {'ok': False, 'enroll': True, 'status': 'error', 'error': err_msg, 'reason': 'exists'}
                    sid = target_id or secrets.token_hex(8)
                    sname = self.enroll_state['name']
                    curr = self.db.execute('SELECT id FROM students WHERE id=?', (sid,)).fetchone()
                    if curr:
                        self.db.execute('UPDATE students SET name=?, uid=? WHERE id=?', (sname, uid, sid))
                    else:
                        self.db.execute('INSERT INTO students(id, name, uid) VALUES (?, ?, ?)', (sid, sname, uid))
                    self.enroll_state.update(active=False, status='success', error='', uid=uid, name=sname, id=sid)
                    return {'ok': True, 'enroll': True, 'status': 'success', 'uid': uid, 'name': sname, 'id': sid}

            prior = self.db.execute('SELECT * FROM events WHERE event_id=?', (event_id,)).fetchone()
            if prior:
                if prior['uid'] != uid:
                    raise ValueError('event_id đã dùng cho thẻ khác.')
                return {'ok': True, 'duplicate': True, 'action': prior['action']}
            self.touch_device(body, at)
            student = self.db.execute('SELECT * FROM students WHERE uid=?', (uid,)).fetchone()
            if not student:
                self.db.execute("INSERT OR REPLACE INTO meta VALUES('unknownUID',?)", (uid,))
                self.db.execute("INSERT INTO events(event_id,uid,action,at,created) VALUES(?,?,'unknown',?,?)",
                                (event_id, uid, at, now))
                return {'ok': False, 'action': 'unknown', 'message': 'Thẻ không hợp lệ', 'uid': uid}
            recent = self.db.execute(
                "SELECT created FROM events WHERE uid=? AND action IN ('in','out') ORDER BY id DESC LIMIT 1", (uid,)).fetchone()
            if recent and now - recent['created'] < 3:
                # Persist ignored IDs too: a late HTTP retry must never toggle occupancy.
                self.db.execute("INSERT INTO events(event_id,student_id,name,uid,action,at,created) VALUES(?,?,?,?,'ignored',?,?)",
                                (event_id, student['id'], student['name'], uid, at, now))
                return {'ok': True, 'action': 'ignored', 'message': 'Bỏ qua quét trùng trong 3 giây',
                        'name': student['name'], 'name_clean': remove_accents(student['name'])}
            inside = 0 if student['inside'] else 1
            action = 'in' if inside else 'out'
            self.db.execute('UPDATE students SET inside=?,last_at=?,last_action=? WHERE id=?',
                            (inside, at, action, student['id']))
            self.db.execute('INSERT INTO events(event_id,student_id,name,uid,action,at,created) VALUES(?,?,?,?,?,?,?)',
                            (event_id, student['id'], student['name'], uid, action, at, now))
            return {'ok': True, 'action': action, 'name': student['name'],
                    'name_clean': remove_accents(student['name'])}

    def telemetry(self, body):
        temp, humidity = body.get('temperature'), body.get('humidity')
        if isinstance(temp, bool) or isinstance(humidity, bool) or not isinstance(temp, (int, float)) or not isinstance(humidity, (int, float)):
            raise ValueError('Nhiệt độ và độ ẩm phải là số.')
        if not -40 <= temp <= 80 or not 0 <= humidity <= 100:
            raise ValueError('Chỉ số ngoài phạm vi DHT22.')
        at = stamp()
        with self.lock, self.db:
            self.db.execute('INSERT INTO readings(temperature,humidity,at) VALUES(?,?,?)', (temp, humidity, at))
            self.db.execute('DELETE FROM readings WHERE id NOT IN (SELECT id FROM readings ORDER BY id DESC LIMIT 1440)')
            self.touch_device(body, at)
        return {'ok': True}


def handler_for(store, serial_bridge=None):
    local_sessions = {}
    sessions_lock = threading.RLock()

    class Handler(BaseHTTPRequestHandler):
        server_version = 'Classroom/1.0'

        def log_message(self, fmt, *args):
            # Do not log URL query strings or authorization headers.
            if args and str(args[0]).startswith('POST /api/device/telemetry'):
                return
            super().log_message(fmt, *args)

        def send_json(self, status, body):
            data = json.dumps(body, ensure_ascii=False).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(data)

        def authorized(self, device=False):
            expected = store.credentials['device_token' if device else 'admin_token']
            actual = self.headers.get('Authorization', '').removeprefix('Bearer ')
            with sessions_lock:
                local_valid = not device and local_sessions.get(actual, 0) > time.time()
            if not local_valid and not hmac.compare_digest(actual.encode(), expected.encode()):
                self.send_json(401, {'error': 'Khóa truy cập không đúng. Kiểm tra data/credentials.json.'})
                return False
            # Devices send no Origin. Browsers must use this local server origin.
            origin = self.headers.get('Origin')
            if origin and urlparse(origin).netloc != self.headers.get('Host'):
                self.send_json(403, {'error': 'Hãy mở giao diện từ máy chủ nội bộ.'})
                return False
            return True

        def local_pairing_allowed(self):
            host = self.headers.get('Host', '')
            try:
                parsed = urlparse('http://' + host)
                valid_host = parsed.hostname in ('localhost', '127.0.0.1', '::1') and parsed.port == self.server.server_port
            except ValueError:
                valid_host = False
            origin = urlparse(self.headers.get('Origin', ''))
            return (self.client_address[0] in ('127.0.0.1', '::1') and valid_host
                    and origin.scheme == 'http' and origin.netloc == host
                    and self.headers.get('Sec-Fetch-Site', 'same-origin') in ('same-origin', 'none'))

        def issue_local_session(self):
            if not self.local_pairing_allowed():
                return self.send_json(403, {'error': 'Mở http://localhost:8080 trên máy đang cắm ESP32 để kết nối tự động.'})
            token = secrets.token_urlsafe(32)
            with sessions_lock:
                now = time.time()
                expired = [key for key, expiry in local_sessions.items() if expiry <= now]
                for key in expired:
                    del local_sessions[key]
                local_sessions[token] = now + 12 * 3600
            return self.send_json(200, {'token': token, 'expires_in': 43200})

        def do_GET(self):
            path = urlparse(self.path).path
            if path == '/api/health':
                return self.send_json(200, {'ok': True, 'service': 'classroom-hub'})
            if path == '/api/state':
                if self.authorized():
                    state = store.state()
                    state['serial'] = serial_bridge.snapshot() if serial_bridge else {'connected': False, 'ready': False}
                    self.send_json(200, state)
                return
            if path == '/api/serial/ports':
                if not self.authorized():
                    return
                if not serial_bridge:
                    return self.send_json(503, {'error': 'Máy chủ chưa bật hỗ trợ cổng COM.'})
                try:
                    return self.send_json(200, {'ports': serial_bridge.ports(), 'serial': serial_bridge.snapshot()})
                except ValueError as e:
                    return self.send_json(503, {'error': str(e)})
            if path == '/api/device/commands':
                if not self.authorized(device=True):
                    return
                return self.send_json(200, {'ok': True, 'commands': store.pop_commands()})
            if path == '/api/export':
                if self.authorized():
                    with store.lock:
                        events = [dict(r) for r in store.db.execute('SELECT * FROM events ORDER BY id DESC')]
                    self.send_json(200, {'events': events})
                return
            if path == '/api/students/enroll-status':
                if self.authorized():
                    return self.send_json(200, store.get_enroll_status())
                return
            if path.startswith('/api/'):
                return self.send_json(404, {'error': 'Không tìm thấy API.'})
            target = (ROOT / 'dist' / (path.lstrip('/') or 'index.html')).resolve()
            if not target.is_relative_to((ROOT / 'dist').resolve()) or not target.is_file():
                return self.send_json(404, {'error': 'Không tìm thấy trang.'})
            data = target.read_bytes()
            self.send_response(200)
            content_type = mimetypes.guess_type(str(target))[0] or 'application/octet-stream'
            self.send_header('Content-Type', content_type + ('; charset=utf-8' if content_type.startswith('text/') or content_type in ('application/javascript', 'application/json') else ''))
            self.send_header('Content-Length', str(len(data)))
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(data)

        def do_POST(self):
            path = urlparse(self.path).path
            device = path.startswith('/api/device/')
            if path == '/api/local-session':
                try:
                    length = int(self.headers.get('Content-Length', 0))
                except ValueError:
                    return self.send_json(400, {'error': 'Nội dung không hợp lệ.'})
                if not 0 <= length <= 8192:
                    return self.send_json(413, {'error': 'Nội dung quá lớn.'})
                self.rfile.read(length)
                return self.issue_local_session()
            if not self.authorized(device):
                return
            try:
                length = int(self.headers.get('Content-Length', 0))
                if not 0 < length <= 8192:
                    return self.send_json(413, {'error': 'Nội dung không hợp lệ hoặc quá lớn.'})
                body = json.loads(self.rfile.read(length))
                if not isinstance(body, dict):
                    raise ValueError('Cần một đối tượng JSON.')
                body['_ip'] = self.client_address[0]
                body['_transport'] = 'wifi'
                body['_port'] = ''
                if path == '/api/students':
                    result = store.student(body)
                elif path == '/api/students/enroll-start':
                    name = str(body.get('name', '')).strip()
                    sid = body.get('id')
                    result = store.start_enroll(name, sid)
                    if serial_bridge and hasattr(serial_bridge, 'send_enroll'):
                        try:
                            serial_bridge.send_enroll(name)
                        except Exception:
                            pass
                elif path == '/api/students/enroll-cancel':
                    result = store.cancel_enroll()
                    if serial_bridge and hasattr(serial_bridge, 'send_standby'):
                        try:
                            serial_bridge.send_standby()
                        except Exception:
                            pass
                elif path == '/api/students/delete':
                    result = store.delete_student(str(body.get('id', '')))
                elif path == '/api/device/scan':
                    result = store.scan(body)
                elif path == '/api/device/telemetry':
                    result = store.telemetry(body)
                elif path == '/api/device/status':
                    result = store.equipment_status(body)
                elif path == '/api/equipment/control':
                    result = store.control_equipment(str(body.get('id', '')), body.get('state'))
                    if serial_bridge and hasattr(serial_bridge, 'send_control'):
                        try:
                            serial_bridge.send_control(body.get('id'), body.get('state'))
                        except Exception:
                            pass
                elif path == '/api/device/commands':
                    result = {'ok': True, 'commands': store.pop_commands()}
                elif path in ('/api/serial/connect', '/api/serial/disconnect'):
                    if not serial_bridge:
                        return self.send_json(503, {'error': 'Máy chủ chưa bật hỗ trợ cổng COM.'})
                    try:
                        result = {'serial': serial_bridge.connect(body.get('port')) if path.endswith('/connect') else serial_bridge.disconnect()}
                    except ValueError as e:
                        return self.send_json(400, {'error': str(e)})
                else:
                    return self.send_json(404, {'error': 'Không tìm thấy API.'})
                return self.send_json(200, result)
            except sqlite3.IntegrityError:
                self.send_json(409, {'error': 'Thẻ RFID này đã được gán cho một học sinh khác.'})
            except (ValueError, TypeError, KeyError):
                self.send_json(400, {'error': 'Dữ liệu không hợp lệ. Kiểm tra tên, UID hoặc giá trị cảm biến.'})
            except Exception:
                self.send_json(500, {'error': 'Không thể lưu dữ liệu. Kiểm tra máy chủ.'})

    return Handler


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--data-dir', default=str(ROOT / 'data'))
    args = parser.parse_args()
    store = Store(args.data_dir)
    from serial_link import SerialBridge
    serial_bridge = SerialBridge(store)
    serial_bridge.resume()
    server = ThreadingHTTPServer((args.host, args.port), handler_for(store, serial_bridge))
    print(f'Mo giao dien: http://localhost:{args.port}', flush=True)
    print(f'Khoa admin va ESP32: {store.directory / "credentials.json"}', flush=True)
    print('Dung Ctrl+C de dung may chu. Khong mo cong nay ra Internet.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
    finally:
        serial_bridge.disconnect(forget=False)
