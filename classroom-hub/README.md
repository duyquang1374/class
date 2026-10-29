# Trường Tiểu học Phúc Lợi · Quản lý nhà trường với ESP32

Giao diện tiếng Việt cho **Trường Tiểu học Phúc Lợi**, gồm **trường chính và một phân hiệu**. Hiệu trưởng hoặc người quản lý có thể mở từng cơ sở, từng lớp để xem điểm danh, cảm biến, camera và các thiết bị đang bật.

| Cơ sở | Lớp hoạt động | Lớp mẫu |
|---|---|---|
| Trường chính | **1A1** – phòng 101 | 2A1 – phòng 102 |
| Phân hiệu | Chưa triển khai phần cứng | 1A2 – phòng 101, 2A2 – phòng 102 |

Trang tổng quan hiển thị riêng số lớp, sĩ số hiện tại và số thiết bị được xác nhận đang bật tại từng cơ sở. Bấm **Xem cơ sở** để mở danh sách lớp; bấm **Vào lớp học** để xem chi tiết. Bộ chọn cơ sở ở đầu trang giới hạn danh sách lớp và thiết bị theo cơ sở. Hiệu trưởng và quản lý sử dụng cùng quyền quản trị thông qua khóa admin của máy chủ nội bộ.

## Chạy trên máy tính

Yêu cầu **Python 3.11 trở lên**. Không cần npm hay cài thư viện Python để chạy web.

1. Nhấp đúp `start.bat`, hoặc chạy `python server.py` trong thư mục này.
2. Mở **http://localhost:8080** bằng Chrome/Edge.
3. Ban đầu là **chế độ dùng thử**: 32 học sinh mẫu, 24 trong lớp, 2 đã rời lớp, 6 chưa đến. Số liệu cảm biến là mẫu cố định, không tự giả lập dữ liệu thiết bị thật. Có thể thêm/sửa/xóa học sinh mẫu và quét thử thẻ. Dữ liệu thử lưu riêng trong trình duyệt.
4. Bấm **Kết nối thiết bị thật**. Khi mở bằng `localhost`, có thể kết nối tự động trên máy này. Khi mở qua địa chỉ LAN trên máy khác, lấy `admin_token` trong `data/credentials.json` và nhập vào giao diện.
5. Mở **Trường chính → Vào lớp học 1A1**. Chế độ thật bắt đầu với danh sách **trống**. Thêm học sinh và gán UID thẻ thực tế. Khi ESP32 quét thẻ lạ, UID hiện ở **Thiết bị & kết nối** và được điền sẵn khi thêm học sinh.

`data/classroom.db` lưu dữ liệu thật bằng SQLite. Khởi động lại vẫn giữ lịch sử và trạng thái trong lớp. Giữ thư mục `data/` để sao lưu cả dữ liệu và khóa. Không chia sẻ tệp khóa hoặc đưa lên Git.

Nếu cổng 8080 đang được dùng: `python server.py --port 8081`, rồi sửa SERVER_URL của ESP32 tương ứng. Mặc định lắng nghe `0.0.0.0` để ESP32 trong mạng LAN truy cập được. Trình duyệt trên máy khác có thể dùng `http://IP_MAY_TINH:8080` và đăng nhập bằng khóa quản trị. Mỗi trình duyệt có chế độ mẫu riêng; dữ liệu thật được dùng chung qua máy chủ.

Trang Sites trực tuyến là **giao diện trải nghiệm tĩnh, riêng tư**. Máy chủ Python và SQLite chạy trên máy tính của bạn, không được triển khai lên Sites. Muốn dùng thiết bị thật, mở giao diện máy chủ nội bộ theo các bước trên. Không đổi website sang công khai chỉ để kết nối ESP32.

## Kết nối bằng cổng COM / USB

