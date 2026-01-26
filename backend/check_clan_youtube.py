import os
import django
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from clan_app.models import Clan

def check_youtube():
    # Check latest clan
    clan = Clan.objects.last()
    if not clan:
        print("No clans found.")
        return

    print(f"Latest Clan: {clan.name} (ID: {clan.id})")
    print(f"YouTube URL: '{clan.youtube_url}'")
    
    if clan.youtube_url:
        print("URL exists in DB.")
        # Test Regex on python side just to see
        import re
        url = clan.youtube_url
        regExp = r"^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*"
        match = re.match(regExp, url)
        if match:
             # in python group(7) might differ slightly due to group indexing behavior with nested groups?
             # My JS regex had nested groups: ( (a)|(b)|... )
             # JS: Group 1 is outer parens. Group 2..6 are inner. Group 7 is after.
             # Python: same.
             print(f"Regex Match Groups: {match.groups()}")
             # We want the ID.
        else:
             print("Regex did not match.")
    else:
        print("URL is EMPTY or NULL.")

if __name__ == "__main__":
    check_youtube()
