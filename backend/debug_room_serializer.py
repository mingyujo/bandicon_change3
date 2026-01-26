import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"
# Need a token?
# I'll try to login as 'testuser' or just pick a public room if allowed?
# RoomDetail requires authentication? Yes.
# I need to login first.
# Assuming 'admin' 'admin' or something exists?
# Or I can use 'setup_test_user.py' credentials if I knew them.
# I'll try to inspect one of the test scripts or just use Django shell to inspect serializer output directly.
# Using Django shell is more reliable for checking 'Serializer Logic'.
# Using 'requests' checks the 'Server Routing + Serializer'.
# Let's try Django shell approach first to verify Serializer is working.

import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from room_app.models import Room
from room_app.serializers import RoomDetailSerializer
from django.test.client import RequestFactory

# Get latest room
room = Room.objects.last()
if room:
    print(f"Room ID: {room.id}")
    print(f"Room Title: {room.title}")
    
    # Mock request
    factory = RequestFactory()
    request = factory.get('/')
    request.user = room.clan.owner if room.clan else None # Try to simulate owner or anonymous?
    if not request.user:
        from user_app.models import User
        request.user = User.objects.first()
        
    print(f"User: {request.user}")

    serializer = RoomDetailSerializer(room, context={'request': request})
    data = serializer.data
    print(json.dumps(data, indent=4, ensure_ascii=False))
    
    if 'title' not in data:
        print("CRITICAL: 'title' field is MISSING in serializer output!")
    else:
        print("Serializer output looks correct.")
else:
    print("No rooms found.")
