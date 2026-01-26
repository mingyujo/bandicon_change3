
import os
import django
import sys
import json

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def run():
    client = Client()
    
    # Get a user (admin or any)
    user = User.objects.first()
    if not user:
        print("No users found")
        return

    print(f"Testing with user: {user.nickname}")
    
    # Generate JWT Token
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    auth_headers = {'HTTP_AUTHORIZATION': f'Bearer {access_token}'}

    # Test /api/v1/users/me/
    response = client.get('/api/v1/users/me/', **auth_headers)
    if response.status_code != 200:
        print(f"Failed to fetch /me/: {response.status_code}")
        print(response.content)
    else:
        data = response.json()
        print("/me/ Response keys:", data.keys())
        print(f"Score: {data.get('score')}")
        print(f"Mood Maker Count: {data.get('mood_maker_count')}")

    # Test /api/v1/users/profile/<nickname>/
    response = client.get(f'/api/v1/users/profile/{user.nickname}/', **auth_headers)
    if response.status_code != 200:
        print(f"Failed to fetch /profile/: {response.status_code}")
        print(response.content)
    else:
        data = response.json()
        print("/profile/ Response keys:", data.keys())
        print(f"Score: {data.get('score')}")
        print(f"Mood Maker Count: {data.get('mood_maker_count')}")

if __name__ == "__main__":
    run()
