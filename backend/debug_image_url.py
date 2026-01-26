import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from room_app.models import Room
from rest_framework import serializers

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'title', 'image']

rooms = Room.objects.all().order_by('-created_at')[:5]
print(f"Found {len(rooms)} rooms.")

for r in rooms:
    print(f"Room [{r.id}] {r.title}")
    if r.image:
        print(f"  - Image Field: {r.image}")
        try:
            print(f"  - Image URLAttribute: {r.image.url}")
            # Mock serialization context
            # In a view, request is passed implicitly
            # Let's see what serializer produces without request
            s = RoomSerializer(r)
            print(f"  - Serialized (no context): {s.data['image']}")
        except Exception as e:
            print(f"  - Error accessing url: {e}")
    else:
        print("  - No Image")
