# room_app/models.py

from django.db import models
from django.conf import settings # User 모델
from clan_app.models import Clan # Clan 모델
from django.utils import timezone 

# 1. Room 모델 변환
# -----------------------------------------------------------------
class Room(models.Model):
    title = models.CharField(max_length=255)
    song = models.CharField(max_length=255)
    artist = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_private = models.BooleanField(default=False)
    password = models.CharField(max_length=128, blank=True, null=True)
    manager_nickname = models.CharField(max_length=150)
    confirmed = models.BooleanField(default=False)
    ended = models.BooleanField(default=False)
    
    # --- 👇 [최종 수정] auto_now_add=True -> default=timezone.now ---
    created_at = models.DateTimeField(default=timezone.now)
    # --- 👆 [최종 수정] ---
    confirmed_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    clan = models.ForeignKey(
        Clan,
        on_delete=models.SET_NULL, 
        related_name="rooms",
        null=True,
        blank=True
    )

    def __str__(self):
        return self.title

# 2. Session 모델 변환
# -----------------------------------------------------------------
class Session(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="sessions")
    session_name = models.CharField(max_length=255)
    participant_nickname = models.CharField(max_length=150, blank=True, null=True)

    def __str__(self):
        return f"[{self.room.title}] {self.session_name}"

# 3. SessionReservation 모델 변환 (2순위 기능)
# -----------------------------------------------------------------
class SessionReservation(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="reservations")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="session_reservations"
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('session', 'user')
        ordering = ['created_at'] 

# 4. Evaluation 모델 변환 (2순위 기능)
# -----------------------------------------------------------------
class Evaluation(models.Model):
    room = models.ForeignKey(
        Room, 
        on_delete=models.SET_NULL, 
        related_name="evaluations",
        null=True, blank=True 
    )
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        related_name="given_evaluations",
        null=True, blank=True 
    )
    target = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        related_name="received_evaluations",
        null=True, blank=True 
    )
    
    score = models.IntegerField(default=50)
    comment = models.TextField(blank=True, null=True)
    is_mood_maker = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

# 5. GroupChat 모델 변환
# -----------------------------------------------------------------
class GroupChat(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="chats")
    sender = models.CharField(max_length=150)
    message = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(default=timezone.now)
    image_url = models.CharField(max_length=512, blank=True, null=True)

    def __str__(self):
        return f"[{self.room.title}] {self.sender}"

# 6. RoomAvailabilitySlot 모델 변환 (2순위 기능)
# -----------------------------------------------------------------
class RoomAvailabilitySlot(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="availability_slots")
    time = models.DateTimeField() 
    voters = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="voted_slots",
        blank=True
    )
    
    class Meta:
        unique_together = ('room', 'time') 
        ordering = ['time']