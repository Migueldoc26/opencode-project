#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ===== CONFIGURACIÓN =====
const char* WIFI_SSID = "TU_WIFI_SSID";
const char* WIFI_PASS = "TU_WIFI_PASSWORD";

const char* MQTT_BROKER = "mqtt.controlmc.click";
const int MQTT_PORT = 1883;
const char* MQTT_USER = "controlmc_mqtt";
const char* MQTT_PASS = "ControlMCmqtt2026";

const char* DEVICE_ID = "esp32_001"; // cámbialo si tienes más de un ESP32
char mqtt_topic[64];

// ===== PINES =====
#define DHTPIN 4        // Pin datos del DHT22
#define DHTTYPE DHT22   // DHT22 (DHT11 si usas ese)
#define MQ135_PIN 34    // Pin analógico del MQ-135
#define TRIG_PIN 5      // HC-SR04 Trigger
#define ECHO_PIN 18     // HC-SR04 Echo

DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 10000; // cada 10 segundos

void setup() {
  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  dht.begin();

  sprintf(mqtt_topic, "controlmc/esp32/%s/sensores", DEVICE_ID);

  connectWiFi();
  client.setServer(MQTT_BROKER, MQTT_PORT);
}

void loop() {
  if (!client.connected()) reconnectMQTT();
  client.loop();

  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();
    enviarDatos();
  }
}

void connectWiFi() {
  Serial.print("Conectando WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" OK");
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("MQTT conectando...");
    if (client.connect(DEVICE_ID, MQTT_USER, MQTT_PASS)) {
      Serial.println(" OK");
    } else {
      Serial.print(" fallo (");
      Serial.print(client.state());
      Serial.println(") reintento en 5s");
      delay(5000);
    }
  }
}

float leerDistancia() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1;
  return duration * 0.034 / 2;
}

void enviarDatos() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  float gas = analogRead(MQ135_PIN);
  float dist = leerDistancia();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("Error leyendo DHT22");
    return;
  }

  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["temperature_c"] = temp;
  doc["humidity_percent"] = hum;
  doc["gas_raw"] = gas;
  if (dist > 0) doc["distance_cm"] = dist;
  doc["ts"] = "2025-01-01T00:00:00.000Z"; // opcional, backend usa new Date() si no está

  char buffer[256];
  serializeJson(doc, buffer);

  if (client.publish(mqtt_topic, buffer)) {
    Serial.print("OK -> "); Serial.println(buffer);
  } else {
    Serial.println("Error publicando MQTT");
  }
}
