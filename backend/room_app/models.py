# room_app/models.py

from django.db import models
from django.conf import settings # User 모델
from clan_app.models import Clan # Clan 모델

# 1. Room 모델 변환
# -----------------------------------------------------------------
class Room(models.Model):
    """
    FastAPI의 Room 모델을 변환합니다. 
    """
    title = models.CharField(max_length=255)
    song = models.CharField(max_length=255)
    artist = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_private = models.BooleanField(default=False)
    password = models.CharField(max_length=128, blank=True, null=True)
    manager_nickname = models.CharField(max_length=150)
    confirmed = models.BooleanField(default=False)
    ended = models.BooleanField(default=False)
    
    # clan (기존: clan_id)
    clan = models.ForeignKey(
        Clan,
        on_delete=models.SET_NULL, # 클랜이 삭제되어도 방은 남을 수 있도록
        related_name="rooms",
        null=True,
        blank=True
    )

    def __str__(self):
        return self.title

# 2. Session 모델 변환
# -----------------------------------------------------------------
class Session(models.Model):
    """
    FastAPI의 Session 모델을 변환합니다. 
    """
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="sessions")
    session_name = models.CharField(max_length=255)
    participant_nickname = models.CharField(max_length=150, blank=True, null=True)

    def __str__(self):
        return f"[{self.room.title}] {self.session_name}"

# 3. SessionReservation 모델 변환
# -----------------------------------------------------------------
class SessionReservation(models.Model):
    """
    FastAPI의 SessionReservation 모델을 변환합니다. 
    """
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="reservations")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="session_reservations"
    )

# 4. Evaluation 모델 변환
# -----------------------------------------------------------------
class Evaluation(models.Model):
    """
    FastAPI의 Evaluation 모델을 변환합니다. 
    """
    room_id = models.IntegerField() # Room이 삭제돼도 평가는 남아야 하므로 FK가 아님
    evaluator_nickname = models.CharField(max_length=150)
    evaluated_nickname = models.CharField(max_length=150)

# 5. GroupChat 모델 변환
# -----------------------------------------------------------------
class GroupChat(models.Model):
    """
    FastAPI의 GroupChat 모델을 변환합니다. 
    """
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="chats")
    sender = models.CharField(max_length=150)
    message = models.TextField(blank=True, null=True)
    timestamp = models.CharField(max_length=100) # (기존 CharField 유지)
    image_url = models.CharField(max_length=512, blank=True, null=True)

    def __str__(self):
        return f"[{self.room.title}] {self.sender}"

# 6. RoomAvailability 모델 변환
# -----------------------------------------------------------------
class RoomAvailability(models.Model):
    """
    FastAPI의 RoomAvailability 모델을 변환합니다. 
    """
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="availabilities")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="availabilities"
    )
    available_slot = models.DateTimeField()