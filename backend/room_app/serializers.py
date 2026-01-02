# room_app/serializers.py

from rest_framework import serializers
from .models import (
    Room, Session, SessionReservation, Evaluation, GroupChat, RoomAvailabilitySlot
)
from user_app.models import User
from user_app.serializers import UserBaseSerializer

class SessionReservationSerializer(serializers.ModelSerializer):
    """
    세션 예약을 위한 시리얼라이저 (유저 정보 포함)
    """
    # [수정] user_nickname을 UserBaseSerializer로
    user = UserBaseSerializer(read_only=True)
    user_nickname = serializers.CharField(write_only=True, required=False) # 쓰기용

    class Meta:
        model = SessionReservation
        fields = ['id', 'user', 'created_at', 'user_nickname']
        read_only_fields = ['user', 'created_at']

    def create(self, validated_data):
        # view에서 request.user를 받아 생성 (여기서는 쓰기용 user_nickname 사용 안 함)
        # 만약 user_nickname을 쓴다면 user = User.objects.get(nickname=validated_data.pop('user_nickname'))
        # session = validated_data.pop('session')
        # return SessionReservation.objects.create(session=session, user=user, **validated_data)
        
        # [수정] View에서 user 객체를 직접 주입하는 방식으로 변경
        return SessionReservation.objects.create(**validated_data)


class SessionSerializer(serializers.ModelSerializer):
    """
    세션 정보 (예약 목록 포함)
    """
    # 'reservations'는 Room 모델의 related_name
    reservations = SessionReservationSerializer(many=True, read_only=True)

    class Meta:
        model = Session
        fields = ['id', 'session_name', 'participant_nickname', 'reservations']


class RoomAvailabilitySlotSerializer(serializers.ModelSerializer):
    """
    합주 일정 조율 슬롯 (투표자 목록, 현재 유저 투표 여부 포함)
    """
    voters = UserBaseSerializer(many=True, read_only=True)
    voted_by_current_user = serializers.SerializerMethodField()

    class Meta:
        model = RoomAvailabilitySlot
        fields = ['id', 'time', 'voters', 'voted_by_current_user']

    def get_voted_by_current_user(self, obj):
        user = self.context['request'].user
        return obj.voters.filter(id=user.id).exists()


class RoomListSerializer(serializers.ModelSerializer):
    """
    (GET) 합주방 목록 (세션 정보 포함)
    """
    # 'sessions'는 Room 모델의 related_name
    sessions = SessionSerializer(many=True, read_only=True)
    session_count = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            'id', 'title', 'song', 'artist', 'manager_nickname', 
            'sessions', 'session_count', 'participant_count', 
            'created_at', 'clan', 'confirmed', 'is_private', 'ended'
        ]

    def get_session_count(self, obj):
        return obj.sessions.count()

    def get_participant_count(self, obj):
        return obj.sessions.filter(participant_nickname__isnull=False).count()


class RoomDetailSerializer(serializers.ModelSerializer):
    """
    (GET) 합주방 상세 정보 (세션, 채팅, 일정 조율)
    """
    sessions = SessionSerializer(many=True, read_only=True)
    # 'availability_slots'는 Room 모델의 related_name (models.py에서 설정)
    availability_slots = RoomAvailabilitySlotSerializer(many=True, read_only=True)
    
    # [추가] 로그인한 유저가 이 방의 클랜 관리자(삭제/강퇴 권한 보유)인지 여부
    user_is_clan_admin = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            'id', 'title', 'song', 'artist', 'description', 
            'manager_nickname', 'sessions', 'confirmed', 'ended', 
            'created_at', 'confirmed_at', 'ended_at',
            'availability_slots', # 2순위: 일정 조율 슬롯
            'clan',
            'user_is_clan_admin' # [추가]
        ]
        read_only_fields = [
            'manager_nickname', 'sessions', 'confirmed', 'ended', 
            'created_at', 'confirmed_at', 'ended_at',
            'availability_slots', 'clan',
            'user_is_clan_admin'
        ]

    def get_user_is_clan_admin(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
            
        if not obj.clan:
            return False
            
        # 클랜장 또는 운영진인지 확인
        try:
             is_owner = obj.clan.owner == request.user
             is_admin = obj.clan.admins.filter(id=request.user.id).exists()
             return is_owner or is_admin
        except Exception:
            return False


class MyRoomListSerializer(RoomListSerializer):
    """
    (GET) /api/v1/rooms/my/
    (내 방 목록 - RoomListSerializer와 동일하나, 혹시 몰라 분리)
    """
    class Meta(RoomListSerializer.Meta):
        pass


class RoomInfoForActivitySerializer(serializers.ModelSerializer):
    """
    (GET) /api/v1/clans/<int:pk>/activity/
    클랜 활동용 최소한의 합주방 정보
    """
    class Meta:
        model = Room
        fields = ['id', 'title', 'manager_nickname', 'confirmed', 'ended']


class GroupChatSerializer(serializers.ModelSerializer):
    """
    (GET, POST) 합주방 채팅
    """
    class Meta:
        model = GroupChat
        fields = ['id', 'sender', 'message', 'timestamp']
        read_only_fields = ['id', 'sender', 'timestamp'] # sender는 view에서 채움


class EvaluationSerializer(serializers.ModelSerializer):
    """
    (POST) 매너 평가
    """
    class Meta:
        model = Evaluation
        fields = [
            'id', 'room', 'evaluator', 'target', 
            'score', 'comment', 'is_mood_maker'
        ]
        # view에서 room, evaluator, target을 채움
        read_only_fields = ['id', 'room', 'evaluator', 'target'] 


class ReserveSessionSerializer(serializers.Serializer):
    """
    (POST) 세션 예약/취소 (단순 쓰기용)
    (이 Serializer는 현재 View(APIView)에서 직접 처리하여 사용되지 않음)
    """
    session_id = serializers.IntegerField()
    # nickname = serializers.CharField() # -> request.user로 대체