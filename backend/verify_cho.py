
import os
import django
import sys

# 프로젝트 루트 경로 설정
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from user_app.models import User
from board_app.models import Post

def check_cho_scraps():
    # 1. 'cho' 유저 찾기
    try:
        user = User.objects.get(nickname='cho')
        print(f"✅ User found: {user.nickname} (ID: {user.id})")
    except User.DoesNotExist:
        print("❌ User 'cho' not found in DB.")
        return

    # 2. 스크랩 목록 확인
    scraps = user.scrapped_posts.all()
    print(f"🧐 'cho' Scrapped Posts Count: {scraps.count()}")
    
    if scraps.exists():
        for p in scraps:
            print(f"   - Post ID: {p.id}, Title: {p.title}")
    else:
        print("   -> No scraps found in DB for 'cho'.")
        
        # 3. 테스트용으로 강제 스크랩 추가 (디버깅용)
        post = Post.objects.first()
        if post:
            print(f"🔄 Attempting to scrap Post {post.id} ('{post.title}') for 'cho'...")
            post.scraps.add(user)
            print(f"✅ Added scrap. New count: {user.scrapped_posts.count()}")
        else:
            print("❌ No posts available to scrap.")

if __name__ == "__main__":
    check_cho_scraps()
