# clan_app/serializers.py
from rest_framework import serializers
from .models import (
    Clan, ClanJoinRequest, ClanChat, 
    ClanBoard, ClanAnnouncement, ClanEvent
)
from django.contrib.auth import get_user_model
from user_app.models import User
from room_app.models import Room, Session
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
                  'member_count', 'members', 'status') 
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
                  'image', 'announcements', 'events', 'boards', 'join_requests', 'status')

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
    user = UserBaseSerializer(read_only=True)
    user_nickname = serializers.ReadOnlyField(source='user.nickname')

    class Meta:
        model = ClanJoinRequest
        fields = ['id', 'user', 'clan', 'status', 'requested_at', 'user_nickname']
        read_only_fields = ['clan']


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

# ▼▼▼ [수정] MemberActivitySerializer 교체 ▼▼▼
class MemberParticipationSerializer(serializers.ModelSerializer):
    """
    (Helper) 멤버가 참여한 세션과 방 정보 + 상태(참여/확정/예약)
    """
    id = serializers.ReadOnlyField(source='room.id')
    title = serializers.ReadOnlyField(source='room.title')
    song = serializers.ReadOnlyField(source='room.song')
    artist = serializers.ReadOnlyField(source='room.artist')
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = Session
        fields = ['id', 'title', 'song', 'artist', 'session_name', 'status']

    def get_status(self, obj):
        # get_participating_rooms에서 주입한 _custom_status가 있으면 사용
        return getattr(obj, '_custom_status', '참여')

class MemberActivitySerializer(serializers.ModelSerializer):
    """
    (Main) 클랜 멤버 활동 현황 (프론트엔드 구조에 맞춤)
    Output: { "member": { "nickname": "..." }, "participating_rooms": [...] }
    """
    member = UserBaseSerializer(source='*', read_only=True) # 유저 정보를 'member' 필드에 담음
    participating_rooms = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['member', 'participating_rooms']

    def get_participating_rooms(self, obj):
        # View에서 전달받은 clan_id
        clan_id = self.context['view'].kwargs.get('pk')
        
        results = []

        # 1. 실제 참여 중인 세션 (Confirmed 여부 포함)
        participations = Session.objects.filter(
            room__clan_id=clan_id,
            participant_nickname=obj.nickname
        ).select_related('room')

        for session in participations:
            if session.room.ended:
                session._custom_status = "종료"
            elif session.room.confirmed:
                session._custom_status = "확정"
            else:
                session._custom_status = "참여"
            results.append(session)

        # 2. 예약 중인 세션
        reservations = SessionReservation.objects.filter(
            session__room__clan_id=clan_id,
            user=obj
        ).select_related('session', 'session__room')

        for reservation in reservations:
            # 중복 제거: 이미 참여 중인 세션에 예약 데이터가 남아있을 경우(논리상 없어야 하지만) 방지
            # 하지만 예약과 참여는 별개 상태로 봅니다.
            session = reservation.session
            # 예약 상태임을 표시하기 위해 객체 복사 혹은 속성 할당
            # (같은 session 객체를 공유하면 덮어씌워질 수 있으므로 주의, 하지만 여기선 쿼리가 다름)
            session._custom_status = "예약"
            results.append(session)

        # 3. 최신순 정렬 (방 생성 시간 기준)
        results.sort(key=lambda s: s.room.created_at, reverse=True)
        
        return MemberParticipationSerializer(results, many=True).data
# ▲▲▲ [수정 완료] ▲▲▲