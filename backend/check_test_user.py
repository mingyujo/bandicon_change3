import os
import django
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

try:
    u = User.objects.get(username='test')
    print(f'User: {u.username}, Role: {u.role}, Superuser: {u.is_superuser}, Staff: {u.is_staff}')
except User.DoesNotExist:
    print("User 'test' does not exist.")
except Exception as e:
    print(f"Error: {e}")
