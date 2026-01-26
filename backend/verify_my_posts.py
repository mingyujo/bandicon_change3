import os
import django
import sys
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.request import Request

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from board_app.views import MyPostListView
from user_app.models import User

def check_my_posts():
    try:
        # Get a test user (create if not exists)
        user, created = User.objects.get_or_create(username='test_check', defaults={'nickname': 'TestCheck', 'email': 'check@test.com'})
        
        factory = APIRequestFactory()
        view = MyPostListView.as_view()
        
        request = factory.get('/api/v1/boards/my-posts/')
        force_authenticate(request, user=user)
        
        response = view(request)
        print(f"Status Code: {response.status_code}")
        print(f"Data Type: {type(response.data)}")
        if isinstance(response.data, list):
            print(f"Data Length: {len(response.data)}")
        else:
            print(f"Data Keys: {response.data.keys()}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_my_posts()
