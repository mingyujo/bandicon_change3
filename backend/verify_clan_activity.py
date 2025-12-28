
import os
import django
import sys
import json

# Setup Django environment
sys.path.append('C:\\Users\\LG\\Downloads\\bandicon_change3-main\\bandicon_change3-main\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from clan_app.models import Clan
from room_app.models import Room, Session, SessionReservation
from rest_framework.test import APIRequestFactory, force_authenticate
from clan_app.views import ClanMemberActivityAPIView

User = get_user_model()

def run_verification():
    print("Starting verification...")
    
    # 1. Setup Test Data
    # Create or get users
    import uuid
    suffix = str(uuid.uuid4())[:8]
    # Create fresh users to avoid collision
    user1 = User.objects.create_user(username=f'testuser1_{suffix}', nickname=f'TestUser1_{suffix}', email=f'test1_{suffix}@example.com', password='password')
    user2 = User.objects.create_user(username=f'testuser2_{suffix}', nickname=f'TestUser2_{suffix}', email=f'test2_{suffix}@example.com', password='password')
    
    # Create Clan
    clan = Clan.objects.create(name=f'TestClan_{suffix}', owner=user1, description="Test")
    clan.members.add(user1)
    clan.members.add(user2)
    
    # Create Room
    room = Room.objects.create(
        title='TestRoom', 
        song='TestSong', 
        artist='TestArtist', 
        manager_nickname=user1.nickname,
        clan=clan
    )
    
    # Create Sessions
    session1 = Session.objects.create(room=room, session_name='Guitar', participant_nickname=user1.nickname) # User1 participating
    session2 = Session.objects.create(room=room, session_name='Drums') # Empty
    
    # Create Reservation for User2
    SessionReservation.objects.create(session=session2, user=user2)
    
    print("Test data created.")

    # 2. Call API View
    factory = APIRequestFactory()
    request = factory.get(f'/api/v1/clans/{clan.id}/activity/')
    request.user = user1 # Authenticated as member
    
    view = ClanMemberActivityAPIView.as_view()
    force_authenticate(request, user=user1)
    response = view(request, pk=clan.id)
    
    print(f"API Response Status Code: {response.status_code}")
    
    # 3. Verify Response Data
    data = response.data
    print(f"Data type: {type(data)}")
    # print(f"Data content: {data}") 
    
    found_reservation = False
    found_participation = False
    
    if isinstance(data, dict) and 'results' in data:
        data = data['results']
        print("Data was paginated, extracted results.")

    if not isinstance(data, list):
        print("Data is not a list!")
        return

    for member_data in data:
        print(f"Member Data Type: {type(member_data)}")
        try:
            nickname = member_data['member']['nickname']
            activities = member_data['participating_rooms']
            
            print(f"Checking member: {nickname}")
            print(f"Activities type: {type(activities)}")
            
            for activity in activities:
                print(f"  - Activity: {activity}, Type: {type(activity)}")
                if isinstance(activity, str):
                    print("Activity is a string? Something is wrong.")
                    continue
                    
                print(f"  - Activity Session: {activity.get('session_name')}, Status: {activity.get('status')}")
                
                if nickname.startswith('TestUser1') and activity.get('status') == '참여':
                    found_participation = True
                if nickname.startswith('TestUser2') and activity.get('status') == '예약':
                    found_reservation = True
        except Exception as e:
            print(f"Error inside loop: {e}")
            import traceback
            traceback.print_exc()


    # 4. Cleanup
    room.delete()
    clan.delete()
    # Users remain (optional cleanup)
    
    print("-" * 30)
    if found_participation and found_reservation:
        print("VERIFICATION SUCCESS: Found both '참여' and '예약' statuses.")
    else:
        print("VERIFICATION FAILED: Missing statuses.")
        if not found_participation: print(" - Missing Participation")
        if not found_reservation: print(" - Missing Reservation")

if __name__ == '__main__':
    try:
        run_verification()
    except Exception as e:
        print(f"An error occurred: {e}")
