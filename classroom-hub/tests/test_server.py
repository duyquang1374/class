import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from http.server import ThreadingHTTPServer
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import Store, handler_for


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Store(self.temp.name)
        self.store.student({'id': 's1', 'name': 'Nguyễn An', 'uid': 'AA BB CC DD'})

    def tearDown(self):
        self.store.db.close()
        self.temp.cleanup()

    def scan(self, event='scan-00000001', uid='AABBCCDD'):
        return self.store.scan({'uid': uid, 'event_id': event})

    def test_toggle_and_debounce(self):
        with patch('server.time.time', return_value=100):
            self.assertEqual(self.scan()['action'], 'in')
        with patch('server.time.time', return_value=101):
            self.assertEqual(self.scan('scan-00000002')['action'], 'ignored')
            self.assertEqual(self.store.state()['students'][0]['inside'], 1)
        with patch('server.time.time', return_value=104):
            self.assertEqual(self.scan('scan-00000003')['action'], 'out')
            self.assertEqual(self.store.state()['students'][0]['inside'], 0)
        # A delayed retry of a previously ignored event cannot flip occupancy.
        with patch('server.time.time', return_value=200):
            self.assertTrue(self.scan('scan-00000002')['duplicate'])
            self.assertEqual(self.store.state()['students'][0]['inside'], 0)

    def test_idempotent_even_after_restart(self):
        self.scan()
        self.store.db.close()
        self.store = Store(self.temp.name)
        self.assertTrue(self.scan()['duplicate'])
        self.assertEqual(len(self.store.state()['events']), 1)
        self.assertEqual(self.store.state()['students'][0]['inside'], 1)

    def test_unknown_card_does_not_count(self):
        self.assertEqual(self.scan(uid='11223344')['action'], 'unknown')
        self.assertEqual(self.store.state()['students'][0]['inside'], 0)
        self.assertEqual(self.store.state()['device']['unknownUID'], '11223344')
        self.store.student({'id':'s2','name':'Bình','uid':'11223344'})
        self.assertTrue(self.scan(uid='11223344')['duplicate'])
        self.assertEqual(self.store.state()['students'][1]['inside'], 0)

    def test_concurrent_retry_only_one_event(self):
        with ThreadPoolExecutor(max_workers=8) as executor:
            list(executor.map(lambda _: self.scan(), range(20)))
        self.assertEqual(len(self.store.state()['events']), 1)
        self.assertEqual(self.store.state()['students'][0]['inside'], 1)

    def test_duplicate_uid_and_bad_uid(self):
        import sqlite3
        with self.assertRaises(sqlite3.IntegrityError):
            self.store.student({'name':'Bình','uid':'AABBCCDD'})
        for uid in ['INVALID', 'AA', 'AABBCCDD00']:
            with self.assertRaises(ValueError):
                self.store.student({'name':'Bình','uid':uid})
        with self.assertRaises(ValueError):
            self.store.student({'name':'   '})

    def test_cannot_reuse_event_for_other_uid(self):
        self.scan()
        with self.assertRaises(ValueError):
            self.scan(uid='11223344')

    def test_delete_inside_refused_history_preserved(self):
        self.scan()
        with self.assertRaises(ValueError):
            self.store.delete_student('s1')
        with patch('server.time.time', return_value=9999999999):
            self.scan('scan-00000002')
        self.store.delete_student('s1')
        self.assertEqual(len(self.store.state()['students']), 0)
        self.assertEqual(len(self.store.state()['events']), 2)

    def test_sensor_ranges(self):
        self.store.telemetry({'temperature':28.4,'humidity':62,'rssi':-55})
        self.assertEqual(self.store.state()['readings'][-1]['humidity'], 62)
        for temperature, humidity in [(200,60),(25,101),('25',60),(True,50),(float('nan'),30)]:
            with self.assertRaises(ValueError):
                self.store.telemetry({'temperature':temperature,'humidity':humidity})

    def test_equipment_partial_feedback_and_restart(self):
        self.assertEqual(self.store.state()['equipment'], [])
        self.store.equipment_status({'states':{'lights':True,'fan_1':False}})
        reports={r['id']:r for r in self.store.state()['equipment']}
        self.assertEqual(reports['lights']['status'],'on')
        self.assertEqual(reports['fan_1']['status'],'off')
        self.assertNotIn('projector',reports)
        self.store.db.close()
        self.store=Store(self.temp.name)
        self.assertEqual(len(self.store.state()['equipment']),2)

    def test_equipment_rejects_other_campus_or_class(self):
        for campus, classroom in [('branch','1A1'),('main','2A1'),('other','1A1')]:
            with self.assertRaises(ValueError):
                self.store.equipment_status({'campus_id':campus,'class_id':classroom,'states':{'lights':True}})
        self.assertEqual(self.store.state()['equipment'],[])

    def test_equipment_validation_is_atomic(self):
        for states in [{'lights':True,'unknown':False},{'lights':'on'},{'lights':1},{},[]]:
            with self.assertRaises(ValueError):
                self.store.equipment_status({'states':states})
        self.assertEqual(self.store.state()['equipment'],[])

    def test_enroll_student_flow(self):
        # 1. Start enrollment
        status = self.store.start_enroll('Trần Văn Bình')
        self.assertTrue(status['active'])
        self.assertEqual(status['name'], 'Trần Văn Bình')
        self.assertEqual(status['status'], 'waiting')

        # 2. Scanning a duplicate card (AABBCCDD already belongs to Nguyễn An)
        dup_res = self.scan('enroll-scan-1', uid='AABBCCDD')
        self.assertFalse(dup_res['ok'])
        self.assertEqual(dup_res['status'], 'error')
        self.assertIn('Thẻ đã tồn tại', dup_res['error'])
        self.assertFalse(self.store.get_enroll_status()['active'])

        # 3. Start enrollment again for new card
        self.store.start_enroll('Lê Hoàng Nam')
        new_res = self.scan('enroll-scan-2', uid='12345678')
        self.assertTrue(new_res['ok'])
        self.assertEqual(new_res['status'], 'success')
        self.assertEqual(new_res['name'], 'Lê Hoàng Nam')
        self.assertEqual(new_res['uid'], '12345678')
        # Student now in database
        students = {s['uid']: s['name'] for s in self.store.state()['students']}
        self.assertEqual(students['12345678'], 'Lê Hoàng Nam')


    def test_control_equipment_and_pop_commands(self):
        res = self.store.control_equipment('lights', True)
        self.assertTrue(res['ok'])
        self.assertEqual(res['id'], 'lights')
        self.assertTrue(res['state'])
        state = self.store.state()
        reports = {r['id']: r for r in state['equipment']}
        self.assertEqual(reports['lights']['status'], 'on')
        cmds = self.store.pop_commands()
        self.assertEqual(len(cmds), 1)
        self.assertEqual(cmds[0]['id'], 'lights')
        self.assertTrue(cmds[0]['state'])
        self.assertEqual(len(self.store.pop_commands()), 0)
        with self.assertRaises(ValueError):
            self.store.control_equipment('unknown_dev', True)
        with self.assertRaises(ValueError):
            self.store.control_equipment('lights', 'not_bool')


class HTTPTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Store(self.temp.name)
        handler = handler_for(self.store)
        handler.log_message = lambda *_: None
        self.server = ThreadingHTTPServer(('127.0.0.1',0), handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f'http://127.0.0.1:{self.server.server_port}'

    def tearDown(self):
        self.server.shutdown()
        self.thread.join()
        self.server.server_close()
        self.store.db.close()
        self.temp.cleanup()

    def request(self, path, body=None, role=None, origin=None):
        headers = {}
        if role:
            headers['Authorization'] = 'Bearer '+self.store.credentials[role+'_token']
        if origin:
            headers['Origin'] = origin
        data = json.dumps(body).encode() if body is not None else None
        try:
            response = urlopen(Request(self.url+path, data=data, headers=headers), timeout=3)
        except HTTPError as e:
            response = e
        return response.status, response.read()

    def test_read_requires_admin_and_device_cannot_read(self):
        self.assertEqual(self.request('/api/state')[0],401)
        self.assertEqual(self.request('/api/state',role='device')[0],401)
        self.assertEqual(self.request('/api/state',role='admin')[0],200)
        self.assertEqual(self.request('/api/health')[0],200)

    def test_real_flow_and_export(self):
        self.assertEqual(self.request('/api/students',{'name':'An','uid':'AABBCCDD'},'admin')[0],200)
        self.assertEqual(self.request('/api/device/scan',{'uid':'AABBCCDD','event_id':'esp-00000001'},'device')[0],200)
        data = json.loads(self.request('/api/state',role='admin')[1])
        self.assertEqual(data['students'][0]['inside'],1)
        self.assertEqual(len(json.loads(self.request('/api/export',role='admin')[1])['events']),1)

    def test_device_cannot_manage_and_browser_origin_checked(self):
        self.assertEqual(self.request('/api/students',{'name':'An'},'device')[0],401)
        self.assertEqual(self.request('/api/students',{'name':'An'},'admin',origin='https://untrusted.example')[0],403)

    def test_private_files_not_served(self):
        for path in ['/data/credentials.json','/server.py','/../server.py','/.openai/hosting.json']:
            self.assertEqual(self.request(path)[0],404)

    def test_equipment_endpoint_requires_device_key(self):
        payload={'campus_id':'main','class_id':'1A1','states':{'lights':True}}
        self.assertEqual(self.request('/api/device/status',payload,'admin')[0],401)
        self.assertEqual(self.request('/api/device/status',payload,'device')[0],200)
        state=json.loads(self.request('/api/state',role='admin')[1])
        self.assertEqual(state['equipment'][0]['status'],'on')
        self.assertEqual(state['school']['active_campus'],'main')

    def test_local_pairing_issues_separate_admin_session(self):
        status,body=self.request('/api/local-session',{},origin=self.url)
        self.assertEqual(status,200)
        token=json.loads(body)['token']
        self.assertNotEqual(token,self.store.credentials['admin_token'])
        request=Request(self.url+'/api/state',headers={'Authorization':'Bearer '+token})
        with urlopen(request) as response:
            self.assertEqual(response.status,200)
        bad=Request(self.url+'/api/device/telemetry',data=b'{}',headers={'Authorization':'Bearer '+token})
        with self.assertRaises(HTTPError) as error:
            urlopen(bad)
        self.assertEqual(error.exception.code,401)
        error.exception.close()

    def test_local_pairing_rejects_cross_origin_and_no_origin(self):
        self.assertEqual(self.request('/api/local-session',{})[0],403)
        self.assertEqual(self.request('/api/local-session',{},origin='http://attacker.example')[0],403)
        request=Request(self.url+'/api/local-session',data=b'{}',headers={'Host':'attacker.example','Origin':'http://attacker.example'})
        with self.assertRaises(HTTPError) as error:
            urlopen(request)
        self.assertEqual(error.exception.code,403)
        error.exception.close()

    def test_device_key_cannot_control_serial_port(self):
        self.assertEqual(self.request('/api/serial/connect',{'port':'COM7'},'device')[0],401)
        self.assertEqual(self.request('/api/serial/ports',role='device')[0],401)

    def test_equipment_control_and_device_commands_api(self):
        status, body = self.request('/api/equipment/control', {'id': 'fan_1', 'state': True}, role='admin')
        self.assertEqual(status, 200)
        self.assertTrue(json.loads(body)['ok'])
        status, _ = self.request('/api/equipment/control', {'id': 'fan_1', 'state': False}, role='device')
        self.assertEqual(status, 401)
        status, body = self.request('/api/device/commands', role='device')
        self.assertEqual(status, 200)
        cmds = json.loads(body)['commands']
        self.assertEqual(len(cmds), 1)
        self.assertEqual(cmds[0]['id'], 'fan_1')
        self.assertTrue(cmds[0]['state'])


if __name__ == '__main__':
    unittest.main()
