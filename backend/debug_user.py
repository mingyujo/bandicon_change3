
import os
import django
import sys
from django.contrib.auth import authenticate

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from user_app.models import User

def debug_test_user():
    username = "test"
    password = "testpassword123"
    
    print(f"checking user: {username}")
    
    try:
        user = User.objects.get(username=username)
        print(f"User found: {user}")
        print(f"  is_active: {user.is_active}")
        print(f"  role: {user.role}")
        print(f"  password hash: {user.password[:20]}...")
        
        is_correct = user.check_password(password)
        print(f"  check_password('{password}'): {is_correct}")
        
        # Test authenticate
        auth_user = authenticate(username=username, password=password)
        print(f"  authenticate() result: {auth_user}")
        
    except User.DoesNotExist:
        print("User does not exist!")

if __name__ == "__main__":
    debug_test_user()
