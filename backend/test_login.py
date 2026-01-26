
import requests

url = "http://127.0.0.1:8000/api/v1/users/token/"
data = {
    "username": "test",
    "password": "testpassword123"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Login Successful!")
        print("Token:", response.json().get("access"))
    else:
        print("Login Failed!")
        print("Response:", response.text)
except Exception as e:
    print(f"Error: {e}")
