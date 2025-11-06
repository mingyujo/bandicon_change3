# room_app/serializers.py

from rest_framework import serializers
from .models import Room, Session, SessionReservation, GroupChat, Evaluation, RoomAvailability
from user_app.serializers import UserBaseSerializer
from clan_app.serializers import ClanInfoSerializer

# --- Session & Reservation ---

class SessionReservationSerializer(serializers.ModelSerializer):
    """
    FastAPI의 SessionReservation  스키마를 변환.
    """
    user = UserBaseSerializer(read_only=True)
    
    class Meta:
        model = SessionReservation
        fields = ('id', 'user')


class SessionBaseSerializer(serializers.ModelSerializer):
    """
    FastAPI의 SessionBase  스키마를 변환.
    """
    reservations = SessionReservationSerializer(many=True, read_only=True)
    
    class Meta:
        model = Session
        fields = ('session_name', 'participant_nickname', 'reservations')


# --- Room ---

class RoomCreateSerializer(serializers.Serializer):
    """
    FastAPI의 RoomCreate  스키마를 변환.
    ModelSerializer가 아닌 Serializer를 사용 (DB 모델과 필드가 다름)
    """
    title = serializers.CharField()
    song = serializers.CharField()
    artist = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    is_private = serializers.BooleanField()
    password = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    sessions = serializers.ListField(child=serializers.CharField())
    clan_id = serializers.IntegerField(required=False, allow_null=True)


class RoomUpdateSerializer(serializers.Serializer):
    """
    FastAPI의 RoomUpdate  스키마를 변환.
    """
    title = serializers.CharField()
    song = serializers.CharField()
    artist = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    nickname = serializers.CharField() # 방장 확인용 
    sessions = serializers.ListField(child=serializers.CharField(), required=False)


class RoomSerializer(serializers.ModelSerializer):
    """
    FastAPI의 Room  스키마를 변환 (Full Detail).
    """
    sessions = SessionBaseSerializer(many=True, read_only=True)
    clan = ClanInfoSerializer(read_only=True)
    
    class Meta:
        model = Room
        fields = (
            'id', 
            'title', 
            'song', 
            'artist', 
            'description', 
            'is_private', 
            'manager_nickname', 
            'confirmed', 
            'ended', 
            'sessions', 
            'clan_id', 
            'clan'
        )

# --- Chat & Evaluation ---

class GroupChatSerializer(serializers.ModelSerializer):
    """
    FastAPI의 GroupChatMessage  스키마를 변환.
    """
    class Meta:
        model = GroupChat
        fields = ('id', 'room_id', 'sender', 'message', 'timestamp', 'image_url')


class MannerEvalSerializer(serializers.Serializer):
    """
    FastAPI의 MannerEval  스키마를 변환.
    """
    room_id = serializers.IntegerField()
    evaluator = serializers.CharField()
    scores = serializers.DictField(child=serializers.IntegerField())
    mood_maker = serializers.CharField(required=False, allow_null=True, allow_blank=True)

# --- Availability (Schedule) ---

class AvailabilitySlotSerializer(serializers.Serializer):
    """
    FastAPI의 AvailabilitySlot  스키마를 변환.
    (ModelSerializer가 아님 - 집계 데이터용)
    """
    time = serializers.DateTimeField()
    voters = UserBaseSerializer(many=True)


class UpdateAvailabilityRequestSerializer(serializers.Serializer):
    """
    FastAPI의 UpdateAvailabilityRequest  스키마를 변환.
    """
    slots = serializers.ListField(child=serializers.CharField())


# --- Clan Activity (Room Info) ---

class RoomInfoForActivitySerializer(serializers.ModelSerializer):
    """
    FastAPI의 RoomInfoForActivity  스키마를 변환.
    """
    # session_name은 Model에 없는 필드이므로 SerializerMethodField로 추가해야 함
    # (우선 Model 필드만 정의)
    session_name = serializers.CharField() # 임시 정의 (View에서 채워야 함)

    class Meta:
        model = Room
        fields = ('id', 'title', 'song', 'artist', 'session_name')


class MemberActivitySerializer(serializers.Serializer):
    """
    FastAPI의 MemberActivity  스키마를 변환.
    """
    member = UserBaseSerializer()
    participating_rooms = RoomInfoForActivitySerializer(many=True)