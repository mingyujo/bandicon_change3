# board_app/models.py

from django.db import models
from django.conf import settings
from clan_app.models import ClanBoard # ClanBoard 모델

# 1. Board 모델 (게시판 카테고리)
# -----------------------------------------------------------------
class Board(models.Model):
    """
    게시판의 종류 (예: 자유게시판, 초보자게시판)
    """
    board_type = models.CharField(max_length=50, unique=True) # 'general', 'beginner'
    name = models.CharField(max_length=100) # '자유게시판', '초보자게시판'
    
    def __str__(self):
        return self.name

# 2. Post 모델 변환
# -----------------------------------------------------------------
class Post(models.Model):
    """
    FastAPI의 Post 모델을 변환합니다. 
    """
    author = models.ForeignKey( # 'owner' -> 'author'
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE, 
        related_name="posts"
    )
    board = models.ForeignKey(
        'board_app.Board', # 순환 참조 방지를 위해 문자열로
        on_delete=models.CASCADE,
        related_name="posts",
        null=True, blank=True # 일반 게시판용
    )
    clan_board = models.ForeignKey(
        'clan_app.ClanBoard', # 순환 참조 방지를 위해 문자열로
        on_delete=models.CASCADE, 
        related_name="posts",
        null=True, blank=True # 클랜 게시판용
    )
    
    title = models.CharField(max_length=255, db_index=True)
    # --- 👇 [수정] (blank=True, null=True)를 다시 추가 ---
    # 이렇게 하면 'makemigrations'가 기본값을 물어보지 않습니다.
    content = models.TextField(blank=True, null=True)
    # --- 👆 [수정] ---
    image_url = models.CharField(max_length=512, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_anonymous = models.BooleanField(default=False)
    
    # 'liked_by_users' -> 'likes'
    likes = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="liked_posts",
        blank=True
    )
    
    # 'scrapped_by_users' -> 'scraps'
    scraps = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="scrapped_posts",
        blank=True
    )
    
    def __str__(self):
        return self.title

# 3. Comment 모델 변환
# -----------------------------------------------------------------
class Comment(models.Model):
    """
    FastAPI의 Comment 모델을 변환합니다. 
    """
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE, # 원본 글 삭제 시 댓글 삭제
        related_name="comments"
    )
    author = models.ForeignKey( # 'owner' -> 'author'
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE, # 작성자 탈퇴 시 댓글 삭제
        related_name="comments"
    )
    # --- 👇 [수정] (blank=True, null=True)를 다시 추가 ---
    content = models.TextField(blank=True, null=True)
    # --- 👆 [수정] ---
    created_at = models.DateTimeField(auto_now_add=True)
    
    parent = models.ForeignKey(
        'self', # 자기 자신을 참조
        on_delete=models.CASCADE, # 부모 댓글 삭제 시 대댓글 삭제
        related_name="replies",
        null=True,
        blank=True
    )

    def __str__(self):
        return f"Comment by {self.author.nickname} on {self.post.title}"