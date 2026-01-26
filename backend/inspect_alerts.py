import os
import django
import sys

# 프로젝트 루트 디렉토리 설정 (manage.py가 있는 위치)
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from user_app.models import Alert
from room_app.models import Room
from user_app.models import User

def check_eval_alerts():
    print("--- Checking Evaluation Alerts ---")
    alerts = Alert.objects.filter(alert_type='EVALUATION_REQUEST', is_read=False)
    
    if not alerts.exists():
        print("No pending evaluation alerts found.")
        return

    print(f"Found {alerts.count()} pending alerts.")
    
    for alert in alerts:
        print(f"\n[Alert ID: {alert.id}] User: {alert.user.nickname}")
        print(f"  Message: {alert.message}")
        print(f"  Related ID (Room ID): {alert.related_id}")
        
        try:
            room = Room.objects.get(id=alert.related_id)
            print(f"  [Room ID: {room.id}]")
            print(f"    Title: '{room.title}' (Len: {len(room.title)})")
            print(f"    Manager: '{room.manager_nickname}'")
            print(f"    Sessions:")
            for session in room.sessions.all():
                print(f"      - {session.session_name}: '{session.participant_nickname}'")
        except Room.DoesNotExist:
            print(f"    !! ROOM NOT FOUND with ID {alert.related_id} !!")

if __name__ == "__main__":
    check_eval_alerts()
