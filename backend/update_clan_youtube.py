import os
import django
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from clan_app.models import Clan

def update_youtube():
    clan_name = "에버랜드"
    youtube_url = "https://www.youtube.com/watch?v=K5KOX_rYsH8&list=RDK5KOX_rYsH8&start_radio=1"
    
    try:
        clan = Clan.objects.get(name=clan_name)
        clan.youtube_url = youtube_url
        clan.save()
        print(f"Success! Updated '{clan_name}' with YouTube URL: {youtube_url}")
        
        # Verify regex
        import re
        regExp = r"^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*"
        match = re.match(regExp, youtube_url)
        if match:
             # In python re.match, group indexing might differ if groups are nested.
             # Groups:
             # 1: (youtu.be/|v/|...) (Outer)
             # 2: youtu.be/
             # ...
             # 7: ID
             # Let's check groups length
             print(f"Groups: {match.groups()}")
             id_cand = match.group(7)
             print(f"Extracted ID: {id_cand}")
        else:
             print("Warning: regex did not match this URL in Python test.")

    except Clan.DoesNotExist:
        print(f"Error: Clan '{clan_name}' not found.")

if __name__ == "__main__":
    update_youtube()
