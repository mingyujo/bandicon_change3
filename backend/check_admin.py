
import os
import django
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from user_app.models import User

def check_admin():
    print("Checking for Operator/Superuser accounts...")
    admins = User.objects.filter(is_superuser=True) | User.objects.filter(role='OPERATOR')
    
    if admins.exists():
        for admin in admins:
            print(f"Found: Username={admin.username}, Nickname={admin.nickname}, Role={admin.role}, Is_Superuser={admin.is_superuser}")
    else:
        print("No Operator or Superuser accounts found.")

if __name__ == "__main__":
    check_admin()
