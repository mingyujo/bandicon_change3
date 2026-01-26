import requests

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_find_id_flow():
    print("Testing Find ID Flow...")
    
    # 1. Send Code
    phone = "01012345678"
    # Ensure user exists first or handle 404. 
    # Since I don't know if a user with this phone exists, I might get a 404.
    # But I can check the response code.
    
    print(f"1. Sending code to {phone}...")
    try:
        resp = requests.post(f"{BASE_URL}/users/find-id/send-code/", json={"phone_number": phone})
        print(f"Response: {resp.status_code} {resp.json()}")
    except Exception as e:
        print(f"Request failed: {e}")
        return

if __name__ == "__main__":
    test_find_id_flow()