1. Chạy `setup_usb.bat` một lần để cài hỗ trợ COM (pySerial 3.5).
2. Nạp bản `firmware/classroom_esp32/classroom_esp32.ino` mới vào ESP32, rồi đóng Serial Monitor của Arduino IDE để nhường cổng.
3. Chạy `start.bat` và mở **http://localhost:8080/#connect-com** trên máy đang cắm ESP32.
4. Chọn **Cổng COM / USB**, chọn cổng nhận được (ví dụ **COM9 – USB-SERIAL CH340**) và bấm **Kết nối COM**. Tốc độ cố định là **115200 baud**. Không cần tự nhập khóa quản trị khi mở bằng localhost trên chính máy đó.
5. Khi hiện **Đã kết nối COM9**, dữ liệu RFID và DHT22 được truyền trực tiếp qua cáp tới máy chủ và lưu cùng cơ sở dữ liệu đang dùng. Học sinh và lịch sử cũ được giữ nguyên.

Nếu đang mở giao diện tại `http://192.168.x.x:8080` hoặc trang Sites, tab COM sẽ có nút **Mở kết nối COM trên máy này** để chuyển sang localhost. Cổng COM thuộc máy tính chạy máy chủ; không mở cổng USB của điện thoại hoặc máy khách từ xa.

Máy chủ ghi nhớ cổng đã chọn để thử mở lại khi chạy lần sau. Bấm **Ngắt COM** để giải phóng cổng trước khi nạp Arduino hoặc dùng Serial Monitor. Rút cáp sẽ hiện mất kết nối; cắm lại và bấm kết nối lại để tiếp tục.

USB và Wi-Fi dùng chung `event_id` cho mỗi lượt quét. ESP32 chỉ xóa lượt đã lưu khỏi hàng đợi sau khi máy chủ xác nhận, nên đổi đường truyền hoặc gửi lại sẽ không làm tăng/giảm sĩ số lần thứ hai. Khi COM đang hoạt động, dữ liệu ưu tiên USB; sau khi ngắt COM khoảng 15 giây, ESP32 có thể gửi lại qua Wi-Fi nếu mạng đã được cấu hình. Lượt đang chờ được gửi cách nhau tối thiểu 3,5 giây để tránh bộ lọc quét trùng.

Trên máy chủ có các API quản trị `GET /api/serial/ports`, `POST /api/serial/connect` với `{"port":"COM9"}`, và `POST /api/serial/disconnect`. Phiên ghép nối tự động `POST /api/local-session` chỉ được cấp cho yêu cầu cùng nguồn qua localhost/127.0.0.1 từ chính máy đó, có hạn 12 giờ, không trả về khóa quản trị cố định và không được dùng để gửi API thiết bị. Các máy truy cập qua LAN vẫn cần khóa quản trị.

## Giám sát và điều khiển thiết bị từ xa

Mục **Thiết bị & kết nối** có danh sách hệ thống đèn, quạt trần 01, quạt trần 02, máy chiếu và điều hòa của lớp 1A1 tại trường chính. Bấm nút **Bật / Tắt** trực tiếp tại từng dòng hoặc trong modal **Chi tiết** để điều khiển thiết bị từ xa.

- **Chế độ dùng thử:** Cho phép bấm Bật / Tắt mô phỏng trực tiếp trên trình duyệt, lưu trạng thái vào trình duyệt.
- **Thiết bị thật:** Máy chủ gửi lệnh qua cáp USB (phản hồi tức thì) hoặc Wi-Fi (ESP32 nhận lệnh trong ~1,5 giây). ESP32 áp dụng mức logic ra chân GPIO và phản hồi trạng thái xác nhận về máy chủ.
- **Mô phỏng phần cứng lớp học:**
  - `lights` (Hệ thống đèn): Mô phỏng bằng **1 đèn LED** nối với chân **GPIO 2** (trên bo DOIT ESP32 DevKit V1 đã tích hợp sẵn LED xanh dương tại GPIO 2, có thể quan sát trực tiếp mà không cần cắm thêm linh kiện ngoài; hoặc cắm LED ngoài nối tiếp điện trở 220Ω - 330Ω xuống GND).
  - `fan_1` (Quạt trần 01): Mô phỏng bằng **1 quạt 5V DC** điều khiển qua chân **GPIO 4**. Do quạt 5V tiêu thụ dòng lớn (100–300mA), **KHÔNG ĐƯỢC** cắm quạt trực tiếp vào chân GPIO của ESP32 (dòng tối đa chỉ 12–20mA) mà phải kích qua **Module Relay 5V** hoặc **Transistor NPN (2N2222 / TIP120) / MOSFET** và gắn thêm diode 1N4007 dập xung ngược.

