import os
import django
import sys

# Django 환경 설정
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
# Django 환경 설정
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from user_app.models import User
from clan_app.models import Clan, ClanBoard
from clan_app.serializers import ClanBoardSerializer

def run_test():
    print("--- [Board Title Reproduction Test] ---")
    
    # 1. 테스트 유저 확보
    try:
        user = User.objects.first()
        if not user:
            print("Creating auto-test user...")
            user = User.objects.create_user(username='autotest', password='password123', nickname='AutoTester')
        print(f"User: {user.nickname}")
    except Exception as e:
        print(f"ERROR Fetching user: {e}")
        return

    # 2. 테스트 클랜 확보 (생성 또는 조회)
    clan = Clan.objects.first()
    if not clan:
        clan = Clan.objects.create(name="TestClan", owner=user, status='active')
        print("Created TestClan")
    else:
        print(f"Using Clan: {clan.name}")

    # 3. Serializer 테스트 (title='Test Title')
    data = {
        'title': 'Test Title From Script',
        'content': 'Content',
        'category': 'free'
    }
    
    # context에 view 정보가 없으면 serializer field access 에러가 날 수 있으나
    # ClanBoardSerializer는 context 의존성이 getUser 정도이므로 괜찮음
    serializer = ClanBoardSerializer(data=data)
    if serializer.is_valid():
        board = serializer.save(clan=clan, author=user)
        print(f"Created Board ID: {board.id}")
        print(f"Board Title from Object: '{board.title}'")
        
        # 4. DB 재조회
        boards = ClanBoard.objects.filter(id=board.id)
        if boards.exists():
            db_title = boards.first().title
            print(f"Board Title from DB: '{db_title}'")
            if db_title == 'Test Title From Script':
                print("SUCCESS: Title saved correctly.")
            else:
                print(f"FAILURE: Title mismatch (Expected 'Test Title From Script', got '{db_title}')")
        else:
            print("FAILURE: Board not found in DB.")
            
        # 5. Cleanup
        board.delete()
        print("Test Board Deleted.")
        
    else:
        print(f"Serializer Errors: {serializer.errors}")

if __name__ == '__main__':
    run_test()
