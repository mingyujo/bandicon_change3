# board_app/models.py

from django.db import models
from django.conf import settings
from clan_app.models import ClanBoard # ClanBoard 모델

# 1. Post 모델 변환
# -----------------------------------------------------------------
class Post(models.Model):
    """
    FastAPI의 Post 모델을 변환합니다. 
    """
    title = models.CharField(max_length=255, db_index=True)
    content = models.TextField(blank=True, null=True)
    image_url = models.CharField(max_length=512, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    board_type = models.CharField(max_length=50) # 'general', 'notice', 'clan' 등
    is_anonymous = models.BooleanField(default=False)
    
    # owner (기존: owner_id)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE, # 작성자 탈퇴 시 게시글 삭제
        related_name="posts"
    )
    
    # clan_board (기존: clan_board_id)
    clan_board = models.ForeignKey(
        ClanBoard,
        on_delete=models.CASCADE, # 클랜 게시판 삭제 시 게시글 삭제
        related_name="posts",
        null=True,
        blank=True
    )
    
    # liked_by_users (기존: post_likes 테이블)
    liked_by_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="liked_posts",
        blank=True
    )
    
    # scrapped_by_users (기존: post_scraps 테이블)
    scrapped_by_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="scrapped_posts",
        blank=True
    )
    
    def __str__(self):
        return self.title

# 2. Comment 모델 변환
# -----------------------------------------------------------------
class Comment(models.Model):
    """
    FastAPI의 Comment 모델을 변환합니다. 
    """
    content = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # owner (기존: owner_id)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE, # 작성자 탈퇴 시 댓글 삭제
        related_name="comments"
    )
    
    # post (기존: post_id)
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE, # 원본 글 삭제 시 댓글 삭제
        related_name="comments"
    )
    
    # parent (기존: parent_id, 대댓글)
    parent = models.ForeignKey(
        'self', # 자기 자신을 참조
        on_delete=models.CASCADE, # 부모 댓글 삭제 시 대댓글 삭제
        related_name="replies",
        null=True,
        blank=True
    )

    def __str__(self):
        return f"Comment by {self.owner.username} on {self.post.title}"