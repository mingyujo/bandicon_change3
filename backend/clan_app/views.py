from django.shortcuts import render

# Create your views here.
# clan_app/views.py
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from rest_framework import generics, status, views, parsers, permissions
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.permissions import AllowAny # (테스트를 위해 AllowAny)
from django.shortcuts import get_object_or_404
from .models import Clan, ClanBoard, ClanJoinRequest, ClanAnnouncement, ClanEvent, ClanChat
from user_app.models import User
from .serializers import (
    ClanInfoSerializer, ClanDetailSerializer, ClanJoinRequestSerializer, ClanAnnouncementSerializer,ClanChatSerializer
)
from room_app.serializers import (RoomInfoForActivitySerializer,
    MemberActivitySerializer) # 활동 현황용
from room_app.models import Room, Session # 활동 현황용
from .permission import IsClanOwner # 커스텀 권한
# --- FastAPI 로직 임시 임포트 ---
#try:
#    from backend import crud, models as fastapi_models
#    from backend.database import get_db
#except ImportError:
#    print("[Warning] FastAPI 'backend' module not found. crud functions will fail.")
#    crud = None
#    get_db = None
# --- 임시 임포트 끝 ---

User = get_user_model() # 유저 모델 가져오기

def get_user_by_nickname(db, nickname):
    return get_object_or_404(User, nickname=nickname)

# --- Clan Views ---

class ClanListCreateView(generics.ListCreateAPIView):
    """
    클랜 목록(GET)과 클랜 생성(POST)을 처리하는 View
    """
    queryset = Clan.objects.all()
    serializer_class = ClanInfoSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    # 권한 설정:
    # IsAuthenticatedOrReadOnly
    # - GET (읽기) 요청은 누구나 (로그인 안 해도) 허용
    # - POST (쓰기/생성) 요청은 로그인한 사용자(IsAuthenticated)만 허용
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        """
        POST 요청으로 새 클랜이 생성될 때 호출됩니다.
        (ListCreateAPIView에 내장된 기능)
        
        클랜의 'owner'를 현재 로그인한 유저(request.user)로 자동 설정합니다.
        """
        serializer.save(owner=self.request.user)

class ClanDetailAPIView(generics.RetrieveAPIView):
    """
    GET: FastAPI의 get_clan_detail 
    """
    queryset = Clan.objects.prefetch_related(
        'members', 'announcements', 'join_requests__user', 'events', 'boards'
    )
    serializer_class = ClanInfoSerializer
    permission_classes = [AllowAny]
    lookup_field = 'clan_id'


class ClanJoinRequestView(views.APIView):
    """
    POST: FastAPI의 request_to_join_clan 
    """
    permission_classes = [AllowAny]

    def post(self, request: Request, clan_id: int):
        nickname = request.data.get('nickname') # 폼 데이터로 가정
        user = get_user_by_nickname(None, nickname)
        clan = get_object_or_404(Clan, id=clan_id)

        # (임시) FastAPI의 crud.create_clan_join_request  호출
        # (푸시 알림, 복잡한 중복/에러 처리가 포함되어 있음)
        db = next(get_db())
        fastapi_user = db.query(fastapi_models.User).get(user.id)
        fastapi_clan = db.query(fastapi_models.Clan).get(clan.id)
        
        join_request, message = crud.create_clan_join_request(db, fastapi_clan, fastapi_user)
        db.close()
        
        if not join_request:
            return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({"success": True, "message": message})


class ClanApproveRequestView(views.APIView):
    """
    POST: FastAPI의 approve_clan_request 
    """
    permission_classes = [AllowAny]

    def post(self, request: Request, request_id: int):
        nickname = request.data.get('nickname') # 폼 데이터로 가정
        user = get_user_by_nickname(None, nickname)
        join_request = get_object_or_404(ClanJoinRequest.objects.select_related('clan'), id=request_id)
        
        if join_request.clan.owner != user:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
        
        # crud.approve_clan_join_request  로직 재구현
        join_request.status = "approved"
        join_request.save()
        join_request.clan.members.add(join_request.user)
        
        return Response({"success": True})

