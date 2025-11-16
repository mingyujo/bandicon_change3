# clan_app/serializers.py

from rest_framework import serializers
from .models import (
    Clan, ClanJoinRequest, ClanChat, 
    ClanBoard, ClanAnnouncement, ClanEvent
)
from user_app.models import User
from room_app.models import Room
from user_app.serializers import UserBaseSerializer
from room_app.serializers import RoomInfoForActivitySerializer # 수정: room_app에서 가져옴

class ClanSerializer(serializers.ModelSerializer):
    """
    클랜 목록 (GET) / 클랜 생성 (POST)
    """
    owner = UserBaseSerializer(read_only=True)
    member_count = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Clan
        fields = ['id', 'name', 'description', 'owner', 'image', 'created_at', 'member_count']
        read_only_fields = ['owner', 'created_at']

    def get_member_count(self, obj):
        return obj.members.count()

class ClanDetailSerializer(serializers.ModelSerializer):
    """
    클랜 상세 (GET)
    """
    owner = UserBaseSerializer(read_only=True)
    members = serializers.SerializerMethodField()
    join_requests = serializers.SerializerMethodField()
    
    # [수정] 현재 유저의 상태 (owner, member, pending, none)
    my_status = serializers.SerializerMethodField()

    class Meta:
        model = Clan
        fields = [
            'id', 'name', 'description', 'owner', 'image', 'created_at', 
            'members', 'join_requests', 'my_status'
        ]

    def get_my_status(self, obj):
        user = self.context['request'].user
        if not user.is_authenticated:
            return "none"
        if obj.owner == user:
            return "owner"
        if obj.members.filter(id=user.id).exists():
            return "member"
        if ClanJoinRequest.objects.filter(clan=obj, user=user, status="pending").exists():
            return "pending"
        return "none"

    def get_members(self, obj):
        members = obj.members.all()
        return UserBaseSerializer(members, many=True).data

    def get_join_requests(self, obj):
        # 가입 신청 목록은 클랜장에게만 보이도록 함
        user = self.context['request'].user
        if obj.owner == user:
            requests = ClanJoinRequest.objects.filter(clan=obj, status="pending")
            return ClanJoinRequestSerializer(requests, many=True).data
        return None

class ClanJoinRequestSerializer(serializers.ModelSerializer):
    """
    클랜 가입 신청 목록 (Detail Serializer 내부에서 사용)
    """
    user = UserBaseSerializer(read_only=True)
    
    class Meta:
        model = ClanJoinRequest
        fields = ['id', 'user', 'status', 'requested_at']

class ClanChatSerializer(serializers.ModelSerializer):
    """
    클랜 채팅
    """
    sender = UserBaseSerializer(read_only=True)

    class Meta:
        model = ClanChat
        fields = ['id', 'sender', 'message', 'timestamp']
        read_only_fields = ['id', 'sender', 'timestamp']

# --- 클랜 3순위 (공지, 캘린더, 게시판) ---

class ClanAnnouncementSerializer(serializers.ModelSerializer):
    """
    클랜 공지사항
    """
    author = UserBaseSerializer(read_only=True)
    
    class Meta:
        model = ClanAnnouncement
        fields = ['id', 'author', 'title', 'content', 'created_at', 'is_pinned']
        read_only_fields = ['id', 'author', 'created_at']

class ClanEventSerializer(serializers.ModelSerializer):
    """
    클랜 캘린더 이벤트
    """
    creator = UserBaseSerializer(read_only=True)

    class Meta:
        model = ClanEvent
        fields = ['id', 'title', 'description', 'date', 'time', 'creator']
        read_only_fields = ['id', 'creator']

class ClanBoardSerializer(serializers.ModelSerializer):
    """
    클랜 게시판
    """
    author = UserBaseSerializer(read_only=True)
    
    class Meta:
        model = ClanBoard
        fields = ['id', 'author', 'title', 'content', 'created_at', 'category']
        read_only_fields = ['id', 'author', 'created_at']

# --- 클랜 활동 현황 ---

class RoomLatestActivitySerializer(serializers.ModelSerializer):
    """
    (Clan Member Activity) 멤버의 최근 합주방 활동
    """
    class Meta:
        model = Room
        fields = ['id', 'title', 'created_at'] # 'ended_at'은 없으므로 'created_at' 사용

class MemberActivitySerializer(UserBaseSerializer):
    """
    (Clan Member Activity) 클랜 멤버 활동 현황
    """
    latest_room = serializers.SerializerMethodField()

    class Meta(UserBaseSerializer.Meta):
        fields = UserBaseSerializer.Meta.fields + ('latest_room',)

    def get_latest_room(self, obj):
        # 해당 유저가 참여했던 방 중 가장 최근에 생성된(또는 종료된) 방 1개
        # (성능을 위해 더 복잡한 로직이 필요할 수 있으나, 일단 생성일 기준)
        latest_room = Room.objects.filter(
            members__id=obj.id, # 유저가 멤버로 참여했고
            clan_id=self.context['view'].kwargs.get('pk') # 이 클랜 방인
        ).order_by('-created_at').first()
        
        if latest_room:
            return RoomLatestActivitySerializer(latest_room).data
        return None