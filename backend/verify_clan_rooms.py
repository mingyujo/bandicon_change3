
import os
import django
import sys

# 프로젝트 루트 경로 설정
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from clan_app.models import Clan
from room_app.models import Room

def check_clan_rooms():
    # 1. 모든 클랜 확인
    clans = Clan.objects.all()
    print(f"Total Clans: {clans.count()}")

    for clan in clans:
        rooms = Room.objects.filter(clan=clan)
        active = rooms.filter(ended=False)
        ended = rooms.filter(ended=True)
        print(f"[{clan.id}] {clan.name}: Total {rooms.count()} (Active: {active.count()}, Ended: {ended.count()})")
        
        if active.exists():
            for r in active:
                print(f"  -> Active Room {r.id}: '{r.title}' (Manager: {r.manager_nickname})")

    print("\n--- Orphaned Rooms (No Clan) ---")
    orphaned = Room.objects.filter(clan__isnull=True)
    print(f"Orphaned Rooms Count: {orphaned.count()}")
    for r in orphaned:
        print(f" - Room {r.id}: {r.title} (Ended: {r.ended})")

if __name__ == "__main__":
    check_clan_rooms()
