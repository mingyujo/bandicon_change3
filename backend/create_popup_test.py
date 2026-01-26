
import os
import django
import sys
import random

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from user_app.models import User, Alert

def create_alert():
    print("=== 현재 존재하는 유저 목록 ===")
    users = User.objects.all()
    for u in users:
        print(f"- 닉네임: {u.nickname} (아이디: {u.username})")

    target_nickname = input("\n알림을 생성할 유저의 **닉네임**을 정확히 입력하세요: ").strip()

    try:
        user = User.objects.get(nickname=target_nickname)
        # 랜덤 ID로 생성하여 중복 방지
        rand_id = random.randint(10000, 99999)
        Alert.objects.create(
            user=user,
            alert_type='EVALUATION_REQUEST',
            message=f"[테스트] 합주가 종료되었습니다. 매너 평가를 진행해주세요! ({rand_id})",
            related_url=f"/rooms/{rand_id}/evaluate", 
            related_id=rand_id
        )
        print(f"\n✅ '{user.nickname}'님에게 새로운 테스트 알림(ID: {rand_id})을 생성했습니다!")
        print("👉 브라우저를 새로고침(F5) 하면 팝업이 떠야 합니다.")
    except User.DoesNotExist:
        print(f"\n❌ '{target_nickname}' 닉네임을 찾을 수 없습니다.")
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")

if __name__ == "__main__":
    create_alert()