#클랜 승인 대기 목록
class ClanJoinRequestListView(generics.ListAPIView):
    """
    클랜 가입 신청 목록(GET)을 처리하는 View (클랜 소유자만 가능)
    """
    serializer_class = ClanJoinRequestSerializer
    
    # 권한 설정:
    # 1. 로그인 필수 (IsAuthenticated)
    # 2. 클랜 소유자 필수 (IsClanOwner)
    permission_classes = [permissions.IsAuthenticated, IsClanOwner]

    def get_queryset(self):
        # URL에서 클랜 ID(pk)를 가져옵니다.
        clan_id = self.kwargs.get('pk')
        
        # 해당 클랜의 가입 신청 중, 'pending' (대기 중) 상태인 것만 필터링합니다.
        return ClanJoinRequest.objects.filter(clan__id=clan_id, status="pending")
# (ClanApproveAllView, ClanRejectRequestView, ClanKickMemberView 등은
#  위와 유사한 패턴으로 crud.py 의 로직을 변환/재구현합니다)

# --- Clan Chat ---
class ClanChatView(views.APIView):
    """
    GET/POST: FastAPI의 /chat/clan  (chats/clan 과 동일)
    """
    permission_classes = [AllowAny]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get(self, request: Request, clan_id: int):
        # crud.get_clan_chat 
        messages = ClanChat.objects.filter(clan_id=clan_id).order_by('timestamp')
        serializer = ClanChatSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request: Request, clan_id: int):
        # (파일 업로드 로직은 board_app/views.py와 동일하게 추가 가능)
        sender = request.data.get('sender')
        message = request.data.get('message')
        
        if not sender or not message:
            return Response({"detail": "sender와 message가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        # crud.create_clan_chat  로직
        db_msg = ClanChat.objects.create(
            clan_id=clan_id,
            sender=sender,
            message=message,
            timestamp=datetime.now().isoformat()
        )
        # (푸시 알림 로직  생략)
        
        serializer = ClanChatSerializer(db_msg)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

# (ClanAnnouncement, ClanEvent, ClanBoard 뷰는 생략)

# --- Clan Activity ---
class ClanActivityView(views.APIView):
    """
    GET: FastAPI의 get_clan_activity 
    (crud.get_clan_member_activity 의 복잡한 로직 재구현)
    """
    permission_classes = [AllowAny]

    def get(self, request: Request, clan_id: int):
        clan = get_object_or_404(Clan.objects.prefetch_related('members'), id=clan_id)
        
        # crud.get_clan_member_activity  로직 재구현
        clan_rooms = Room.objects.filter(clan_id=clan_id).prefetch_related(
            'sessions__reservations__user'
        )
        
        activity_list = []
        for member in clan.members.all():
            if member.id == clan.owner_id:
                continue
            
            member_activity = {"member": member, "participating_rooms": []}
            
            for room in clan_rooms:
                if room.manager_nickname == member.nickname:
                    member_activity["participating_rooms"].append(
                        {"id": room.id, "title": room.title, "song": room.song, "artist": room.artist, "session_name": "방장"}
                    )
                for session in room.sessions.all():
                    if session.participant_nickname == member.nickname:
                         member_activity["participating_rooms"].append(
                            {"id": room.id, "title": room.title, "song": room.song, "artist": room.artist, "session_name": session.session_name}
                        )
                    # (예약 로직 은 복잡하므로 일단 생략)

            activity_list.append(member_activity)

        serializer = MemberActivitySerializer(activity_list, many=True)
        return Response(serializer.data)
class ClanDetailView(generics.RetrieveAPIView):
    """
    클랜 상세 정보(GET)를 처리하는 View
    URL에서 클랜의 ID (pk)를 받아서 해당 객체를 반환합니다.
    """
    queryset = Clan.objects.all()
    serializer_class = ClanDetailSerializer
    
    # 권한 설정: 로그인하지 않은 사용자도 상세 정보를 볼 수 있게 허용
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class ClanJoinRequestCreateView(generics.CreateAPIView):
    """
    클랜 가입 신청(POST)을 처리하는 View
    URL에서 클랜 ID(pk)를 받아서 가입 신청(ClanJoinRequest)을 생성합니다.
    """
    serializer_class = ClanJoinRequestSerializer
    
    # 권한 설정: 로그인한 사용자(IsAuthenticated)만 가입 신청을 할 수 있습니다.
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # 1. URL에서 클랜 ID(pk)를 가져옵니다.
        #    (urls.py에서 <int:pk>로 설정할 예정입니다)
        clan_id = self.kwargs.get('pk')
        try:
            clan = Clan.objects.get(pk=clan_id)
        except Clan.DoesNotExist:
            return Response(
                {"detail": "해당 클랜을 찾을 수 없습니다."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # 2. 현재 로그인한 사용자를 가져옵니다.
        user = request.user

        # 3. 이미 멤버인지 확인합니다.
        if clan.members.filter(pk=user.pk).exists():
            return Response(
                {"detail": "이미 클랜 멤버입니다."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4. 이미 가입 신청을 했는지 확인합니다.
        if ClanJoinRequest.objects.filter(clan=clan, user=user, status="pending").exists():
            return Response(
                {"detail": "이미 가입 신청이 대기 중입니다."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 5. 가입 신청 객체를 생성합니다.
        join_request = ClanJoinRequest.objects.create(
            clan=clan, 
            user=user, 
            status="pending"
        )
        
        # 6. 생성된 객체를 Serializer로 변환하여 반환합니다.
        serializer = self.get_serializer(join_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ClanJoinRequestUpdateView(generics.UpdateAPIView):
    """
    클랜 가입 신청을 승인(approve) 또는 거절(reject)하는 View (POST)
    """
    serializer_class = ClanJoinRequestSerializer
    queryset = ClanJoinRequest.objects.all()
    
    # URL에서 <int:pk>로 ClanJoinRequest의 ID를 받습니다.
    # lookup_field = 'pk' (이게 기본값이라 생략 가능)

    def get_permissions(self):
        """
        요청한 유저가 이 가입 신청(JoinRequest)이 속한
        클랜의 소유자인지 확인하는 커스텀 권한 로직
        """
        # 1. 먼저 가입 신청(JoinRequest) 객체를 가져옵니다.
        request_id = self.kwargs.get('pk')
        join_request = get_object_or_404(ClanJoinRequest, pk=request_id)
        
        # 2. 해당 클랜의 소유자인지 확인하는 권한 클래스를 동적으로 적용
        class IsOwnerOfRequestClan(IsClanOwner):
            def has_permission(self, request, view):
                # IsClanOwner 권한 로직을 재사용하되,
                # 클랜 객체를 join_request에서 직접 가져옵니다.
                clan = join_request.clan
                return clan.owner == request.user

        # 3. 로그인 필수 + 클랜 소유자 필수 권한을 반환
        return [permissions.IsAuthenticated(), IsOwnerOfRequestClan()]

    def update(self, request, *args, **kwargs):
        """
        POST 요청만 처리하도록 update 메서드를 오버라이드(override)합니다.
        (원래 UpdateAPIView는 PUT, PATCH를 사용합니다)
        """
        # 1. 요청 Body에서 'action' (approve 또는 reject)을 받습니다.
        action = request.data.get("action")
        
        # 2. URL(pk)을 통해 가입 신청 객체를 가져옵니다.
        instance = self.get_object() 

        if action == "approve":
            # --- 승인 로직 ---
            instance.status = "approved"
            instance.save()
            
            # (중요) 클랜의 members 필드에 유저를 추가합니다.
            clan = instance.clan
            user_to_add = instance.user
            clan.members.add(user_to_add)
            
            serializer = self.get_serializer(instance)
            return Response(serializer.data, status=status.HTTP_200_OK)

        elif action == "reject":
            # --- 거절 로직 ---
            instance.status = "rejected"
            instance.save()
            
            serializer = self.get_serializer(instance)
            return Response(serializer.data, status=status.HTTP_200_OK)

        else:
            # --- 잘못된 요청 ---
            return Response(
                {"detail": "Body에 'action' ('approve' 또는 'reject')을 포함해야 합니다."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
    def post(self, request, *args, **kwargs):
        # POST 요청이 오면 update 로직을 실행하도록 연결
        return self.update(request, *args, **kwargs)

    # (PUT, PATCH 요청은 막기 위해 비워둡니다)
    def put(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)
    def patch(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)
class ClanMemberRemoveView(APIView):
    """
    클랜 멤버를 강퇴(DELETE)합니다. (클랜 소유자만 가능)
    URL에서 클랜 ID(clan_pk)와 멤버 닉네임(nickname)을 받습니다.
    """
    # 1. 로그인한 유저인지 먼저 확인
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, clan_pk, nickname):
        # 2. 클랜을 찾습니다.
        clan = get_object_or_404(Clan, pk=clan_pk)

        # 3. 권한 확인: 요청한 유저가 클랜 소유자인지 확인
        if clan.owner != request.user:
            return Response(
                {"detail": "클랜 소유자만 멤버를 강퇴할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 4. 강퇴할 유저를 닉네임으로 찾습니다.
        try:
            # User 모델에 'nickname' 필드가 unique=True라고 가정합니다.
            user_to_kick = User.objects.get(nickname=nickname)
        except User.DoesNotExist:
            return Response(
                {"detail": "해당 닉네임의 유저를 찾을 수 없습니다."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 5. 소유자 자신을 강퇴하려는지 확인
        if clan.owner == user_to_kick:
            return Response(
                {"detail": "클랜 소유자는 자신을 강퇴할 수 없습니다."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 6. 해당 유저가 멤버인지 확인
        if not clan.members.filter(pk=user_to_kick.pk).exists():
            return Response(
                {"detail": "해당 유저가 클랜 멤버가 아닙니다."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 7. 멤버 목록에서 유저를 제거 (강퇴)
        clan.members.remove(user_to_kick)

        # 8. 성공 응답 (내용 없음)
        return Response(status=status.HTTP_204_NO_CONTENT)

class ClanAnnouncementView(generics.ListCreateAPIView):
    """
    클랜 공지사항 목록(GET) 및 생성(POST)을 처리합니다.
    POST는 클랜 소유자만 가능합니다.
    """
    serializer_class = ClanAnnouncementSerializer
    
    # POST(생성)일 때만 IsClanOwner 권한을 확인하도록 수정합니다.
    def get_permissions(self):
        # GET (목록 조회) 요청은 로그인한 사용자라면 누구나 가능
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        
        # POST (생성) 요청은 클랜 소유자만 가능
        if self.request.method == 'POST':
            # IsClanOwner 권한 클래스를 여기서 직접 반환
            return [permissions.IsAuthenticated(), IsClanOwner()]
        
        return super().get_permissions()

    def get_queryset(self):
        """
        GET (목록) 요청 시 호출됩니다.
        """
        # 1. URL에서 클랜 ID(pk)를 가져옵니다.
        clan_id = self.kwargs.get('pk')
        
        # 2. 해당 클랜의 공지사항만 필터링합니다.
        #    (최신순으로 정렬 - created_at의 '-'는 내림차순)
        return ClanAnnouncement.objects.filter(clan__id=clan_id).order_by('-created_at')

    def perform_create(self, serializer):
        """
        POST (생성) 요청 시 호출됩니다. (기존 코드와 동일)
        """
        clan_id = self.kwargs.get('pk')
        clan = get_object_or_404(Clan, pk=clan_id)
        serializer.save(clan=clan)