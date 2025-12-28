
import os
import django
import sys

# 프로젝트 루트 경로 설정 (backend 폴더가 있는 곳)
sys.path.append(os.path.join(os.getcwd(), 'backend'))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from user_app.models import User

def set_operator_role(nickname):
    try:
        user = User.objects.get(nickname=nickname)
        user.role = 'OPERATOR'
        user.is_staff = True # Django Admin 접근도 필요하다면
        user.save()
        print(f"✅ User '{nickname}' has been promoted to OPERATOR.")
    except User.DoesNotExist:
        print(f"❌ User '{nickname}' not found.")

if __name__ == "__main__":
    # 'test' 유저를 운영자로 승급
    set_operator_role('test')
