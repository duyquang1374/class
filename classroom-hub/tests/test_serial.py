import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import Store
from serial_link import PREFIX, SerialBridge


class Writer:
    def __init__(self):
        self.writes = []

    def write(self, data):
        self.writes.append(json.loads(data[len(PREFIX):]))
        return len(data)

    def close(self):
        pass


class SerialTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Store(self.temp.name)
        self.store.student({'id':'s1','name':'An','uid':'AABBCCDD'})
        self.bridge = SerialBridge(self.store)
        self.writer = Writer()

    def tearDown(self):
        self.bridge.disconnect()
        self.store.db.close()
        self.temp.cleanup()

    def frame(self, body):
        self.bridge.consume(PREFIX + json.dumps(body).encode(), self.writer, 'COM7')

    def hello(self):
        self.frame({'type':'hello','protocol':1,'device_id':'123456ABCDEF','wifi_ip':'192.168.0.113','rssi':-50})

    def test_requires_valid_device_handshake(self):
        self.frame({'type':'scan','uid':'AABBCCDD','event_id':'usb-00000001'})
        self.frame({'type':'hello','protocol':999,'device_id':'123456ABCDEF'})
        self.assertFalse(self.bridge.snapshot()['ready'])
        self.assertEqual(self.store.state()['events'],[])
        self.assertEqual(self.writer.writes,[])

    def test_usb_and_wifi_retries_share_event_identity(self):
        self.hello()
        event={'type':'scan','uid':'AABBCCDD','event_id':'usb-00000001'}
        self.frame(event)
        self.assertEqual(self.store.state()['students'][0]['inside'],1)
        self.assertTrue(self.store.scan(event)['duplicate'])
        self.frame(event)
        self.assertEqual(len(self.store.state()['events']),1)
        self.assertEqual(len(self.writer.writes),2)
        self.assertEqual(self.writer.writes[0],{'cmd':'ack','event_id':'usb-00000001'})

    def test_unknown_card_is_recorded_and_acknowledged(self):
        self.hello()
        self.frame({'type':'scan','uid':'11223344','event_id':'usb-unknown1'})
        self.assertEqual(self.store.state()['events'][0]['action'],'unknown')
        self.assertEqual(self.store.state()['students'][0]['inside'],0)
        self.assertEqual(len(self.writer.writes),1)

    def test_never_acknowledges_failed_transaction(self):
        self.hello()
        with patch.object(self.store,'scan',side_effect=OSError('storage unavailable')):
            with self.assertRaises(OSError):
                self.frame({'type':'scan','uid':'AABBCCDD','event_id':'usb-00000001'})
        self.assertEqual(self.writer.writes,[])

    def test_bad_frame_or_card_does_not_change_attendance(self):
        self.hello()
        for line in [b'RFID UID: AABBCCDD', PREFIX+b'not-json', PREFIX+b'[]']:
            self.bridge.consume(line,self.writer,'COM7')
        self.frame({'type':'scan','uid':'invalid','event_id':'usb-00000001'})
        self.assertEqual(self.store.state()['events'],[])
        self.assertEqual(self.writer.writes,[])

    def test_usb_telemetry_keeps_transport_and_board_address(self):
        self.hello()
        self.frame({'type':'telemetry','temperature':29.8,'humidity':70,'rssi':-50})
        state=self.store.state()
        self.assertEqual(state['readings'][-1]['temperature'],29.8)
        self.assertEqual(state['device']['transport'],'usb')
        self.assertEqual(state['device']['serialPort'],'COM7')
        self.assertEqual(state['device']['ip'],'192.168.0.113')

    def test_send_control_frame(self):
        self.bridge.connection = self.writer
        self.bridge.status['connected'] = True
        self.bridge.send_control('lights', True)
        self.assertEqual(len(self.writer.writes), 1)
        self.assertEqual(self.writer.writes[0], {'cmd': 'control', 'id': 'lights', 'state': True})


if __name__=='__main__':
    unittest.main()
