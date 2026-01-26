
import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from board_app.models import Board

def run():
    print(f"Total Boards: {Board.objects.count()}")
    for b in Board.objects.all():
        print(f"ID: {b.id}, Name: {b.name}, Type: {b.board_type}")

if __name__ == "__main__":
    run()
