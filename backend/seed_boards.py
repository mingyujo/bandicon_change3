
import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from board_app.models import Board

def run():
    boards_to_create = [
        {'board_type': 'general', 'name': '자유게시판'},
        {'board_type': 'beginner', 'name': '초보자게시판'},
    ]

    for data in boards_to_create:
        board, created = Board.objects.get_or_create(
            board_type=data['board_type'],
            defaults={'name': data['name']}
        )
        if created:
            print(f"Created board: {board.name} ({board.board_type})")
        else:
            print(f"Board already exists: {board.name} ({board.board_type})")

if __name__ == "__main__":
    run()
