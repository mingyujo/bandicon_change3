# clan_app/serializers.py

from rest_framework import serializers
from .models import (
    Clan, ClanJoinRequest, ClanChat, 
    ClanBoard, ClanAnnouncement, ClanEvent
)
from django.contrib.auth import get_user_model
from user_app.models import User
from room_app.models import Room
from user_app.serializers import UserBaseSerializer
from room_app.serializers import RoomInfoForActivitySerializer # 수정: room_app에서 가져옴

from rest_framework import serializers
from .models import Clan, ClanJoinRequest, ClanAnnouncement, ClanEvent, ClanBoard
from django.contrib.auth import get_user_model

User = get_user_model()


class ClanMemberSerializer(serializers.ModelSerializer):
    """
    [User 모델 기준]
    User 모델에 이미지 필드가 없으므로, fields에서 제거합니다.
    """
    is_owner = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        # ▼▼▼ [수정 1] 'image' (또는 'avatar') 필드 제거 ▼▼▼
        fields = ['id', 'nickname', 'is_owner', 'is_admin']
        # ▲▲▲ [수정 1] ▲▲▲

    def get_clan(self):
        return self.context.get('clan')

    def get_is_owner(self, obj):
        clan = self.get_clan()
        if clan:
            return obj == clan.owner
        return False

    def get_is_admin(self, obj):
        clan = self.get_clan()
        if clan:
            return obj in clan.admins.all()
        return False


class ClanSerializer(serializers.ModelSerializer):
    """
    [Clan 모델 기준]
    Clan 모델의 'image' 필드는 존재하므로 유지합니다.
    """
    owner = UserBaseSerializer(read_only=True) 
    created_at = serializers.DateTimeField(format="%Y-%m-%d", read_only=True)
    
    # 1. 'member_count' 필드 정의
    member_count = serializers.SerializerMethodField()
    
    # 2. 'members' (ID 목록) 필드 정의
    members = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Clan
        
        # ▼▼▼ [핵심] 3. 'fields' 목록에 'member_count'와 'members'가 모두 있는지 확인! ▼▼▼
        fields = ('id', 'name', 'description', 'owner', 'created_at', 'image', 
                  'member_count', 'members') 
        # ▲▲▲ [핵심] ▲▲▲
        
        read_only_fields = ('created_at',) # 'owner'는 여기서 제거되어야 함
    def get_member_count(self, obj):
        return obj.members.count()


class ClanDetailSerializer(serializers.ModelSerializer):
    """
    [Clan 모델 기준]
    Clan 모델의 'image' 필드는 존재하므로 유지합니다.
    """
    owner = ClanMemberSerializer(read_only=True)
    admins = ClanMemberSerializer(many=True, read_only=True)
    members = UserBaseSerializer(many=True, read_only=True) # 상세 페이지에서는 전체 정보
    announcements = serializers.SerializerMethodField()
    events = serializers.SerializerMethodField()
    boards = serializers.SerializerMethodField()
    join_requests = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        instance = kwargs.get('instance') or args[0] if args else None
        if instance and isinstance(instance, Clan):
            if 'context' not in kwargs:
                kwargs['context'] = {}
            kwargs['context']['clan'] = instance
        if 'owner' in self.fields:
            self.fields['owner'].context.update(kwargs.get('context', {}))
        if 'admins' in self.fields:
            self.fields['admins'].context.update(kwargs.get('context', {}))

    class Meta:
        model = Clan
        # Clan 모델의 'image' 필드는 그대로 둠
        fields = ('id', 'name', 'description', 'created_at', 'owner', 'admins', 'members', 
                  'image', 'announcements', 'events', 'boards', 'join_requests')

    def get_announcements(self, obj):
        announcements = obj.announcements.order_by('-created_at')[:5]
        return ClanAnnouncementSerializer(announcements, many=True, context=self.context).data

    def get_events(self, obj):
        events = obj.events.order_by('date')[:5] 
        return ClanEventSerializer(events, many=True, context=self.context).data
    
    def get_boards(self, obj):
        boards = obj.boards.all()
        return ClanBoardSerializer(boards, many=True, context=self.context).data
    
    def get_join_requests(self, obj):
        requests = obj.join_requests.filter(status='pending')
        return ClanJoinRequestSerializer(requests, many=True).data


class ClanJoinRequestSerializer(serializers.ModelSerializer):
    """
    [User 모델 기준]
    User 모델에 이미지 필드가 없으므로 'user_avatar' 필드 제거
    """
    user_nickname = serializers.ReadOnlyField(source='user.nickname')
    # ▼▼▼ [수정 2] user_avatar 필드 정의 제거 ▼▼▼
    # user_avatar = serializers.ImageField(source='user.image', read_only=True)
    # ▲▲▲ [수정 2] ▲▲▲

    class Meta:
        model = ClanJoinRequest
        # ▼▼▼ [수정 3] Meta.fields에서 'user_avatar' 제거 ▼▼▼
        fields = ['id', 'user', 'clan', 'status', 'requested_at', 'user_nickname']
        # ▲▲▲ [수정 3] ▲▲▲
        read_only_fields = ['user', 'clan']


class ClanAnnouncementSerializer(serializers.ModelSerializer):
    author_nickname = serializers.ReadOnlyField(source='author.nickname')

    class Meta:
        model = ClanAnnouncement
        fields = ['id', 'clan', 'author', 'author_nickname', 'title', 'content', 'created_at', 'is_pinned']
        read_only_fields = ['clan', 'author']


class ClanEventSerializer(serializers.ModelSerializer):
    creator_nickname = serializers.ReadOnlyField(source='creator.nickname')

    class Meta:
        model = ClanEvent
        fields = ['id', 'clan', 'creator', 'creator_nickname', 'title', 'description', 'date', 'time']
        read_only_fields = ['clan', 'creator']


class ClanBoardSerializer(serializers.ModelSerializer):
    author_nickname = serializers.ReadOnlyField(source='author.nickname')

    class Meta:
        model = ClanBoard
        fields = ['id', 'clan', 'author', 'author_nickname', 'title', 'content', 'created_at', 'category']
        read_only_fields = ['clan', 'author']


class ClanChatSerializer(serializers.ModelSerializer):
    """
    [User 모델 기준]
    User(sender) 모델에 이미지 필드가 없으므로 'sender_avatar' 필드 제거
    """
    sender_nickname = serializers.ReadOnlyField(source='sender.nickname')
    # ▼▼▼ [수정 4] sender_avatar 필드 정의 제거 ▼▼▼
    # sender_avatar = serializers.ImageField(source='sender.image', read_only=True)
    # ▲▲▲ [수정 4] ▲▲▲

    class Meta:
        model = ClanChat
        # ▼▼▼ [수정 5] Meta.fields에서 'sender_avatar' 제거 ▼▼▼
        fields = ['id', 'clan', 'sender', 'sender_nickname', 'message', 'timestamp']
        # ▲▲▲ [수정 5] ▲▲▲
        read_only_fields = ['clan', 'sender']
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
        return 
    