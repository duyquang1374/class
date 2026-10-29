#pragma once
// Copy this file to config.h and enter your LAN configuration.
// Never commit config.h containing your Wi-Fi password or device token.
const char* WIFI_SSID = "TEN_WIFI";
const char* WIFI_PASSWORD = "MAT_KHAU_WIFI";
// Use your COMPUTER's LAN IPv4, not localhost and not the hosted demo URL.
const char* SERVER_URL = "http://192.168.1.10:8080";
// Copy device_token (NOT admin_token) from data/credentials.json.
const char* DEVICE_TOKEN = "DAN_DEVICE_TOKEN_VAO_DAY";

// Remote control output pins for simulated equipment:
// PIN_LIGHTS: LED simulation for 'lights' (GPIO 2 - onboard LED on ESP32 DevKit V1)
#define PIN_LIGHTS 2
// PIN_FAN: 5V DC fan simulation for 'fan_1' (GPIO 4 - drive via 5V Relay module or NPN Transistor/MOSFET)
#define PIN_FAN 4

// LCD 1602 I2C Configuration (4 day: VCC->5V/VIN, GND->GND, SDA->GPIO 16, SCL->GPIO 17)
#define LCD_SDA 16
#define LCD_SCL 17
#define LCD_ADDR 0x27 // Tu dong thu 0x27 va 0x3F

// Optional: set to 1 only after installing 3.3V equipment feedback circuits.
// GPIO32=lights, GPIO33=fan_1, GPIO25=fan_2, GPIO26=projector, GPIO14=ac.
// HIGH = equipment on; LOW = equipment off. No relay output is controlled here.
#define CLASSROOM_MONITOR_EQUIPMENT 0
