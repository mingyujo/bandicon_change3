import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from clan_app.models import Clan
from room_app.models import Room, Evaluation
from board_app.models import Post, Comment

def clear_data():
    print("Deleting Rooms...")
    Room.objects.all().delete()
    
    print("Deleting Evaluations...")
    Evaluation.objects.all().delete()

    print("Deleting Clans...")
    # This cascades to ClanChat, ClanBoard, etc.
    Clan.objects.all().delete()

    # Optional: Delete posts if you want a clean slate (User asked for "rest of room info or things like that")
    # If posts are strictly "Community", maybe keep? 
    # But often "reset" implies general cleanup.
    # However, 'Clan' and 'Room' are the main request. 
    # I will leave global posts alone unless they are orphaned (which Django handles via Cascade if Board is deleted, but I'm not deleting Board).
    # Since Post has on_delete=CASCADE for clan_board, clan posts are gone.
    
    print("Done! Users are preserved.")

if __name__ == "__main__":
    clear_data()
