
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
from django.conf import settings

# Load .env manually for print debug (settings.py does it too)
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(os.path.join(BASE_DIR, '.env'))

print(f"DEBUG: DATABASE_URL ENV: {os.environ.get('DATABASE_URL')}")

django.setup()

print(f"Django Configured Database Engine: {settings.DATABASES['default']['ENGINE']}")
print(f"Django Configured Database Name: {settings.DATABASES['default']['NAME']}")
print(f"Django Configured Database Host: {settings.DATABASES['default']['HOST']}")
