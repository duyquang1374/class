/* ESP32 DevKit V1 + MFRC522 + DHT22
 * RC522: 3V3->3.3V, GND->GND, SDA/SS->21, RST->22,
 *        SCK->18, MISO->19, MOSI->23. IRQ unused.
 * DHT22: VCC->3V3, GND->GND, DATA->27, 10k pullup DATA->3V3.
 * Libraries: MFRC522 (GithubCommunity), DHT sensor library (Adafruit),
 * Adafruit Unified Sensor, ArduinoJson 7.
 * Board: DOIT ESP32 DEVKIT V1 (Arduino ESP32 core).
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <esp_system.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "config.h"
#ifndef CLASSROOM_MONITOR_EQUIPMENT
#define CLASSROOM_MONITOR_EQUIPMENT 0
#endif

// Output pins for simulated remote equipment:
// lights: 1 Den LED (GPIO 2 - onboard LED on ESP32 DevKit V1 hoac LED ngoai tro 220-330 ohm)
#ifndef PIN_LIGHTS
#define PIN_LIGHTS 2
#endif
// fan_1: 1 Quat 5V DC (GPIO 4 - kich qua Relay module 5V hoac Transistor NPN / MOSFET)
#ifndef PIN_FAN
#define PIN_FAN 4
#endif

// LCD 1602 I2C Configuration (chuyen qua chan 16/17 de tranh trung SPI RC522)
#ifndef LCD_SDA
#define LCD_SDA 16
#endif
#ifndef LCD_SCL
#define LCD_SCL 17
#endif
#ifndef LCD_ADDR
#define LCD_ADDR 0x27
#endif

LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);
bool lcdPresent = false;
unsigned long lcdResetAt = 0;
bool enrollMode = false;
String enrollName = "";

constexpr uint8_t RFID_SS = 21, RFID_RST = 22, DHT_PIN = 27;
constexpr uint8_t QUEUE_SIZE = 32;
constexpr uint8_t EQUIPMENT_PINS[] = {32, 33, 25, 26, 14};
const char* EQUIPMENT_KEYS[] = {"lights", "fan_1", "fan_2", "projector", "ac"};
bool stateLights = false;
bool stateFan = false;
unsigned long lastCommandCheck = 0;
MFRC522 rfid(RFID_SS, RFID_RST);
DHT dht(DHT_PIN, DHT22);
Preferences prefs;
struct Scan { String uid; String id; };
Scan queueItems[QUEUE_SIZE];
uint8_t queued = 0;
uint32_t bootID = 0, sequenceID = 0;

// Bo nho trang thai the vao/ra tai cho
struct CardState { String uid; bool inside; };
CardState localCards[QUEUE_SIZE];
uint8_t localCardCount = 0;

bool toggleCardState(const String& uid) {
  for (uint8_t i = 0; i < localCardCount; i++) {
    if (localCards[i].uid == uid) {
      localCards[i].inside = !localCards[i].inside;
      return localCards[i].inside;
    }
  }
  if (localCardCount < QUEUE_SIZE) {
    localCards[localCardCount++] = {uid, true};
    return true; // Lan dau quet la vao lop
  }
  return true;
}

void lcdPrintCenter(uint8_t row, const String& text) {
  if (!lcdPresent) return;
  lcd.setCursor(0, row);
  String line = text;
  if (line.length() > 16) line = line.substring(0, 16);
  int pad = (16 - (int)line.length()) / 2;
  String full = "";
  for (int i = 0; i < pad; i++) full += " ";
  full += line;
  while (full.length() < 16) full += " ";
  lcd.print(full);
}

void lcdShow(const String& line1, const String& line2, unsigned long autoResetMs = 0) {
  Serial.printf("[LCD] D1: %s | D2: %s\n", line1.c_str(), line2.c_str());
  if (lcdPresent) {
    lcdPrintCenter(0, line1);
    lcdPrintCenter(1, line2);
  }
  if (autoResetMs > 0) {
    lcdResetAt = millis() + autoResetMs;
  } else {
    lcdResetAt = 0;
  }
}

void lcdStandby() {
  enrollMode = false;
  enrollName = "";
  lcdShow("DIEM DANH LOP", "Xin moi quet the", 0);
}
unsigned long lastTelemetry = 0, lastRetry = 0, lastWifiRetry = 0;
unsigned long lastCardCheck = 0, absentSince = 0;
// A card held over the reader during a restart must not become a new attendance event.
// Arm only after the reader has first been clear for 500 ms.
bool waitingForRemoval = true;
unsigned long lastUSBHello = 0;
String usbInput;

bool usbActive() {
  return lastUSBHello && millis() - lastUSBHello < 15000;
}

void emitUSB(JsonDocument& doc) {
  Serial.print("CLASSROOM ");
  serializeJson(doc, Serial);
  Serial.println();
}

void sendUSBHello() {
  JsonDocument doc;
  char deviceID[13];
  snprintf(deviceID, sizeof(deviceID), "%012llX", (unsigned long long)ESP.getEfuseMac());
  doc["type"] = "hello";
  doc["protocol"] = 1;
  doc["device_id"] = deviceID;
  doc["board"] = "ESP32 DevKit V1";
  doc["wifi_ip"] = WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : String("");
  if (WiFi.status() == WL_CONNECTED) doc["rssi"] = WiFi.RSSI();
  else doc["rssi"] = "";
  emitUSB(doc);
}

void processUSB() {
  while (Serial.available()) {
    char ch = Serial.read();
    if (ch == '\r') continue;
    if (ch != '\n') {
      if (usbInput.length() < 1024) usbInput += ch;
      else usbInput = "";
      continue;
    }
    String line = usbInput;
    line.trim();
    if (line.startsWith("CLASSROOM ")) {
      JsonDocument doc;
      if (!deserializeJson(doc, line.substring(10))) {
        String command = doc["cmd"] | "";
        if (command == "hello") {
          lastUSBHello = millis();
          sendUSBHello();
        } else if (command == "ack" && usbActive() && queued) {
          String eventID = doc["event_id"] | "";
          if (eventID == queueItems[0].id) {
            for (uint8_t i = 1; i < queued; i++) queueItems[i-1] = queueItems[i];
            queued--;
            saveQueue();
          }
          bool isEnroll = doc["enroll"] | false;
          if (isEnroll) {
            String enrollStatus = doc["status"] | "";
            if (enrollStatus == "success") {
              String name = doc["name"] | "";
              lcdShow("Luu thanh cong!", name.length() ? name : "The hop le", 4000);
            } else {
              lcdShow("Loi: The da co!", "The da ton tai", 4000);
            }
          } else {
            String action = doc["action"] | "";
            String name = doc["name"] | "";
            if (action == "unknown") {
              lcdShow("THE KHONG HOP LE", "Chua co trong DS", 4000);
            } else if (action == "in") {
              lcdShow(name.length() ? name : "Hoc sinh", "Vao lop", 3500);
            } else if (action == "out") {
              lcdShow(name.length() ? name : "Hoc sinh", "Roi lop", 3500);
            } else if (action == "ignored") {
              lcdShow(name.length() ? name : "Hoc sinh", "Da quet roi", 2500);
            }
          }
        } else if (command == "control") {
          String equipId = doc["id"] | "";
          bool equipState = doc["state"] | false;
          applyEquipmentState(equipId, equipState);
          sendEquipmentStatus();
        } else if (command == "enroll") {
          enrollMode = true;
          enrollName = doc["name"] | "";
          lcdShow("DANG KY HOC SINH", "Dat the vao doc...", 0);
        } else if (command == "lcd_standby") {
          lcdStandby();
        } else if (command == "lcd") {
          String l1 = doc["line1"] | "";
          String l2 = doc["line2"] | "";
          unsigned long t = doc["timeout"] | 3500;
          lcdShow(l1, l2, t);
        }
      }
    } else if (line.equalsIgnoreCase("LED ON")) {
      applyEquipmentState("lights", true);
      sendEquipmentStatus();
    } else if (line.equalsIgnoreCase("LED OFF")) {
      applyEquipmentState("lights", false);
      sendEquipmentStatus();
    } else if (line.equalsIgnoreCase("FAN ON")) {
      applyEquipmentState("fan_1", true);
      sendEquipmentStatus();
    } else if (line.equalsIgnoreCase("FAN OFF")) {
      applyEquipmentState("fan_1", false);
      sendEquipmentStatus();
    } else if (line.equalsIgnoreCase("STATUS") || line.equalsIgnoreCase("HELP")) {
      Serial.println("==================================================");
      Serial.printf(" [TRANG THAI] Den LED (GPIO %d): %s\n", PIN_LIGHTS, stateLights ? "DANG BAT (ON)" : "DA TAT (OFF)");
      Serial.printf(" [TRANG THAI] Quat 5V  (GPIO %d): %s\n", PIN_FAN, stateFan ? "DANG BAT (ON)" : "DA TAT (OFF)");
      Serial.printf(" [TRANG THAI] WiFi: %s\n", WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString().c_str() : "Chua ket noi");
      Serial.printf(" [TRANG THAI] Ket noi USB Hub: %s\n", usbActive() ? "DA KET NOI (Active)" : "Chua ket noi (dang cho server.py)");
      Serial.println("--------------------------------------------------");
      Serial.println(" Lenh test truc tiep: LED ON, LED OFF, FAN ON, FAN OFF, STATUS");
      Serial.println("==================================================");
    } else if (line.length() > 0) {
      Serial.printf("[LENH KHONG HOP LE]: '%s'. Go: LED ON, LED OFF, FAN ON, FAN OFF, STATUS\n", line.c_str());
    }
    usbInput = "";
  }
}

void sendFirstScanUSB() {
  if (!queued || !usbActive()) return;
  JsonDocument doc;
  doc["type"] = "scan";
  doc["uid"] = queueItems[0].uid;
  doc["event_id"] = queueItems[0].id;
  emitUSB(doc);
}

uint8_t readRFIDRegister(uint8_t reg, uint32_t clockHz) {
  SPI.beginTransaction(SPISettings(clockHz, MSBFIRST, SPI_MODE0));
  digitalWrite(RFID_SS, LOW);
  SPI.transfer(0x80 | (reg & 0x7E));
  uint8_t value = SPI.transfer(0);
  digitalWrite(RFID_SS, HIGH);
  SPI.endTransaction();
  return value;
}

void writeRFIDRegister(uint8_t reg, uint8_t value, uint32_t clockHz) {
  SPI.beginTransaction(SPISettings(clockHz, MSBFIRST, SPI_MODE0));
  digitalWrite(RFID_SS, LOW);
  SPI.transfer(reg & 0x7E);
  SPI.transfer(value);
  digitalWrite(RFID_SS, HIGH);
  SPI.endTransaction();
}

void diagnoseRFID() {
  // Test only reader registers; this does not read or write card memory.
  const uint32_t clocks[] = {4000000, 1000000, 400000, 100000};
  for (uint8_t i = 0; i < 4; i++) {
    uint32_t hz = clocks[i];
    uint8_t version = readRFIDRegister(MFRC522::VersionReg, hz);
    writeRFIDRegister(MFRC522::TxASKReg, 0x40, hz);
    uint8_t high = readRFIDRegister(MFRC522::TxASKReg, hz);
    writeRFIDRegister(MFRC522::TxASKReg, 0x00, hz);
    uint8_t low = readRFIDRegister(MFRC522::TxASKReg, hz);
    writeRFIDRegister(MFRC522::TxASKReg, 0x40, hz);
    Serial.printf("RC522 SPI %lu Hz: version=0x%02X write40/read=0x%02X write00/read=0x%02X %s\n",
                  (unsigned long)hz, version, high, low,
                  high == 0x40 && low == 0 ? "REGISTER_OK" : "REGISTER_FAIL");
  }
}

void saveQueue() {
  JsonDocument doc;
  JsonArray items = doc["items"].to<JsonArray>();
  for (uint8_t i = 0; i < queued; i++) {
    JsonObject item = items.add<JsonObject>();
    item["uid"] = queueItems[i].uid;
    item["id"] = queueItems[i].id;
  }
  String json; serializeJson(doc, json);
  prefs.putString("queue", json);
}

void loadQueue() {
  String json = prefs.getString("queue", "{\"items\":[]}");
  JsonDocument doc;
  if (deserializeJson(doc, json)) {
    Serial.println("ERROR: Cannot restore scan queue; check device storage.");
    return;
  }
  for (JsonObject item : doc["items"].as<JsonArray>()) {
    if (queued >= QUEUE_SIZE) break;
    queueItems[queued++] = {item["uid"].as<String>(), item["id"].as<String>()};
  }
}

int postJSON(const char* path, const String& payload, String& reply) {
  if (WiFi.status() != WL_CONNECTED) return -1;
  HTTPClient http;
  http.setConnectTimeout(2500);
  http.setTimeout(5000);
  http.begin(String(SERVER_URL) + path);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  int code = http.POST(payload);
  reply = code > 0 ? http.getString() : "Network error";
  http.end();
  return code;
}

int getJSON(const char* path, String& reply) {
  if (WiFi.status() != WL_CONNECTED) return -1;
  HTTPClient http;
  http.setConnectTimeout(2000);
  http.setTimeout(3500);
  http.begin(String(SERVER_URL) + path);
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  int code = http.GET();
  reply = code > 0 ? http.getString() : "Network error";
  http.end();
  return code;
}

void applyEquipmentState(const String& id, bool state) {
  if (id == "lights") {
    stateLights = state;
    digitalWrite(PIN_LIGHTS, stateLights ? HIGH : LOW);
    Serial.printf("[THIET BI] Den LED (GPIO %d) -> %s\n", PIN_LIGHTS, stateLights ? "BAT" : "TAT");
  } else if (id == "fan_1") {
    stateFan = state;
    digitalWrite(PIN_FAN, stateFan ? HIGH : LOW);
    Serial.printf("[THIET BI] Quat 5V DC (GPIO %d) -> %s\n", PIN_FAN, stateFan ? "BAT" : "TAT");
  }
}

void sendEquipmentStatus() {
  JsonDocument statusDoc;
  statusDoc["type"] = "equipment";
  statusDoc["campus_id"] = "main";
  statusDoc["class_id"] = "1A1";
  JsonObject states = statusDoc["states"].to<JsonObject>();
  states["lights"] = stateLights;
  states["fan_1"] = stateFan;
  if (CLASSROOM_MONITOR_EQUIPMENT) {
    for (uint8_t i = 2; i < 5; i++) states[EQUIPMENT_KEYS[i]] = digitalRead(EQUIPMENT_PINS[i]) == HIGH;
  }
  if (usbActive()) {
    emitUSB(statusDoc);
  } else if (WiFi.status() == WL_CONNECTED) {
    String payload, reply;
    serializeJson(statusDoc, payload);
    postJSON("/api/device/status", payload, reply);
  }
}

void checkCommands() {
  if (WiFi.status() != WL_CONNECTED || usbActive()) return;
  String reply;
  int code = getJSON("/api/device/commands", reply);
  if (code == 200) {
    JsonDocument cmdDoc;
    if (!deserializeJson(cmdDoc, reply)) {
      JsonArray cmds = cmdDoc["commands"].as<JsonArray>();
      if (cmds.size() > 0) {
        for (JsonObject cmd : cmds) {
          String cmdType = cmd["cmd"] | "";
          if (cmdType == "enroll") {
            enrollMode = true;
            enrollName = cmd["name"] | "";
            lcdShow("DANG KY HOC SINH", "Dat the vao doc...", 0);
          } else if (cmdType == "lcd_standby") {
            lcdStandby();
          } else {
            String id = cmd["id"] | "";
            bool state = cmd["state"] | false;
            applyEquipmentState(id, state);
          }
        }
        sendEquipmentStatus();
      }
    }
  }
}

void sendFirstScan() {
  if (!queued || WiFi.status() != WL_CONNECTED) return;
  JsonDocument doc;
  doc["uid"] = queueItems[0].uid;
  doc["event_id"] = queueItems[0].id;
  String payload, reply;
  serializeJson(doc, payload);
  int code = postJSON("/api/device/scan", payload, reply);
  Serial.printf("Scan HTTP %d: %s\n", code, reply.c_str());
  if (code == 200) {
    for (uint8_t i = 1; i < queued; i++) queueItems[i-1] = queueItems[i];
    queued--;
    saveQueue();
    JsonDocument resDoc;
    if (!deserializeJson(resDoc, reply)) {
      bool isEnroll = resDoc["enroll"] | false;
      if (isEnroll) {
        String enrollStatus = resDoc["status"] | "";
        if (enrollStatus == "success") {
          String name = resDoc["name"] | "";
          lcdShow("Luu thanh cong!", name.length() ? name : "The hop le", 4000);
        } else {
          lcdShow("Loi: The da co!", "The da ton tai", 4000);
        }
      } else {
        String action = resDoc["action"] | "";
        String name = resDoc["name_clean"] | (resDoc["name"] | "");
        if (action == "unknown") {
          lcdShow("THE KHONG HOP LE", "Chua co trong DS", 4000);
        } else if (action == "in") {
          lcdShow(name.length() ? name : "Hoc sinh", "Vao lop", 3500);
        } else if (action == "out") {
          lcdShow(name.length() ? name : "Hoc sinh", "Roi lop", 3500);
        } else if (action == "ignored") {
          lcdShow(name.length() ? name : "Hoc sinh", "Da quet roi", 2500);
        }
      }
    }
  } else if (code == 401) {
    Serial.println("Check DEVICE_TOKEN. Queue retained.");
  } else if (code == 400) {
    Serial.println("Invalid scan payload. Queue retained for investigation.");
  }
}

void checkCard() {
  if (millis() - lastCardCheck < 120) return;
  lastCardCheck = millis();
  if (waitingForRemoval) {
    // A halted card must be physically removed before another scan is accepted.
    byte answer[2]; byte size = sizeof(answer);
    MFRC522::StatusCode status = rfid.PICC_WakeupA(answer, &size);
    bool present = status == MFRC522::STATUS_OK || status == MFRC522::STATUS_COLLISION;
    if (present) {
      absentSince = 0;
      // Select the awakened card before halting it again.
      if (rfid.PICC_ReadCardSerial()) rfid.PICC_HaltA();
    }
    else {
      if (!absentSince) absentSince = millis();
      if (millis() - absentSince >= 500) { waitingForRemoval = false; absentSince = 0; }
    }
    return;
  }
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;
  String uid;
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  Serial.printf("RFID UID: %s\n", uid.c_str());
  if (enrollMode) {
    lcdShow("DANG XU LY THE", "Vui long cho...", 0);
  } else if (!usbActive() && WiFi.status() != WL_CONNECTED) {
    bool inside = toggleCardState(uid);
    lcdShow(uid, inside ? "Vao lop" : "Roi lop", 3500);
  } else {
    lcdShow("DANG KIEM TRA...", uid, 0);
  }
  if (queued >= QUEUE_SIZE) {
    Serial.println("QUEUE FULL! Scan NOT saved. Restore network, remove card and scan again.");
  } else {
    char eventID[80];
    snprintf(eventID, sizeof(eventID), "%012llX-%08lX-%08lX",
             (unsigned long long)ESP.getEfuseMac(), (unsigned long)bootID, (unsigned long)++sequenceID);
    queueItems[queued++] = {uid, String(eventID)};
    saveQueue();
    Serial.printf("Saved scan. Queue: %u/32\n", queued);
    if (usbActive() && queued == 1 && millis() - lastRetry >= 3500) {
      sendFirstScanUSB();
      lastRetry = millis();
    }
  }
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  waitingForRemoval = true;
  absentSince = 0;
}

void setup() {
  Serial.begin(115200);
  delay(150);

  pinMode(PIN_LIGHTS, OUTPUT);
  pinMode(PIN_FAN, OUTPUT);
  digitalWrite(PIN_LIGHTS, LOW);
  digitalWrite(PIN_FAN, LOW);

  // Chop nhay LED 3 lan de xac nhan nap code thanh cong
  for (int i = 0; i < 3; i++) {
    digitalWrite(PIN_LIGHTS, HIGH);
    delay(120);
    digitalWrite(PIN_LIGHTS, LOW);
    delay(120);
  }

  Serial.println();
  Serial.println("==================================================");
  Serial.println("   ESP32 CLASSROOM HUB - KHOI DONG THANH CONG     ");
  Serial.println("==================================================");
  Serial.printf(" Baud rate: 115200 bps\n");
  Serial.printf(" [DEN LED]  GPIO %d (Mac dinh: TAT)\n", PIN_LIGHTS);
  Serial.printf(" [QUAT 5V]  GPIO %d (Mac dinh: TAT)\n", PIN_FAN);
  Serial.printf(" [LCD 1602] SDA:%d, SCL:%d (Dia chi I2C 0x27 / 0x3F)\n", LCD_SDA, LCD_SCL);
  Serial.println("--------------------------------------------------");
  Serial.println(" LENH TEST TRUC TIEP TREN SERIAL MONITOR (go + Enter):");
  Serial.println("   LED ON    -> Bat den LED");
  Serial.println("   LED OFF   -> Tat den LED");
  Serial.println("   FAN ON    -> Bat quat 5V");
  Serial.println("   FAN OFF   -> Tat quat 5V");
  Serial.println("   STATUS    -> Kiem tra trang thai thiet bi");
  Serial.println("==================================================");

  // Khoi tao LCD 1602 I2C
  Wire.begin(LCD_SDA, LCD_SCL);
  Wire.beginTransmission(LCD_ADDR);
  if (Wire.endTransmission() == 0) {
    lcdPresent = true;
    lcd.init();
    lcd.backlight();
    lcdStandby();
    Serial.printf("[LCD] Da tim thay LCD 1602 tai dia chi 0x%02X (SDA:%d, SCL:%d)\n", LCD_ADDR, LCD_SDA, LCD_SCL);
  } else {
    Wire.beginTransmission(0x3F);
    if (Wire.endTransmission() == 0) {
      lcd = LiquidCrystal_I2C(0x3F, 16, 2);
      lcdPresent = true;
      lcd.init();
      lcd.backlight();
      lcdStandby();
      Serial.printf("[LCD] Da tim thay LCD 1602 tai dia chi 0x3F (SDA:%d, SCL:%d)\n", LCD_SDA, LCD_SCL);
    } else {
      Serial.printf("[LCD] Khong phat hien LCD I2C tai 0x27/0x3F (SDA:%d, SCL:%d). Tiep tuc ma khong co LCD.\n", LCD_SDA, LCD_SCL);
    }
  }

  bootID = esp_random();
  prefs.begin("classroom", false);
  loadQueue();
  // Reset the reader itself too; resetting the ESP32 does not remove RC522 power.
  pinMode(RFID_RST, OUTPUT);
  digitalWrite(RFID_RST, LOW);
  delay(20);
  digitalWrite(RFID_RST, HIGH);
  delay(50);
  SPI.begin(18, 19, 23, RFID_SS);
  rfid.PCD_Init();
  delay(50); // Some RC522 modules need extra startup time after initialization.
  rfid.PCD_DumpVersionToSerial();
  Serial.print("RC522 version samples:");
  for (uint8_t i = 0; i < 5; i++) {
    Serial.printf(" 0x%02X", rfid.PCD_ReadRegister(MFRC522::VersionReg));
    delay(10);
  }
  Serial.println();
  diagnoseRFID();
  dht.begin();
  if (CLASSROOM_MONITOR_EQUIPMENT) {
    for (uint8_t i = 0; i < 5; i++) pinMode(EQUIPMENT_PINS[i], INPUT_PULLDOWN);
  }
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false); // Reduce response latency on the classroom LAN.
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.println("Classroom started. Waiting for Wi-Fi or USB connection...");
}

void loop() {
  processUSB();
  checkCard();
  if (lcdResetAt > 0 && millis() >= lcdResetAt) {
    lcdResetAt = 0;
    lcdStandby();
  }
  bool usb = usbActive();
  if (!usb && WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWifiRetry > 10000) {
      lastWifiRetry = millis();
      WiFi.reconnect();
      Serial.printf("[ESP32] Cho ket noi (WiFi/USB)... Scans: %u | Go 'STATUS' hoac 'LED ON' de test\n", queued);
    }
    delay(2);
    return;
  }
  if (millis() - lastRetry > 3500) {
    // Drain slowly: debounce on the server uses receipt time for offline scans.
    lastRetry = millis();
    if (usb) sendFirstScanUSB();
    else sendFirstScan();
  }
  if (!usb && WiFi.status() == WL_CONNECTED && millis() - lastCommandCheck > 1500) {
    lastCommandCheck = millis();
    checkCommands();
  }
  if (millis() - lastTelemetry > 10000) {
    lastTelemetry = millis();
    float temperature = dht.readTemperature(), humidity = dht.readHumidity();
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("DHT22 read failed. Check wiring and pull-up resistor.");
    } else {
      JsonDocument doc;
      doc["type"] = "telemetry";
      doc["temperature"] = temperature;
      doc["humidity"] = humidity;
      if (WiFi.status() == WL_CONNECTED) doc["rssi"] = WiFi.RSSI();
      else doc["rssi"] = "";
      String payload, reply;
      serializeJson(doc, payload);
      if (usb) emitUSB(doc);
      else {
        int code = postJSON("/api/device/telemetry", payload, reply);
        Serial.printf("DHT22 %.1f C / %.1f %% - HTTP %d\n", temperature, humidity, code);
      }
    }
    sendEquipmentStatus();
  }
  delay(2);
}
