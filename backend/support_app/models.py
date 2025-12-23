# support_app/models.py

from django.db import models
from django.conf import settings
from django.utils import timezone # timezone 임포트


# (기존에 Faq, Inquiry 모델이 있었다면 그대로 둡니다)

# 1. PopupAnnouncement 모델 변환
# -----------------------------------------------------------------
class PopupAnnouncement(models.Model):
    """
    FastAPI의 PopupAnnouncement 모델을 변환합니다. 
    """
    title = models.CharField(max_length=255)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    # created_by (기존: String, ForeignKey("users.nickname"))
    # Django에서는 nickname 대신 User의 ID(PK)를 참조하는 것이 정석입니다.
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_popups",
        null=True,
        blank=True
    )
    
    def __str__(self):
        return self.title

# 2. PopupAnnouncementRead 모델 변환
# -----------------------------------------------------------------
class PopupAnnouncementRead(models.Model):
    """
    FastAPI의 PopupAnnouncementRead 모델을 변환합니다. 
    """
    announcement = models.ForeignKey(
        PopupAnnouncement,
        on_delete=models.CASCADE,
        related_name="read_records"
    )
    
    # user_nickname (기존: String, ForeignKey("users.nickname"))
    # (참조 일관성을 위해 User의 PK(ID)를 참조하도록 변경합니다)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="read_popups"
    )
    
    read_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # 기존 UniqueConstraint 유지
        unique_together = ('announcement', 'user')

# 3. Feedback 모델 변환
# -----------------------------------------------------------------
class Feedback(models.Model):
    """
    FastAPI의 Feedback 모델을 변환합니다. 
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, # 탈퇴해도 문의는 남도록
        related_name="feedbacks",
        null=True,
        blank=True
    )
    type = models.CharField(max_length=50) # 'feedback' or 'inquiry'
    title = models.CharField(max_length=255)
    content = models.TextField()
    status = models.CharField(max_length=20, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.type}] {self.title}"

# 4. FeedbackReply 모델 변환
# -----------------------------------------------------------------
class FeedbackReply(models.Model):
    """
    FastAPI의 FeedbackReply 모델을 변환합니다. 
    """
    feedback = models.ForeignKey(
        Feedback,
        on_delete=models.CASCADE,
        related_name="replies"
    )
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, # 관리자가 삭제되어도 답변은 남도록
        related_name="feedback_replies",
        null=True,
        blank=True
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Reply to {self.feedback.title}"