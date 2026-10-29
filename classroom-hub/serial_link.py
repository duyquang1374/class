"""ESP32 USB link. Events keep the same IDs over USB and Wi-Fi."""
import ipaddress
import json
import re
import threading
import time
from datetime import datetime, timedelta, timezone
from server import remove_accents

PREFIX = b'CLASSROOM '


class SerialBridge:
    def __init__(self, store):
        self.store = store
        self.control = threading.RLock()
        self.lock = threading.RLock()
        self.connection = None
        self.thread = None
        self.stop = None
        self.saved = store.directory / 'serial_connection.json'
        self.status = {'connected': False, 'ready': False, 'port': '', 'baud': 115200,
                       'last_frame_at': None, 'frames': 0, 'error': ''}
        self.device = {}

    def snapshot(self):
        with self.lock:
            return dict(self.status)

    def ports(self):
        try:
            from serial.tools import list_ports
        except ImportError:
            raise ValueError('Chưa cài đặt pyserial. Chạy: pip install pyserial (hoặc setup_usb.bat trên Windows).') from None
        raw_ports = list_ports.comports()
        filtered = []
        for p in raw_ports:
            if p.device.startswith('/dev/ttyS') and (not p.description or p.description == 'n/a' or '16550' in p.description or p.description == p.device):
                continue
            filtered.append(p)
        if not filtered and raw_ports:
            filtered = raw_ports
        filtered.sort(key=lambda p: (0 if any(k in p.device.upper() for k in ('USB', 'ACM', 'COM')) else 1, p.device))
        return [{'port': p.device, 'description': p.description or p.device}
                for p in filtered]

    def resume(self):
        if self.saved.exists():
            try:
                self.connect(json.loads(self.saved.read_text())['port'])
            except (ValueError, OSError, KeyError):
                with self.lock:
                    self.status['error'] = 'Chưa mở lại được cổng đã lưu. Cắm ESP32 và chọn Kết nối COM.'

    def connect(self, port):
        if not isinstance(port, str) or port not in [p['port'] for p in self.ports()]:
            raise ValueError('Không tìm thấy cổng COM. Kiểm tra cáp USB rồi tải lại danh sách.')
        with self.control:
            if self.snapshot()['connected'] and self.snapshot()['port'] == port:
                return self.snapshot()
            self.disconnect(forget=False)
            import serial
            link = serial.Serial(port=None, baudrate=115200, timeout=0.2, write_timeout=1)
            link.dtr = False
            link.rts = False
            link.port = port
            try:
                link.open()
            except (serial.SerialException, OSError):
                link.close()
                raise ValueError('Không mở được '+port+'. Đóng Serial Monitor/Arduino IDE nếu đang giữ cổng này.') from None
            stop = threading.Event()
            self.connection, self.stop = link, stop
            with self.lock:
                self.status.update(connected=True, ready=False, port=port, frames=0,
                                   last_frame_at=None, error='')
                self.device = {}
            self.saved.write_text(json.dumps({'port': port}), encoding='utf-8')
            self.thread = threading.Thread(target=self._run, args=(link, stop, port), daemon=True)
            self.thread.start()
            return self.snapshot()

    def disconnect(self, forget=True):
        with self.control:
            if self.stop:
                self.stop.set()
            if self.connection:
                try:
                    self.connection.cancel_read()
                except (AttributeError, OSError):
                    pass
            if self.thread and self.thread is not threading.current_thread():
                self.thread.join(timeout=2)
            if self.connection:
                self.connection.close()
            self.connection = self.thread = self.stop = None
            with self.lock:
                self.status.update(connected=False, ready=False)
                if forget:
                    self.status['error'] = ''
            if forget:
                self.saved.unlink(missing_ok=True)
            return self.snapshot()

    @staticmethod
    def send(link, body):
        link.write(PREFIX + json.dumps(body, separators=(',', ':')).encode('utf-8') + b'\n')

    def send_control(self, equip_id, state):
        with self.control:
            if self.connection and self.snapshot().get('connected'):
                self.send(self.connection, {
                    'cmd': 'control',
                    'id': equip_id,
                    'state': state
                })

    def send_enroll(self, name):
        with self.control:
            if self.connection and self.snapshot().get('connected'):
                self.send(self.connection, {
                    'cmd': 'enroll',
                    'name': name
                })

    def send_standby(self):
        with self.control:
            if self.connection and self.snapshot().get('connected'):
                self.send(self.connection, {
                    'cmd': 'lcd_standby'
                })

    def consume(self, line, link, port):
        if not line.startswith(PREFIX) or len(line) > 8192:
            return
        try:
            message = json.loads(line[len(PREFIX):])
            if not isinstance(message, dict):
                return
            kind = message.get('type')
            if kind == 'hello':
                if message.get('protocol') != 1 or not re.fullmatch(r'[0-9A-Fa-f]{12}', str(message.get('device_id', ''))):
                    return
                with self.lock:
                    self.device = message
                    self.status['ready'] = True
            if not self.snapshot()['ready']:
                return
            wifi_ip = str(self.device.get('wifi_ip', ''))
            try:
                ipaddress.IPv4Address(wifi_ip)
            except ipaddress.AddressValueError:
                wifi_ip = ''
            body = {**message, '_transport': 'usb', '_port': port, '_ip': wifi_ip}
            if kind == 'hello':
                body['rssi'] = self.device.get('rssi', '')
                self.store.heartbeat(body)
            elif kind == 'scan':
                # ACK only after the transaction commits, including unknown/duplicate cards.
                res = self.store.scan(body)
                if res.get('enroll'):
                    self.send(link, {'cmd': 'ack', 'event_id': message['event_id'], 'enroll': True,
                                     'status': res.get('status', ''), 'name': res.get('name', ''),
                                     'reason': res.get('reason', '')})
                else:
                    ack_packet = {'cmd': 'ack', 'event_id': message['event_id']}
                    if getattr(link, '__class__', None) and link.__class__.__name__ != 'Writer':
                        ack_packet.update({
                            'action': res.get('action', ''),
                            'name': res.get('name_clean') or remove_accents(res.get('name', '')),
                            'ok': res.get('ok', False)
                        })
                    self.send(link, ack_packet)
            elif kind == 'telemetry':
                self.store.telemetry(body)
            elif kind == 'equipment':
                self.store.equipment_status(body)
            else:
                return
            with self.lock:
                self.status['frames'] += 1
                self.status['last_frame_at'] = datetime.now(timezone(timedelta(hours=7))).isoformat(timespec='seconds')
                self.status['error'] = ''
        except (ValueError, TypeError, KeyError, UnicodeError):
            with self.lock:
                self.status['error'] = 'Bỏ qua gói dữ liệu COM không hợp lệ; lượt quét chưa được xác nhận.'

    def _run(self, link, stop, port):
        next_hello = 0
        buffer = b''
        try:
            while not stop.is_set():
                if time.monotonic() >= next_hello:
                    self.send(link, {'cmd': 'hello'})
                    next_hello = time.monotonic() + 5
                chunk = link.read(max(1, min(link.in_waiting, 4096)))
                if stop.is_set():
                    break
                buffer += chunk
                while b'\n' in buffer:
                    line, buffer = buffer.split(b'\n', 1)
                    self.consume(line.rstrip(b'\r'), link, port)
                if len(buffer) > 8192:
                    buffer = b''
        except Exception:
            if not stop.is_set() and self.connection is link:
                with self.lock:
                    self.status['error'] = 'Mất kết nối COM. Kiểm tra cáp USB và bấm kết nối lại.'
        finally:
            with self.lock:
                if self.connection is link:
                    self.status.update(connected=False, ready=False)