| Thiết bị mô phỏng | Mã thiết bị | Chân ESP32 | Cơ chế điều khiển |
|---|---|---|---|
| **Đèn LED** | `lights` | **GPIO 2** | Xuất HIGH = Bật LED; LOW = Tắt LED (có sẵn LED onboard) |
| **Quạt 5V DC** | `fan_1` | **GPIO 4** | Xuất HIGH = Đóng Relay/Transistor cấp nguồn 5V cho quạt; LOW = Ngắt |

### Tùy chọn phản hồi mạch điện cũ (Monitoring)
Trong `config.h`, tùy chọn `#define CLASSROOM_MONITOR_EQUIPMENT 1` dùng khi có mạch phản hồi logic 3.3V đọc trạng thái công tắc (GPIO 32, 33, 25, 26, 14). Mặc định là **0**.

## Quy tắc RFID

- Thẻ của học sinh đang ngoài lớp → **vào lớp**, sĩ số tăng 1.
- Cùng thẻ khi học sinh đang trong lớp → **ra lớp**, sĩ số giảm 1.
- Quét cùng thẻ trong vòng **3 giây**: bỏ qua, không đổi sĩ số.
- Chương trình ESP32 yêu cầu rút thẻ ra khỏi đầu đọc trước lượt tiếp theo.
- Mỗi lượt có `event_id` duy nhất; ESP32 gửi lại cùng sự kiện sau lỗi mạng sẽ không bị tính hai lần.
- Thẻ chưa đăng ký chỉ tạo thông báo/lịch sử, không thay đổi sĩ số. Thẻ đó cần được quét lại sau khi đã gán cho học sinh.
- Một UID chỉ gán cho một học sinh. Không xóa học sinh đang trong lớp; cho học sinh quét ra trước.
- “Đang trong lớp” là trạng thái hiện tại, giữ qua ngày. “Đã đến lớp hôm nay” đếm học sinh có lượt vào theo ngày Việt Nam. Không tự đặt lại sĩ số lúc nửa đêm.
- Các lần quét chỉ phản ánh việc dùng thẻ, không xác minh người cầm thẻ. Camera chỉ xem, không nhận diện hay tự động đếm người.

## Linh kiện và nối dây

- ESP32 DevKit V1.
- Đầu đọc RFID **RC522** và thẻ tương thích.
- Cảm biến **DHT22**, điện trở 10kΩ cho loại cảm biến rời; module có sẵn điện trở thì không cần thêm.
- Dây nối, cáp USB cấp nguồn. Tắt nguồn trước khi đấu dây.
- Camera tùy chọn: webcam USB của máy tính, camera IP hoặc **ESP32-CAM riêng**. ESP32 DevKit V1 trong thiết kế này không kết nối module camera trực tiếp.

| Thiết bị | Chân | ESP32 DevKit V1 |
|---|---|---|
| RC522 | 3.3V | 3V3 (không dùng 5V) |
| RC522 | GND | GND |
| RC522 | SDA / SS | GPIO 21 |
| RC522 | SCK | GPIO 18 |
| RC522 | MOSI |s GPIO 23 |
| RC522 | MISO | GPIO 19 |
| RC522 | RST | GPIO 22 |
| RC522 | IRQ | Không nối |
| DHT22 | VCC | 3V3 |
| DHT22 | DATA | GPIO 27 |
| DHT22 | GND | GND |
| DHT22 | NC (nếu có) | Không nối |

Nối điện trở **10kΩ giữa DATA và 3V3** của DHT22 loại rời. Đọc nhãn chân của module đang dùng, tránh nhầm thứ tự chân theo mặt nhìn.

