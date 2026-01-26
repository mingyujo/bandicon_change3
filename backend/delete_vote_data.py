
import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from clan_app.models import ClanChat

def delete_vote_data():
    print("Deleting vote data...")
    
    # Delete Vote Creations
    votes = ClanChat.objects.filter(message__startswith='[[VOTE]]')
    count_votes = votes.count()
    votes.delete()
    print(f"Deleted {count_votes} vote creation messages.")

    # Delete Vote Casts
    casts = ClanChat.objects.filter(message__startswith='[[VOTE_CAST]]')
    count_casts = casts.count()
    casts.delete()
    print(f"Deleted {count_casts} vote cast messages.")

    # Delete Vote Comments
    comments = ClanChat.objects.filter(message__startswith='[[VOTE_COMMENT]]')
    count_comments = comments.count()
    comments.delete()
    print(f"Deleted {count_comments} vote comment messages.")
    
    print("All vote data cleared.")

if __name__ == "__main__":
    delete_vote_data()
