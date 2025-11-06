# user_app/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings # AUTH_USER_MODEL을 가져오기 위해

# 1. Django의 기본 User 모델을 확장(Override)합니다.
# -----------------------------------------------------------------
class User(AbstractUser):
    """
    FastAPI의 User 모델을 Django의 AbstractUser 모델로 변환합니다.
    username, password, email 필드는 AbstractUser에 이미 포함되어 있습니다.
    """
    
    # 닉네임 (기존: String, unique=True, index=True, nullable=False)
    # AbstractUser의 first_name, last_name은 사용하지 않고 nickname을 메인으로 사용
    nickname = models.CharField(
        max_length=150, 
        unique=True, 
        db_index=True,
        help_text="서비스에서 사용할 고유한 별명"
    )
    
    # 전화번호 (기존: String)
    phone = models.CharField(max_length=20, blank=True, null=True)
    
    # 인증 여부 (기존: Boolean)
    phone_verified = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    
    # 스킬 (기존: JSON)
    skills = models.JSONField(blank=True, null=True)
    
    # 매너 스코어 (기존: String, default="루키")
    manner_score = models.CharField(max_length=20, default="루키")
    
    # 뱃지 (기존: Integer, default=0)
    badges = models.IntegerField(default=0)
    
    # 프로필 이미지 (기존: String, nullable=True)
    profile_img = models.CharField(max_length=512, blank=True, null=True)
    
    # 역할 및 상태 (기존: String)
    role = models.CharField(max_length=20, default="멤버")
    status = models.CharField(max_length=20, default="pending")
    
    # 마케팅 동의 (기존: Boolean)
    marketing_consent = models.BooleanField(default=False)

    # 친구 관계 (기존: friendship_table)
    # Django의 ManyToManyField("self")는 대칭적인(symmetrical)
    # 다대다 관계를 자동으로 처리해 줍니다.
    friends = models.ManyToManyField(
        "self", 
        symmetrical=True, 
        blank=True
    )
    
    # [참고]
    # posts, comments, clan, liked_posts 등 User와 연결된
    # 다른 모델들은 해당 앱(board_app, clan_app 등)에서
    # User 모델을 'ForeignKey'로 참조하게 되며,
    # Django가 자동으로 User 모델에 역참조 관계를 만들어줍니다.

    def __str__(self):
        return self.username


# 2. DeviceToken 모델 변환
# -----------------------------------------------------------------
class DeviceToken(models.Model):
    """
    FastAPI의 DeviceToken 모델을 변환합니다.
    """
    # user_id (기존: ForeignKey("users.id"))
    # settings.AUTH_USER_MODEL은 Django 설정에 등록된 
    # 활성 User 모델(즉, 위의 User 클래스)을 가리킵니다.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="device_tokens"
    )
    
    # token (기존: String, unique=True, nullable=False)
    token = models.CharField(max_length=512, unique=True)

    def __str__(self):
        return f"{self.user.username} - {self.token[:20]}..."


# 3. FriendRequest 모델 변환
# -----------------------------------------------------------------
class FriendRequest(models.Model):
    """
    FastAPI의 FriendRequest 모델을 변환합니다.
    """
    # sender_id (기존: ForeignKey("users.id"))
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="sent_friend_requests"
    )
    
    # receiver_id (기존: ForeignKey("users.id"))
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="received_friend_requests"
    )
    
    # status (기존: String, default="pending")
    status = models.CharField(max_length=20, default="pending")

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username} ({self.status})"

# ... (기존 User, DeviceToken, FriendRequest 모델 코드 바로 아래) ...

# 4. VerificationCode 모델 변환
# -----------------------------------------------------------------
class VerificationCode(models.Model):
    """
    FastAPI의 VerificationCode 모델을 변환합니다. 
    """
    phone = models.CharField(max_length=20, unique=True, db_index=True)
    code = models.CharField(max_length=10)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"{self.phone} - {self.code}"


# 5. DirectChat 모델 변환
# -----------------------------------------------------------------
class DirectChat(models.Model):
    """
    FastAPI의 DirectChat 모델을 변환합니다. 
    """
    sender = models.CharField(max_length=150)
    receiver = models.CharField(max_length=150)
    message = models.TextField(blank=True, null=True)
    timestamp = models.CharField(max_length=100) # (기존 CharField 유지)
    image_url = models.CharField(max_length=512, blank=True, null=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.sender} -> {self.receiver}"    

# ... (기존 User, DeviceToken, FriendRequest, VerificationCode, DirectChat 모델) ...

# 6. Alert 모델 변환
# -----------------------------------------------------------------
class Alert(models.Model):
    """
    FastAPI의 Alert 모델을 변환합니다. 
    """
    # (id는 Django가 자동으로 Pk를 생성합니다)
    user_nickname = models.CharField(max_length=150, db_index=True)
    message = models.TextField()
    related_url = models.CharField(max_length=512, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.user_nickname}] {self.message[:50]}"