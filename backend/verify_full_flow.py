import os
import django
import sys
import json
from datetime import timedelta
from django.utils import timezone

# 프로젝트 루트 설정
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from user_app.models import User, Alert
from room_app.models import Room, Session
from room_app.serializers import RoomDetailSerializer
from rest_framework.test import APIRequestFactory

def run_verification():
    print("=== [1] Setting up Test Users ===")
    
    # 1. Create Users
    manager_email = "test_manager@example.com"
    member_email = "test_member@example.com"
    
    manager, _ = User.objects.get_or_create(email=manager_email, defaults={'nickname': 'TestManager', 'username': 'testmanager'})
    member, _ = User.objects.get_or_create(email=member_email, defaults={'nickname': 'TestMember', 'username': 'testmember'})
    
    print(f"Manager: {manager.nickname} (ID: {manager.id})")
    print(f"Member: {member.nickname} (ID: {member.id})")

    # 2. Create Room
    print("\n=== [2] Creating Test Room ===")
    room = Room.objects.create(
        title="Test Room for Evaluation",
        manager_nickname=manager.nickname,
        is_private=False
    )
    print(f"Room Created: '{room.title}' (ID: {room.id})")
    
    # 3. Create Sessions (Add Member)
    print("\n=== [3] Adding Participants ===")
    # Session 1: Manager (implicit/explicit depending on logic, but usually manager is just manager)
    # Session 2: Member
    session = Session.objects.create(
        room=room,
        session_name="Guitar",
        participant_nickname=member.nickname
    )
    print(f"Session Created: {session.session_name} - {session.participant_nickname}")

    # 4. Confirm Room
    print("\n=== [4] Confirming Room ===")
    room.confirmed = True
    room.confirmed_at = timezone.now()
    room.save()
    print("Room Confirmed.")

    # 5. End Room (Simulating View Logic)
    print("\n=== [5] Ending Room & Generating Alerts ===")
    # Logic copied from RoomEndView
    room.ended = True
    room.ended_at = timezone.now()
    room.save()

    # Alert Generation Logic
    participant_nicknames = set()
    participant_nicknames.add(room.manager_nickname)
    for s in room.sessions.all():
        if s.participant_nickname:
            participant_nicknames.add(s.participant_nickname)

    users_to_alert = User.objects.filter(nickname__in=participant_nicknames)
    alerts = []
    created_count = 0
    for u in users_to_alert:
        # Check if alert already exists to avoid dupes in this test run
        if not Alert.objects.filter(user=u, related_id=room.id, alert_type='EVALUATION_REQUEST').exists():
            alerts.append(Alert(
                user=u,
                alert_type='EVALUATION_REQUEST',
                message=f"'{room.title}' 합주가 종료되었습니다. 매너 평가를 진행해주세요!",
                related_id=room.id,
                related_url=f"/rooms/{room.id}/evaluate"
            ))
            created_count += 1
    
    Alert.objects.bulk_create(alerts)
    print(f"Room Ended. Generated {created_count} new alerts.")

    # 6. Verify Alerts
    print("\n=== [6] Verifying Member Alert ===")
    member_alert = Alert.objects.filter(user=member, related_id=room.id, alert_type='EVALUATION_REQUEST').first()
    if member_alert:
        print(f"[SUCCESS] Alert found for {member.nickname}: {member_alert.message}")
        print(f"URL: {member_alert.related_url}")
    else:
        print(f"[FAIL] No alert found for {member.nickname}")

    # 7. Submit Evaluation & Verify Score
    print("\n=== [7] Submitting Evaluation & Verifying Score ===")
    from room_app.models import Evaluation
    
    # Manager evaluates Member with score 80
    eval_score = 80
    Evaluation.objects.create(
        room=room,
        evaluator=manager,
        target=member,
        score=eval_score,
        comment="Good job",
        is_mood_maker=True
    )
    
    # Trigger calculation logic (simulate what view does)
    # In the real view, this happens automatically. Here we manually trigger or reuse logic.
    # Since we can't easily call the view method directly without a request, we'll replicate the logic
    # to ensure the *logic* itself is correct, OR we can use APIClient to hit the endpoint.
    # Let's use APIClient to test the actual VIEW logic.
    
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=manager)
    
    # Submit evaluation via API to trigger view logic
    # Note: We created Evaluation manually above, let's delete it and use API 
    Evaluation.objects.all().delete()
    
    payload = {
        "evaluations": [
            {
                "target_nickname": member.nickname,
                "score": 80,
                "comment": "Nice",
                "is_mood_maker": True
            }
        ]
    }
    
    response = client.post(f'/api/v1/rooms/{room.id}/evaluate/', payload, format='json')
    print(f"API Response Status: {response.status_code}")
    if response.status_code != 201:
        print(f"API Error: {response.data}")
    
    # Check Member Score
    member.refresh_from_db()
    print(f"Member Score after evaluation: {member.score}")
    
    if member.score == 80:
         print("[SUCCESS] Member score updated correctly.")
    else:
         print(f"[FAIL] Member score mismatch. Expected 80, got {member.score}")

    # 8. Verify API Response Data (Frontend Simulation)
    print("\n=== [8] Verifying API Data Response ===")
    # Serialize Room
    serializer = RoomDetailSerializer(room)
    data = serializer.data
    
    print("Serialized Data (What Frontend Receives):")
    # print(json.dumps(data, indent=2, ensure_ascii=False))

    has_sessions = 'sessions' in data
    sessions_data = data.get('sessions', [])
    valid_participants = [s['participant_nickname'] for s in sessions_data if s.get('participant_nickname')]
    
    print(f"Has 'sessions' key: {has_sessions}")
    print(f"Session Count: {len(sessions_data)}")
    print(f"Participants found in sessions: {valid_participants}")

    if member.nickname in valid_participants:
        print("[SUCCESS] Member nickname present in session data.")
    else:
        print("[FAIL] Member nickname MISSING from session data.")

    # 8. Clean up (Optional, keep for debugging)
    # room.delete()
    # manager.delete()
    # member.delete()

if __name__ == "__main__":
    run_verification()