## Nạp ESP32 bằng Arduino IDE

1. Cài gói board **esp32 by Espressif Systems** qua Boards Manager. Hướng dẫn chính thức: https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html
2. Chọn board **DOIT ESP32 DEVKIT V1**, chọn đúng cổng COM.
3. Library Manager: cài **MFRC522** (GithubCommunity / miguelbalboa), **DHT sensor library** (Adafruit), **Adafruit Unified Sensor**, **ArduinoJson phiên bản 7**.
4. Mở `firmware/classroom_esp32/classroom_esp32.ino`.
5. Trong cùng thư mục, sao chép `config.example.h` thành **`config.h`** và sửa 4 giá trị:

```cpp
const char* WIFI_SSID = "Ten_WiFi";
const char* WIFI_PASSWORD = "Mat_khau";
const char* SERVER_URL = "http://192.168.1.10:8080";
const char* DEVICE_TOKEN = "device_token_trong_credentials.json";
```

6. `SERVER_URL` dùng **IPv4 của máy tính**, xem bằng `ipconfig` trên Windows. Không dùng `localhost`, IP ESP32, hoặc URL trang Sites. Không thêm dấu `/` cuối URL.
7. Máy tính và ESP32 dùng cùng mạng. Nếu Windows hỏi quyền tường lửa, cho Python truy cập **mạng riêng (Private)**. Không cần mở cổng trên router. Khóa `device_token` chỉ được dùng cho hai API thiết bị; khóa `admin_token` dùng giao diện quản trị.
8. Upload, mở Serial Monitor **115200 baud**. UID thẻ được in dưới dạng hex; giao diện chấp nhận cả dạng có khoảng trắng.
9. Quét vào, rút thẻ ra, chờ ít nhất 3 giây rồi quét ra. Cảm biến gửi mỗi **10 giây**, trang web đồng bộ mỗi **2 giây**.

ESP32 lưu hàng đợi tối đa **32 lượt quét** vào NVS khi mất kết nối, gửi lại lần lượt khi kết nối trở lại. Khi đầy, lượt mới không được lưu; Serial Monitor báo `QUEUE FULL`, cần khôi phục mạng rồi quét lại. Sự kiện gửi chậm được ghi **thời gian máy chủ nhận**, không phải thời gian quét ngoại tuyến. Hàng đợi được giữ qua khởi động lại, nhưng ngắt nguồn đúng lúc ghi flash vẫn có thể gây mất lượt; không thể coi đây là hệ thống kiểm soát ra/vào có đảm bảo an toàn. Lỗi đọc DHT22 không tạo số liệu giả; web hiện “Chưa có dữ liệu mới” sau 60 giây.

## Camera

Mở biểu tượng cài đặt ở ô Camera, chọn:

- **Webcam / camera USB**: trình duyệt xin quyền camera, không dùng microphone. Chạy tại `http://localhost:8080` hoặc HTTPS; truy cập qua địa chỉ HTTP LAN có thể không được trình duyệt cho phép dùng webcam.
- **Camera IP / ESP32-CAM**: nhập URL **luồng MJPEG hoặc ảnh trực tiếp**, ví dụ `http://192.168.1.50:81/stream`. Không dùng đường dẫn RTSP hoặc trang đăng nhập camera. Camera cần cho phép trình duyệt truy cập luồng trực tiếp.

Trang HTTPS thường chặn camera nội bộ HTTP. Dùng giao diện `http://localhost:8080` khi xem camera LAN. Chức năng chỉ hiển thị trực tiếp, không ghi hay tải video lên máy chủ. Camera không đo nhiệt độ; nhiệt độ và độ ẩm do DHT22 cung cấp. Trang sẽ ngắt webcam khi bấm Tắt camera hoặc đóng trang.

## API nội bộ

Tất cả API dữ liệu cần `Authorization: Bearer <token>`. Khóa tạo ngẫu nhiên vào lần chạy đầu, lưu trong `data/credentials.json`. HTTP dùng trong mạng LAN riêng; không chuyển tiếp cổng 8080 ra Internet.

