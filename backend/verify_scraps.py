
import os
import django
import sys

# 프로젝트 루트 경로 설정
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from user_app.models import User
from board_app.models import Post, Board

def verify_scrap_system():
    # 1. 유저 가져오기
    try:
        user = User.objects.get(nickname='test')
        print(f"✅ User found: {user.nickname}")
    except User.DoesNotExist:
        print("❌ User 'test' not found.")
        return

    # 2. 게시글 가져오기 (없으면 생성)
    post = Post.objects.first()
    if not post:
        print("ℹ️ No posts found. Creating one...")
        board, _ = Board.objects.get_or_create(board_type='general', defaults={'name': 'General'})
        post = Post.objects.create(author=user, title="Test Scrap Post", content="Content", board=board)
    print(f"✅ Post found: {post.id} - {post.title}")

    # 3. 스크랩 상태 확인 및 토글
    if user in post.scraps.all():
        print(f"ℹ️ User already scrapped this post. Removing...")
        post.scraps.remove(user)
    
    print(f"🔄 Scrapping post now...")
    post.scraps.add(user)
    
    # 4. DB 확인
    if post in user.scrapped_posts.all():
        print(f"✅ DB Check: Post is in user.scrapped_posts")
    else:
        print(f"❌ DB Check: Post is NOT in user.scrapped_posts (Model relationship error?)")

    # 5. View Logic Simulation
    queryset = user.scrapped_posts.all().order_by('-created_at')
    print(f"✅ MyScrapListView Queryset count: {queryset.count()}")
    if queryset.exists():
        print(f"   -> First item: {queryset.first().title}")

if __name__ == "__main__":
    verify_scrap_system()
