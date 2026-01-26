import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from user_app.models import User

def create_operator():
    print("=== 운영자(Operator) 계정 생성/승급 ===")
    username = input("아이디(Username)를 입력하세요: ")
    
    try:
        user = User.objects.get(username=username)
        print(f"사용자 '{username}'을(를) 찾았습니다. 현재 권한: {user.role}")
        confirm = input("이 사용자를 운영자(OPERATOR)로 승급하시겠습니까? (y/n): ")
        if confirm.lower() == 'y':
            user.role = 'OPERATOR'
            user.is_staff = True # 관리자 페이지 접속을 위해
            user.is_superuser = True # 모든 권한 부여 (선택사항)
            user.save()
            print(f"성공! '{username}' 님이 운영자로 승급되었습니다.")
    except User.DoesNotExist:
        print(f"사용자 '{username}'이(가) 없습니다. 새로 생성합니다.")
        password = input("비밀번호를 입력하세요: ")
        nickname = input("닉네임(Nickname)을 입력하세요: ")
        email = input("이메일(Email)을 입력하세요: ")
        
        try:
            user = User.objects.create_user(
                username=username,
                password=password,
                nickname=nickname,
                email=email,
                role='OPERATOR',
                is_staff=True,
                is_superuser=True
            )
            print(f"성공! 운영자 계정 '{username}'이(가) 생성되었습니다.")
        except Exception as e:
            print(f"계정 생성 실패: {e}")

if __name__ == "__main__":
    create_operator()