| API | Khóa | Nội dung |
|---|---|---|
| `GET /api/health` | Không cần | Tình trạng dịch vụ, không chứa dữ liệu học sinh |
| `GET /api/state` | Admin | Học sinh, 500 lượt gần nhất, 120 mẫu cảm biến gần nhất, trạng thái thiết bị |
| `GET /api/export` | Admin | Toàn bộ lịch sử để xuất CSV |
| `POST /api/students` | Admin | `{ "name": "Nguyễn Văn An", "uid": "A1B2C3D4" }`; thêm `id` để sửa |
| `POST /api/students/delete` | Admin | `{ "id": "..." }` |
| `POST /api/equipment/control` | Admin | `{ "id": "lights", "state": true }` bật/tắt đèn hoặc quạt |
| `GET /api/device/commands` | Device | Lấy danh sách lệnh điều khiển đang chờ nạp xuống ESP32 |
| `POST /api/device/scan` | Device | `{ "uid": "A1B2C3D4", "event_id": "esp32-00000001" }` |
| `POST /api/device/telemetry` | Device | `{ "temperature": 28.4, "humidity": 62, "rssi": -55 }` |
| `POST /api/device/status` | Device | `{ "campus_id": "main", "class_id": "1A1", "states": { "lights": true, "fan_1": false } }` |

API trạng thái chỉ chấp nhận lớp **1A1 tại trường chính**, mã thiết bị trong bảng trên và giá trị JSON boolean `true`/`false`. Có thể gửi một phần danh sách; thiết bị không có trong lần gửi không được tự coi là tắt. Phản hồi trạng thái được lưu kèm thời gian để xác định dữ liệu đã cũ.

Sĩ số thật cập nhật **chỉ từ API thiết bị**. Không có nút giả lập gửi quét trong chế độ thật. Thẻ chưa đăng ký và lượt gửi trùng cũng trả HTTP 200 kèm trường `action`, để ESP32 không gửi lại vô hạn. `event_id` không được dùng lại cho lượt mới.

## Kiểm tra

```powershell
python -m unittest discover -s tests -p "test_server.py" -v
```

Kiểm tra giao diện (cần Playwright cho Python và Chrome trên Windows):

```powershell
python -m unittest discover -s tests -p "test_browser.py" -v
```

Các kiểm tra dùng cơ sở dữ liệu tạm, không sửa dữ liệu lớp thật. Việc kết nối RC522, DHT22 và camera thực tế cần xác minh trực tiếp sau khi đấu dây và nạp board.

Phiên bản có cổng COM đã qua **34 kiểm tra tự động**: 19 kiểm tra máy chủ, 6 kiểm tra giao thức USB và 9 kiểm tra trình duyệt. Có kiểm tra ghép nối localhost, chọn/ngắt COM, chống đếm lại khi đổi USB/Wi-Fi, không xác nhận lượt quét khi lưu thất bại và các chức năng lớp học trước đó.

Đã biên dịch và nạp thành công bản USB/Wi-Fi cho `esp32:esp32:esp32doit-devkit-v1` với ESP32 core 3.3.10, MFRC522 1.4.12, DHT sensor library 1.4.7, Adafruit Unified Sensor 1.1.15 và ArduinoJson 7.4.2. Bản chưa bật tùy chọn phản hồi đèn/quạt dùng 1.064.316 / 1.310.720 byte chương trình (81%); RAM tĩnh 49.616 / 327.680 byte (15%). Đã xác minh kết nối COM9, phản hồi giao thức ESP32 và nhận DHT22 thật qua USB trên máy phát triển. Camera và mạch phản hồi đèn/quạt cần được kiểm tra riêng khi có phần cứng tương ứng.

Tài liệu phần cứng tham khảo: [thư viện MFRC522](https://github.com/miguelbalboa/rfid), [hướng dẫn DHT22 của Adafruit](https://learn.adafruit.com/dht/connecting-to-a-dhtxx-sensor), [Arduino ESP32 của Espressif](https://docs.espressif.com/projects/arduino-esp32/en/latest/).
