from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone 

# --- (User 모델) ---
class User(AbstractUser):
    nickname = models.CharField(max_length=100, unique=True, blank=True, null=True)
    email = models.EmailField(unique=True)
    profile_img = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    introduction = models.TextField(blank=True) 
    instruments = models.JSONField(default=list, blank=True) 
    genres = models.JSONField(default=list, blank=True) 
    region = models.CharField(max_length=100, blank=True) 
    score = models.IntegerField(default=100)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # 친구 관계 (자기 참조)
    friends = models.ManyToManyField('self', blank=True) 
    
    # [추가] 휴대폰 번호 (회원가입 에러 해결용)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
# ▼▼▼ [추가] 마케팅 동의 필드 추가 ▼▼▼
    marketing_consent = models.BooleanField(default=False)
    # ▲▲▲ [추가] ▲▲▲

    # [필수] 권한 및 상태 필드
    role = models.CharField(
        max_length=50, 
        choices=[('USER', '사용자'), ('OPERATOR', '운영자')], 
        default='USER'
    )
    status = models.CharField(
        max_length=20, 
        choices=[('pending', '대기'), ('approved', '승인'), ('rejected', '거절')], 
        default='approved'
    )

    # email과 nickname은 필수 입력
    REQUIRED_FIELDS = ['nickname', 'email']

    def __str__(self):
        return self.nickname if self.nickname else self.username


# --- (UserDevice 모델: FCM 토큰 저장용) ---
class UserDevice(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='device')
    fcm_token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.nickname} - {self.fcm_token[:10]}..."


# --- (FriendRequest 모델: 친구 요청 관리) ---
class FriendRequest(models.Model):
    from_user = models.ForeignKey(User, related_name='sent_friend_requests', on_delete=models.CASCADE)
    to_user = models.ForeignKey(User, related_name='received_friend_requests', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected')], default='pending')
    created_at = models.DateTimeField(auto_now_add=True) 

    class Meta:
        unique_together = ('from_user', 'to_user')

    def __str__(self):
        return f"{self.from_user} to {self.to_user} ({self.status})"


# --- (DirectChat 모델: 1:1 채팅) ---
class DirectChat(models.Model):
    sender = models.ForeignKey(User, related_name='sent_direct_chats', on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='received_direct_chats', on_delete=models.CASCADE)
    message = models.TextField(default='')
    timestamp = models.DateTimeField(auto_now_add=True)
    file_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return f"From {self.sender} to {self.receiver}: {self.message[:20]}"


# --- (VerificationCode 모델: 이메일 인증 등) ---
class VerificationCode(models.Model):
    email = models.EmailField(unique=True)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        # 유효시간 3분 (180초)
        return (timezone.now() - self.created_at).total_seconds() > 180 


# --- (Alert 모델: 알림 시스템) ---
class Alert(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alerts', null=True, blank=True)
    
    alert_type = models.CharField(
        max_length=50,
        choices=[
            ('ROOM_INVITE', '합주실 초대'),
            ('FRIEND_REQUEST', '친구 요청'),
            ('CLAN_INVITE', '클랜 초대'),
            ('EVALUATION_REQUEST', '매너 평가 요청'),
            ('SYSTEM', '시스템 알림'),
        ],
        default='SYSTEM' 
    )
    
    message = models.CharField(max_length=255, default='')
    related_id = models.IntegerField(null=True, blank=True) 
    related_url = models.CharField(max_length=255, null=True, blank=True) 
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        user_str = self.user.nickname if self.user else "System"
        return f"[{user_str}] {self.message} (Read: {self.is_read})"