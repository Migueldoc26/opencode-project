import requests, json, urllib3
urllib3.disable_warnings()

base = "https://cmms.controlmc.click"
s = requests.Session()
s.verify = False

r = s.post(base + "/api/auth/login", json={"email":"admin@cmms.cl","password":"Admin123"})
token = r.json().get("token", "")
print("Login:", r.status_code, "- token OK:", bool(token))

r = s.get(base + "/api/assets", headers={"Authorization": "Bearer " + token})
assets = r.json()
data = assets.get("data", [])
print("Asset count:", len(data))

if data:
    asset_id = data[0]["id"]
    print("Using asset ID:", asset_id)

    payload = {"name": "Sensor ESP32 Test","code":"ESP32-TEST-003","type":"TEMPERATURE","unit":"C","assetId":asset_id}
    r = s.post(base + "/api/sensors", json=payload, headers={"Authorization": "Bearer " + token})
    print("\nCREATE sensor:", r.status_code)
    print(json.dumps(r.json(), indent=2)[:600])

    r = s.get(base + "/api/sensors", headers={"Authorization": "Bearer " + token})
    print("\nLIST sensors:", r.status_code)
    print(r.text[:400])
else:
    print("No assets - listing sensors directly:")
    r = s.get(base + "/api/sensors", headers={"Authorization": "Bearer " + token})
    print(r.status_code, r.text[:400])
