"""End-to-end checks against a temporary LAN server and installed Chrome."""
import json
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import Store, handler_for

import shutil

def find_chrome():
    candidates = [
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        shutil.which('google-chrome'),
        shutil.which('google-chrome-stable'),
        shutil.which('chromium'),
        shutil.which('chromium-browser'),
    ]
    for c in candidates:
        if c and Path(c).exists():
            return str(c)
    return 'C:/Program Files/Google/Chrome/Application/chrome.exe'

CHROME = find_chrome()


class FakeSerialBridge:
    """Browser checks must never open the user's physical board."""
    def __init__(self,store):
        self.store=store
        self.status={'connected':False,'ready':False,'port':'','baud':115200}

    def snapshot(self):
        return dict(self.status)

    def ports(self):
        return [{'port':'COM7','description':'Test ESP32 USB'}]

    def connect(self,port):
        if port!='COM7':raise ValueError('Unknown test port')
        self.status.update(connected=True,ready=True,port=port)
        self.store.heartbeat({'_transport':'usb','_port':port,'_ip':''})
        return self.snapshot()

    def disconnect(self):
        self.status.update(connected=False,ready=False)
        return self.snapshot()

    def send_control(self, equip_id, state):
        pass


class BrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.store = Store(cls.temp.name)
        cls.serial_bridge=FakeSerialBridge(cls.store)
        handler = handler_for(cls.store,cls.serial_bridge)
        handler.log_message = lambda *_: None
        cls.server = ThreadingHTTPServer(('127.0.0.1',0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}'
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(executable_path=CHROME, headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.shutdown()
        cls.thread.join()
        cls.server.server_close()
        cls.store.db.close()
        cls.temp.cleanup()

    def setUp(self):
        self.serial_bridge.disconnect()
        self.context = self.browser.new_context(viewport={'width':1440,'height':1100}, accept_downloads=True)
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))
        self.page.goto(self.url+'/#class/1A1')
        self.page.wait_for_selector('.stat-grid')

    def tearDown(self):
        self.assertEqual(self.errors, [])
        self.context.close()

    def test_demo_toggle_debounce_and_reload(self):
        self.assertEqual(self.page.locator('.stat-value').first.inner_text().split('/')[0].strip(),'24')
        self.page.get_by_role('button',name='Quét thử thẻ').click()
        self.assertEqual(self.page.locator('.stat-value').first.inner_text().split('/')[0].strip(),'23')
        self.page.get_by_role('button',name='Quét thử thẻ').click()
        self.assertEqual(self.page.locator('.stat-value').first.inner_text().split('/')[0].strip(),'23')
        self.page.wait_for_timeout(3100)
        self.page.get_by_role('button',name='Quét thử thẻ').click()
        self.assertEqual(self.page.locator('.stat-value').first.inner_text().split('/')[0].strip(),'24')
        self.page.reload()
        self.page.wait_for_selector('.stat-grid')
        self.assertEqual(self.page.locator('.stat-value').first.inner_text().split('/')[0].strip(),'24')

    def test_com_connection_without_copying_admin_key(self):
        self.page.locator('#mode-button').click()
        self.page.locator('[data-connection-transport="usb"]').click()
        self.page.wait_for_function("document.querySelector('#com-port').value==='COM7'")
        self.assertEqual(self.page.locator('#admin-token').input_value(),'')
        self.page.locator('#connection-submit').click()
        self.page.wait_for_function("mode==='live' && state.device.transport==='usb'")
        self.assertIn('USB / COM7',self.page.locator('#mode-description').inner_text())
        self.assertIn('COM7',self.page.locator('#sidebar-device').inner_text())
        self.page.locator('#mode-button').click()
        self.page.locator('#disconnect-com').click()
        self.page.wait_for_function("document.querySelector('#disconnect-com').hidden")

    def test_student_search_edit_and_csv(self):
        self.page.get_by_role('button',name='Thêm học sinh',exact=True).click()
        self.page.locator('#student-name').fill('Học sinh Kiểm Thử')
        self.page.locator('#student-uid').fill('11223344')
        self.page.get_by_role('button',name='Lưu học sinh').click()
        self.page.locator('[data-nav="students"]').click()
        self.page.locator('#student-search').fill('Kiểm Thử')
        self.assertEqual(self.page.locator('tbody tr').count(),1)
        self.assertIn('Học sinh Kiểm Thử',self.page.locator('tbody').inner_text())
        self.page.locator('[data-edit]').click()
        self.page.locator('#student-name').fill('Học sinh Đã Sửa')
        self.page.get_by_role('button',name='Lưu học sinh').click()
        self.page.locator('#student-search').fill('Đã Sửa')
        self.assertIn('Học sinh Đã Sửa',self.page.locator('tbody').inner_text())
        with self.page.expect_download() as info:
            self.page.get_by_role('button',name='Xuất báo cáo').click()
        self.assertTrue(info.value.suggested_filename.endswith('-du-lieu-mau.csv'))
        self.page.locator('[data-nav="activity"]').click()
        self.page.wait_for_function("page==='activity'")
        self.page.locator('#status-filter').select_option('out')
        self.assertEqual(self.page.locator('tbody tr').count(),2)

    def test_inactive_classes_and_navigation(self):
        self.page.locator('[data-class="2A1"]').click()
        self.page.wait_for_function("page==='classroom' && selectedClass==='2A1'")
        self.assertIn('đang chờ sẵn sàng',self.page.locator('#content').inner_text())
        self.assertTrue(self.page.locator('#add-student').is_disabled())
        self.page.locator('[data-open-class="1A1"]').click()
        self.page.locator('[data-nav="classes"]').click()
        self.page.wait_for_function("page==='classes'")
        self.page.locator('#campus-selector').select_option('all')
        self.assertEqual(self.page.locator('.class-large').count(),4)
        self.page.locator('[data-nav="devices"]').click()
        self.page.wait_for_function("page==='devices'")
        self.assertIn('GPIO 27',self.page.locator('#content').inner_text())

    def test_mobile_layout(self):
        self.page.set_viewport_size({'width':390,'height':844})
        self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
        self.page.locator('#mobile-menu').click()
        self.assertIn('open',self.page.locator('.sidebar').get_attribute('class'))
        self.page.locator('[data-nav="students"]').click()
        self.assertNotIn('open',self.page.locator('.sidebar').get_attribute('class'))
        self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))

    def test_live_mode_isolated_from_demo_and_device_updates(self):
        self.page.locator('#mode-button').click()
        self.page.locator('#admin-token').fill(self.store.credentials['admin_token'])
        self.page.locator('#connection-form button[type="submit"]').click()
        self.page.wait_for_function("document.querySelector('#mode-label').textContent.includes('Máy chủ đã kết nối')")
        self.assertEqual(self.page.locator('.stat-value').first.inner_text().split('/')[0].strip(),'0')
        self.assertEqual(self.page.get_by_role('button',name='Quét thử thẻ').count(),0)
        self.page.get_by_role('button',name='Thêm học sinh',exact=True).click()
        self.page.locator('#student-name').fill('Học sinh Thiết Bị')
        self.page.locator('#student-uid').fill('99887766')
        self.page.get_by_role('button',name='Lưu học sinh').click()
        self.page.wait_for_function("!document.querySelector('#student-dialog').open")
        for endpoint,payload in [('scan',{'uid':'99887766','event_id':'browser-000001'}),('telemetry',{'temperature':29.2,'humidity':66,'rssi':-44})]:
            request=Request(self.url+'/api/device/'+endpoint,data=json.dumps(payload).encode(),headers={'Authorization':'Bearer '+self.store.credentials['device_token'],'Content-Type':'application/json'})
            with urlopen(request) as response:
                self.assertEqual(response.status,200)
        self.page.wait_for_function("document.querySelector('.stat-value').textContent.trim().startsWith('1')")
        self.page.wait_for_function("document.querySelectorAll('.stat-value')[2].textContent.includes('29.2')")
        self.page.reload()
        self.page.wait_for_function("document.querySelector('#mode-label').textContent.includes('Máy chủ đã kết nối')")
        # A slow in-flight live response must not overwrite the demo on switching modes.
        self.page.evaluate("""() => {
          const original = window.fetch;
          window.fetch = (...args) => original(...args).then(response =>
            args[0] === '/api/state' ? new Promise(resolve => setTimeout(() => resolve(response), 1500)) : response);
        }""")
        self.page.wait_for_function('pollBusy')
        self.page.locator('#mode-button').click()
        self.page.locator('#demo-mode-button').click()
        self.page.wait_for_timeout(2000)
        self.assertEqual(self.page.locator('.stat-value').first.inner_text().split('/')[0].strip(),'24')

    def test_camera_url_validation_and_screenshot(self):
        self.page.locator('[data-action="camera"]').first.click()
        self.page.locator('#camera-source').select_option('ip')
        self.page.locator('#camera-url').fill('ftp://192.168.1.10/stream')
        self.page.locator('#camera-form button[type="submit"]').click()
        self.assertIn('HTTP/HTTPS',self.page.locator('#camera-error').inner_text())
        self.page.locator('[data-close="camera-dialog"]').click()
        output=Path(__file__).resolve().parents[2]/'classroom-preview.png'
        self.page.screenshot(path=str(output),full_page=True)

    def test_school_campuses_drilldown_and_devices(self):
        self.page.goto(self.url)
        self.page.wait_for_selector('.campus-card')
        self.assertIn('Phúc Lợi', self.page.title())
        self.assertEqual(self.page.locator('.campus-card').count(), 2)
        self.assertEqual(self.page.locator('.equipment-panel .equipment-on').count(), 3)
        self.page.locator('[data-campus="branch"]').click()
        self.page.wait_for_selector('.class-large')
        self.assertIn('Phân hiệu', self.page.locator('#page-title').inner_text())
        self.assertEqual(self.page.locator('.class-large').count(), 2)
        self.assertIn('Chưa kết nối thiết bị tại phân hiệu', self.page.locator('#content').inner_text())
        self.page.locator('[data-nav="devices"]').click()
        self.assertEqual(self.page.locator('[data-equipment]').count(), 0)
        self.page.locator('#campus-selector').select_option('main')
        self.page.wait_for_selector('#device-state-filter')
        self.page.locator('#device-state-filter').select_option('off')
        self.assertEqual(self.page.locator('.equipment-panel tbody tr').count(), 2)
        self.page.locator('[data-equipment="projector"]').first.click()
        self.assertIn('Máy chiếu', self.page.locator('#equipment-dialog-title').inner_text())
        self.assertIn('Đã tắt', self.page.locator('#equipment-dialog-body').inner_text())
        self.page.locator('#equipment-dialog [data-close]').first.click()
        self.page.locator('[data-nav="overview"]').click()
        # The home summary must show all ON devices regardless of the previous OFF filter.
        self.assertEqual(self.page.locator('.equipment-panel .equipment-on').count(), 3)
        desktop=Path(__file__).resolve().parents[2]/'phuc-loi-desktop-preview.png'
        self.page.screenshot(path=str(desktop), full_page=True, animations='disabled')
        self.page.set_viewport_size({'width':390,'height':844})
        self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
        output=Path(__file__).resolve().parents[2]/'phuc-loi-school-preview.png'
        self.page.screenshot(path=str(output), full_page=True, animations='disabled')
        self.page.locator('[data-campus="main"]').first.click()
        self.page.locator('[data-open-class="1A1"]').click()
        self.page.wait_for_function("page==='classroom' && selectedClass==='1A1'")
        self.assertEqual(self.page.locator('#page-title').inner_text(), 'Lớp 1A1.')

    def test_equipment_live_unknown_feedback_and_stale(self):
        self.page.locator('#mode-button').click()
        self.page.locator('#admin-token').fill(self.store.credentials['admin_token'])
        self.page.locator('#connection-form button[type="submit"]').click()
        self.page.wait_for_function("document.querySelector('#mode-label').textContent.includes('Máy chủ đã kết nối')")
        self.page.locator('[data-nav="devices"]').click()
        self.page.wait_for_selector('.equipment-panel')
        self.assertEqual(self.page.locator('.equipment-panel .equipment-on').count(), 0)
        self.assertEqual(self.page.locator('.equipment-panel tbody .badge.orange').count(), 5)
        payload={'campus_id':'main','class_id':'1A1','states':{'lights':True,'fan_1':False}}
        request=Request(self.url+'/api/device/status',data=json.dumps(payload).encode(),headers={'Authorization':'Bearer '+self.store.credentials['device_token'],'Content-Type':'application/json'})
        with urlopen(request) as response:
            self.assertEqual(response.status,200)
        self.page.wait_for_function("document.querySelectorAll('.equipment-panel .equipment-on').length===1")
        self.assertIn('Đã tắt',self.page.locator('.equipment-panel tbody tr').nth(1).inner_text())
        self.page.locator('[data-equipment="lights"]').first.click()
        self.assertIn('Đang bật',self.page.locator('#equipment-dialog-body').inner_text())
        self.assertIn('phản hồi ESP32',self.page.locator('#equipment-dialog-body').inner_text())
        # An older report must turn unknown, even while the server still responds.
        with self.store.lock, self.store.db:
            self.store.db.execute("UPDATE equipment SET updated_at='2020-01-01T00:00:00+07:00'")
        self.page.wait_for_function("document.querySelectorAll('.equipment-panel tbody .badge.orange').length===5")
        self.assertIn('Chưa có dữ liệu',self.page.locator('#equipment-dialog-body').inner_text())
        self.page.locator('#equipment-dialog [data-close]').first.click()


if __name__ == '__main__':
    unittest.main()
