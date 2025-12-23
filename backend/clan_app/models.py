# clan_app/models.py

from django.db import models
from user_app.models import User
from django.utils import timezone 

# Create your models here.
class Clan(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    owner = models.ForeignKey(User, related_name='owned_clans', on_delete=models.CASCADE, default=1)
    members = models.ManyToManyField(User, related_name='clans', blank=True)
    image = models.ImageField(upload_to='clan_images/', null=True, blank=True)
    status = models.CharField(
        max_length=10,
        choices=[('pending', '대기'), ('active', '활성'), ('rejected', '거절')],
        default='pending'
    )
    created_at = models.DateTimeField(default=timezone.now) 
    admins = models.ManyToManyField(User, related_name='admin_clans', blank=True)
    def __str__(self):
        return self.name

class ClanJoinRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    clan = models.ForeignKey(Clan, related_name='join_requests', on_delete=models.CASCADE)
    user = models.ForeignKey(User, related_name='clan_join_requests', on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    requested_at = models.DateTimeField(default = timezone.now)

    class Meta:
        unique_together = ('clan', 'user') 

class ClanChat(models.Model):
    clan = models.ForeignKey(Clan, related_name='chats', on_delete=models.CASCADE)
    sender = models.ForeignKey(User, related_name='clan_chats', on_delete=models.CASCADE)
    message = models.TextField(default="")
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

# --- (이하 3순위 기능) ---

class ClanAnnouncement(models.Model):
    clan = models.ForeignKey(Clan, related_name='announcements', on_delete=models.CASCADE)
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=200, default="")
    content = models.TextField(default="")
    created_at = models.DateTimeField(auto_now_add=True)
    is_pinned = models.BooleanField(default=False)

class ClanEvent(models.Model):
    clan = models.ForeignKey(Clan, related_name='events', on_delete=models.CASCADE)
    creator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=100, default="")
    description = models.TextField(blank=True, default="")
    date = models.DateField(default=timezone.now)
    time = models.TimeField(null=True, blank=True)

class ClanBoard(models.Model):
    CATEGORY_CHOICES = [
        ('free', '자유'),
        ('info', '정보'),
        ('music', '음악'),
    ]
    clan = models.ForeignKey(Clan, related_name='boards', on_delete=models.CASCADE)
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=200,default = "")
    # --- 👇 [오류 수정] TextField에도 null=True, blank=True 추가 ---
    content = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default = timezone.now)
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES, default='free')