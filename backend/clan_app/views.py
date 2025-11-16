# clan_app/views.py

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from user_app.models import User
from .models import (
    Clan, ClanJoinRequest, ClanChat, 
    ClanBoard, ClanAnnouncement, ClanEvent
)
# [오류 수정] .serializers (자기 자신)에서 MemberActivitySerializer 등을 가져오도록 분리
from .serializers import (
    ClanSerializer, ClanDetailSerializer, ClanJoinRequestSerializer, 
    ClanChatSerializer, ClanBoardSerializer, ClanAnnouncementSerializer, 
    ClanEventSerializer,
    MemberActivitySerializer, RoomLatestActivitySerializer # <-- 이 2줄
)
from room_app.models import Room
# [오류 수정] room_app.serializers에서는 RoomInfoForActivitySerializer만 가져옴
from room_app.serializers import (RoomInfoForActivitySerializer) 
from .permission import IsClanOwner, IsClanOwnerOrReadOnly

# 1. Clan
# -----------------------------------------------------------------

class ClanListCreateAPIView(generics.ListCreateAPIView):
    """
    (GET) /api/v1/clans/
    (POST) /api/v1/clans/
    """
    queryset = Clan.objects.all().order_by('-created_at')
    serializer_class = ClanSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly] # 목록 조회는 누구나, 생성은 로그인 유저

    def perform_create(self, serializer):
        # 클랜 생성 시, 생성자를 owner이자 member로 자동 등록
        clan = serializer.save(owner=self.request.user)
        clan.members.add(self.request.user)

class ClanDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    (GET) /api/v1/clans/<int:pk>/
    (PATCH, DELETE) /api/v1/clans/<int:pk>/
    """
    queryset = Clan.objects.all()
    serializer_class = ClanDetailSerializer
    permission_classes = [IsClanOwnerOrReadOnly] # GET은 누구나, 수정/삭제는 방장만

# 2. Clan Join/Kick (3순위)
# -----------------------------------------------------------------

class ClanJoinRequestCreateView(APIView):
    """
    (POST) /api/v1/clans/<int:pk>/join/
    클랜 가입 신청
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        clan = get_object_or_404(Clan, pk=pk)
        user = request.user

        if clan.members.filter(id=user.id).exists():
            return Response({"detail": "이미 클랜 멤버입니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        if ClanJoinRequest.objects.filter(clan=clan, user=user, status="pending").exists():
            return Response({"detail": "이미 가입 신청 대기 중입니다."}, status=status.HTTP_400_BAD_REQUEST)

        ClanJoinRequest.objects.create(clan=clan, user=user)
        # TODO: 클랜장에게 알림
        return Response({"detail": "클랜 가입을 신청했습니다."}, status=status.HTTP_201_CREATED)


class ClanJoinRequestUpdateView(APIView):
    """
    (POST) /api/v1/clans/<int:clan_id>/requests/<int:req_id>/
    클랜 가입 승인 (approve) / 거절 (reject)
    """
    permission_classes = [IsClanOwner] # 클랜장만 가능

    def post(self, request, clan_id, req_id):
        clan = get_object_or_404(Clan, pk=clan_id)
        self.check_object_permissions(request, clan) # 클랜장인지 확인
        
        req = get_object_or_404(ClanJoinRequest, id=req_id, clan=clan, status="pending")
        
        action = request.data.get("action") # "approve" or "reject"

        if action == "approve":
            req.status = "approved"
            clan.members.add(req.user)
            # TODO: 신청자에게 '승인' 알림
            message = "가입을 승인했습니다."
        elif action == "reject":
            req.status = "rejected"
            # TODO: 신청자에게 '거절' 알림
            message = "가입을 거절했습니다."
        else:
            return Response({"detail": "잘못된 action입니다."}, status=status.HTTP_400_BAD_REQUEST)
            
        req.save()
        return Response({"detail": message}, status=status.HTTP_200_OK)


class ClanKickMemberView(APIView):
    """
    (DELETE) /api/v1/clans/<int:clan_id>/members/<str:nickname>/
    클랜 멤버 강퇴
    """
    permission_classes = [IsClanOwner] # 클랜장만 가능

    def delete(self, request, clan_id, nickname):
        clan = get_object_or_404(Clan, pk=clan_id)
        self.check_object_permissions(request, clan) # 클랜장인지 확인
        
        user_to_kick = get_object_or_404(User, nickname=nickname)

        if clan.owner == user_to_kick:
            return Response({"detail": "클랜장은 강퇴할 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)
            
        if not clan.members.filter(id=user_to_kick.id).exists():
            return Response({"detail": "클랜 멤버가 아닙니다."}, status=status.HTTP_400_BAD_REQUEST)

        clan.members.remove(user_to_kick)
        # TODO: 대상에게 '강퇴' 알림
        return Response({"detail": f"{nickname}님을 강퇴했습니다."}, status=status.HTTP_200_OK)


class ClanApproveAllView(APIView):
    """
    (POST) /api/v1/clans/<int:pk>/approve-all/
    클랜 가입 일괄 승인
    """
    permission_classes = [IsClanOwner] # 클랜장만 가능

    @transaction.atomic
    def post(self, request, pk):
        clan = get_object_or_404(Clan, pk=pk)
        self.check_object_permissions(request, clan) # 클랜장인지 확인
        
        pending_requests = ClanJoinRequest.objects.filter(clan=clan, status="pending")
        
        if not pending_requests.exists():
            return Response({"detail": "새로운 가입 신청이 없습니다."}, status=status.HTTP_400_BAD_REQUEST)
            
        users_to_add = []
        for req in pending_requests:
            req.status = "approved"
            users_to_add.append(req.user)
            # TODO: 신청자에게 '승인' 알림

        # 1. 멤버 일괄 추가
        clan.members.add(*users_to_add)
        # 2. 신청서 일괄 업데이트
        ClanJoinRequest.objects.bulk_update(pending_requests, ['status'])
        
        return Response({"detail": f"{len(users_to_add)}명의 가입을 일괄 승인했습니다."}, status=status.HTTP_200_OK)


# 3. Clan Management (3순위)
# -----------------------------------------------------------------

class ClanAnnouncementListCreateView(generics.ListCreateAPIView):
    """
    (GET, POST) /api/v1/clans/<int:clan_id>/announcements/
    클랜 공지사항
    """
    serializer_class = ClanAnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated] # 멤버만 조회/생성 가능

    def get_queryset(self):
        clan = get_object_or_404(Clan, pk=self.kwargs['clan_id'])
        if not clan.members.filter(id=self.request.user.id).exists():
             raise PermissionDenied("클랜 멤버만 조회할 수 있습니다.")
        return ClanAnnouncement.objects.filter(clan=clan).order_by('-created_at')

    def perform_create(self, serializer):
        clan = get_object_or_404(Clan, pk=self.kwargs['clan_id'])
        if clan.owner != self.request.user:
            raise PermissionDenied("공지사항은 클랜장만 작성할 수 있습니다.")
        serializer.save(clan=clan, author=self.request.user)
        # TODO: 클랜 멤버에게 알림


class ClanEventListCreateView(generics.ListCreateAPIView):
    """
    (GET, POST) /api/v1/clans/<int:clan_id>/events/
    클랜 캘린더 이벤트
    """
    serializer_class = ClanEventSerializer
    permission_classes = [permissions.IsAuthenticated] # 멤버만 조회/생성 가능

    def get_queryset(self):
        clan = get_object_or_404(Clan, pk=self.kwargs['clan_id'])
        if not clan.members.filter(id=self.request.user.id).exists():
             raise PermissionDenied("클랜 멤버만 조회할 수 있습니다.")
        
        # 쿼리 파라미터로 월별 필터링 (예: ?year=2025&month=11)
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        
        queryset = ClanEvent.objects.filter(clan=clan)
        
        if year and month:
            try:
                queryset = queryset.filter(
                    date__year=int(year),
                    date__month=int(month)
                )
            except ValueError:
                pass # 잘못된 값이면 무시
                
        return queryset.order_by('date', 'time')

    def perform_create(self, serializer):
        clan = get_object_or_404(Clan, pk=self.kwargs['clan_id'])
        if not clan.members.filter(id=self.request.user.id).exists():
            raise PermissionDenied("클랜 멤버만 이벤트를 생성할 수 있습니다.")
        serializer.save(clan=clan, creator=self.request.user)


class ClanBoardListCreateView(generics.ListCreateAPIView):
    """
    (GET, POST) /api/v1/clans/<int:clan_id>/boards/
    클랜 게시판
    """
    serializer_class = ClanBoardSerializer
    permission_classes = [permissions.IsAuthenticated] # 멤버만 조회/생성 가능

    def get_queryset(self):
        clan = get_object_or_404(Clan, pk=self.kwargs['clan_id'])
        if not clan.members.filter(id=self.request.user.id).exists():
             raise PermissionDenied("클랜 멤버만 조회할 수 있습니다.")
        return ClanBoard.objects.filter(clan=clan).order_by('-created_at')

    def perform_create(self, serializer):
        clan = get_object_or_404(Clan, pk=self.kwargs['clan_id'])
        if not clan.members.filter(id=self.request.user.id).exists():
            raise PermissionDenied("클랜 멤버만 게시글을 작성할 수 있습니다.")
        serializer.save(clan=clan, author=self.request.user)

# 4. Clan Activity
# -----------------------------------------------------------------

class ClanChatListView(generics.ListCreateAPIView):
    """
    (GET, POST) /api/v1/clans/<int:clan_id>/chat/
    클랜 채팅
    """
    serializer_class = ClanChatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        clan = get_object_or_404(Clan, pk=self.kwargs['clan_id'])
        if not clan.members.filter(id=self.request.user.id).exists():
             raise PermissionDenied("클랜 멤버만 조회할 수 있습니다.")
        return ClanChat.objects.filter(clan=clan).order_by('-timestamp')[:50] # 최신 50개

    def perform_create(self, serializer):
        clan = get_object_or_404(Clan, pk=self.kwargs['clan_id'])
        if not clan.members.filter(id=self.request.user.id).exists():
            raise PermissionDenied("클랜 멤버만 채팅을 보낼 수 있습니다.")
        serializer.save(clan=clan, sender=self.request.user)
        # TODO: (WebSocket/FCM) 클랜 멤버에게 실시간 전송


class ClanRoomListAPIView(generics.ListAPIView):
    """
    (GET) /api/v1/clans/<int:pk>/rooms/
    클랜 합주방 목록
    """
    serializer_class = RoomInfoForActivitySerializer # room_app의 시리얼라이저 사용
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        clan = get_object_or_404(Clan, pk=self.kwargs['pk'])
        if not clan.members.filter(id=self.request.user.id).exists():
             raise PermissionDenied("클랜 멤버만 조회할 수 있습니다.")
        
        # 이 클랜 ID를 가진 합주방 목록 (종료되지 않은)
        return Room.objects.filter(clan=clan, ended=False).order_by('-created_at')


class ClanMemberActivityAPIView(generics.ListAPIView):
    """
    (GET) /api/v1/clans/<int:pk>/activity/
    클랜 멤버 활동 현황
    """
    serializer_class = MemberActivitySerializer # clan_app의 시리얼라이저 사용
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        clan = get_object_or_404(Clan, pk=self.kwargs['pk'])
        if not clan.members.filter(id=self.request.user.id).exists():
             raise PermissionDenied("클랜 멤버만 조회할 수 있습니다.")
             
        # 이 클랜에 속한 멤버 목록
        return clan.members.all().order_by('nickname')


# (이하 코드는 원본 파일에 있던 테스트용 코드들입니다)
# -----------------------------------------------------------------
# (이하 코드는 JWT/Permission 테스트용 뷰입니다)
# -----------------------------------------------------------------

class TestAllView(APIView):
    """
    (GET) /api/v1/clans/test/all/
    (테스트) 누구나
    """
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        return Response({"detail": "누구나 접근 가능"})

class TestAuthView(APIView):
    """
    (GET) /api/v1/clans/test/auth/
    (테스트) 로그인한 유저만
    """
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        return Response({"detail": f"로그인한 유저({request.user.nickname})만 접근 가능"})

class TestClanOwnerView(APIView):
    """
    (GET) /api/v1/clans/1/test/owner/
    (테스트) 1번 클랜장만
    """
    permission_classes = [IsClanOwner]
    
    def get_object(self):
        # 테스트용으로 1번 클랜 객체를 하드코딩
        try:
            return Clan.objects.get(pk=1)
        except Clan.DoesNotExist:
            raise PermissionDenied("테스트용 1번 클랜이 존재하지 않습니다.")

    def get(self, request):
        clan = self.get_object()
        self.check_object_permissions(request, clan) # IsClanOwner 확인
        return Response({"detail": f"1번 클랜장({request.user.nickname})만 접근 가능"})

class TestClanMemberView(APIView):
    """
    (GET) /api/v1/clans/1/test/member/
    (테스트) 1번 클랜 멤버만 (방장 포함)
    """
    permission_classes = [permissions.IsAuthenticated] # 일단 로그인

    def get_object(self):
        try:
            return Clan.objects.get(pk=1)
        except Clan.DoesNotExist:
            raise PermissionDenied("테스트용 1번 클랜이 존재하지 않습니다.")

    def get(self, request):
        clan = self.get_object()
        
        # 멤버인지 수동 확인
        if not clan.members.filter(id=request.user.id).exists():
            raise PermissionDenied(f"({request.user.nickname})님은 1번 클랜 멤버가 아닙니다.")
            
        return Response({"detail": f"1번 클랜 멤버({request.user.nickname})만 접근 가능"})