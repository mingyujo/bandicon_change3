import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from user_app.models import User

def create_normal_user():
    print("=== 일반 사용자(User) 계정 생성 ===")
    username = input("아이디(Username)를 입력하세요: ")
    
    try:
        user = User.objects.get(username=username)
        print(f"이미 존재하는 사용자입니다: '{username}' (권한: {user.role})")
        return
    except User.DoesNotExist:
        pass
        
    password = input("비밀번호를 입력하세요: ")
    nickname = input("닉네임(Nickname)을 입력하세요: ")
    email = input("이메일(Email)을 입력하세요: ")
    
    try:
        user = User.objects.create_user(
            username=username,
            password=password,
            nickname=nickname,
            email=email,
            role='USER', # 일반 사용자 권한
            is_staff=False,
            is_superuser=False
        )
        print(f"성공! 일반 사용자 계정 '{username}'이(가) 생성되었습니다.")
    except Exception as e:
        print(f"계정 생성 실패: {e}")

if __name__ == "__main__":
    create_normal_user()
