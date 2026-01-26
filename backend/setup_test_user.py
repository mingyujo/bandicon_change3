
import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from user_app.models import User

def create_test_user():
    username = "test"
    password = "testpassword123"
    nickname = "TestUser"
    email = "test@example.com"
    
    if User.objects.filter(username=username).exists():
        print(f"User '{username}' already exists. Updating password...")
        user = User.objects.get(username=username)
        user.set_password(password)
        user.save()
        print(f"User '{username}' password updated.")
    else:
        User.objects.create_user(
            username=username,
            password=password,
            nickname=nickname,
            email=email,
            role='USER'
        )
        print(f"User '{username}' created successfully.")

if __name__ == "__main__":
    create_test_user()
