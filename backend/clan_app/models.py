# clan_app/models.py

from django.db import models
from django.conf import settings # User 모델을 가져오기 위해

# 1. Clan 모델 변환
# -----------------------------------------------------------------
class Clan(models.Model):
    """
    FastAPI의 Clan 모델을 변환합니다. 
    """
    name = models.CharField(max_length=255, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    
    # owner (기존: owner_id)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, # 클랜장이 탈퇴해도 클랜은 남도록
        related_name="owned_clan",
        null=True,
        blank=True
    )
    
    # members (기존: clan_members_table)
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="clan",
        blank=True
    )
    
    def __str__(self):
        return self.name

# 2. ClanChat 모델 변환
# -----------------------------------------------------------------
class ClanChat(models.Model):
    """
    FastAPI의 ClanChat 모델을 변환합니다. 
    """
    clan = models.ForeignKey(Clan, on_delete=models.CASCADE, related_name="chats")
    sender = models.CharField(max_length=150)
    message = models.TextField(blank=True, null=True)
    timestamp = models.CharField(max_length=100) # (기존 CharField 유지)
    image_url = models.CharField(max_length=512, blank=True, null=True)

    def __str__(self):
        return f"[{self.clan.name}] {self.sender}"

# 3. ClanBoard 모델 변환
# -----------------------------------------------------------------
class ClanBoard(models.Model):
    """
    FastAPI의 ClanBoard 모델을 변환합니다. 
    """
    clan = models.ForeignKey(Clan, on_delete=models.CASCADE, related_name="boards")
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=512, blank=True, null=True)

    def __str__(self):
        return f"[{self.clan.name}] {self.name}"

# 4. ClanJoinRequest 모델 변환
# -----------------------------------------------------------------
class ClanJoinRequest(models.Model):
    """
    FastAPI의 ClanJoinRequest 모델을 변환합니다. 
    """
    clan = models.ForeignKey(Clan, on_delete=models.CASCADE, related_name="join_requests")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="join_requests"
    )
    status = models.CharField(max_length=20, default="pending")

    def __str__(self):
        return f"{self.user.username} -> {self.clan.name}"

# 5. ClanAnnouncement 모델 변환
# -----------------------------------------------------------------
class ClanAnnouncement(models.Model):
    """
    FastAPI의 ClanAnnouncement 모델을 변환합니다. 
    """
    clan = models.ForeignKey(Clan, on_delete=models.CASCADE, related_name="announcements")
    title = models.CharField(max_length=255, blank=True, null=True)
    content = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.clan.name}] {self.title}"

# 6. ClanLedger 모델 변환
# -----------------------------------------------------------------
class ClanLedger(models.Model):
    """
    FastAPI의 ClanLedger 모델을 변환합니다. 
    """
    clan = models.ForeignKey(Clan, on_delete=models.CASCADE, related_name="ledger")
    date = models.DateTimeField(auto_now_add=True)
    description = models.CharField(max_length=512, blank=True, null=True)
    amount = models.FloatField(blank=True, null=True)

# 7. ClanEvent 모델 변환
# -----------------------------------------------------------------
class ClanEvent(models.Model):
    """
    FastAPI의 ClanEvent 모델을 변환합니다. 
    """
    clan = models.ForeignKey(Clan, on_delete=models.CASCADE, related_name="events")
    title = models.CharField(max_length=255, blank=True, null=True)
    date = models.DateTimeField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    attendees = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="attended_events",
        blank=True
    )

    def __str__(self):
        return f"[{self.clan.name}] {self.title}"