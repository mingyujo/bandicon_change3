import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from user_app.models import User

def setup_admin():
    username = "test"
    password = "test"
    nickname = "관리자"
    email = "test@example.com" # Dummy email

    try:
        user = User.objects.get(username=username)
        print(f"사용자 '{username}'을(를) 찾았습니다. 정보를 업데이트하고 관리자로 승급합니다.")
        user.role = 'OPERATOR'
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.nickname = nickname
        user.save()
        print(f"성공! '{username}' (닉네임: {nickname}) 님이 관리자(OPERATOR)로 설정되었습니다.")
    except User.DoesNotExist:
        print(f"사용자 '{username}'이(가) 없습니다. 새로 생성합니다.")
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
            print(f"성공! 관리자 계정 '{username}' (닉네임: {nickname}) 이 생성되었습니다.")
        except Exception as e:
            print(f"계정 생성 실패: {e}")

if __name__ == "__main__":
    setup_admin()
