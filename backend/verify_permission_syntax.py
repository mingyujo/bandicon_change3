
import os
import django
import sys

# Set up Django environment
sys.path.append(r"c:\Users\LG\Downloads\bandicon_change3-main\bandicon_change3-main\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

try:
    django.setup()
    print("Django setup successful.")
except Exception as e:
    print(f"Django setup failed: {e}")
    # Don't exit, try importing views anyway to check for syntax errors in them potentially

try:
    from user_app.models import User
    from clan_app.models import Clan
    from clan_app import views
    from user_app import serializers
    print("Imports successful.")
except ImportError as e:
    print(f"Import failed: {e}")
except Exception as e:
    print(f"An error occurred during import: {e}")
