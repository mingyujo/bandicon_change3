# clan_app/views.py

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction

from rest_framework import generics, permissions, viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response

from user_app.models import Alert
from user_app.models import User
from .models import (
    Clan, ClanJoinRequest, ClanChat, 
    ClanBoard, ClanAnnouncement, ClanEvent
)
from django.contrib.auth import get_user_model
# [오류 수정] .serializers (자기 자신)에서 MemberActivitySerializer 등을 가져오도록 분리
from .serializers import (
    ClanSerializer, ClanDetailSerializer, ClanJoinRequestSerializer, 
    ClanChatSerializer, ClanBoardSerializer, ClanAnnouncementSerializer, 
    ClanEventSerializer, ClanMemberSerializer,
    MemberActivitySerializer, RoomLatestActivitySerializer # <-- 이 2줄
)
from room_app.models import Room, Session
# [오류 수정] room_app.serializers에서는 RoomInfoForActivitySerializer만 가져옴
from room_app.serializers import (RoomInfoForActivitySerializer, RoomListSerializer) 
from .permission import IsClanOwner, IsClanOwnerOrReadOnly, IsClanMember, IsClanOwnerOrAdmin

# 1. Clan
# -----------------------------------------------------------------
User = get_user_model()
class ClanListCreateAPIView(generics.ListCreateAPIView):
    """
    (GET) /api/v1/clans/
    (POST) /api/v1/clans/
    """
    # queryset = Clan.objects.all().order_by('-created_at') # [수정] 아래 get_queryset으로 대체
    serializer_class = ClanSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly] # 목록 조회는 누구나, 생성은 로그인 유저

    def get_queryset(self):
        from django.db.models import Q
        user = self.request.user
        
        # 1. 비로그인 유저: 활성 클랜만
        if not user.is_authenticated:
            return Clan.objects.filter(status='active').order_by('-created_at')
            
        # 2. 운영자: 모든 클랜 (대기 포함)
        if hasattr(user, 'role') and user.role == 'OPERATOR':
            return Clan.objects.all().order_by('-created_at')
            
        # 3. 일반 유저: 활성 클랜 + 내가 만든 클랜(대기중 포함)
        return Clan.objects.filter(
            Q(status='active') | Q(owner=user)
        ).distinct().order_by('-created_at')

    def perform_create(self, serializer):
        # 1. 클랜 생성 (status='pending'은 모델 디폴트)
        clan = serializer.save(owner=self.request.user)
        # 생성자를 아직 멤버로 추가하지 않음 (승인 시 추가)
        
        # 2. 운영자들에게 알림 전송
        try:
            operators = User.objects.filter(role='OPERATOR')
            alerts = []
            for op in operators:
                alerts.append(Alert(
                    user=op,
                    message=f"'{self.request.user.nickname}'님이 '{clan.name}' 클랜 생성을 요청했습니다.",
                    link_url="/admin/clans/pending/" # 프론트엔드 운영자 페이지 URL (예시)
                ))
            if alerts:
                Alert.objects.bulk_create(alerts)
        except Exception as e:
            print(f"Error sending alerts to operators: {e}")

class ClanDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    (GET) /api/v1/clans/<int:pk>/
    (PATCH, DELETE) /api/v1/clans/<int:pk>/
    """
    queryset = Clan.objects.all()
    serializer_class = ClanDetailSerializer
    permission_classes = [IsClanOwnerOrReadOnly] # GET은 누구나, 수정/삭제는 방장만

# 1.5. Clan Management (Operator Only)
# -----------------------------------------------------------------
class ClanManagementView(APIView):
    """
    (GET) /api/v1/clans/manage/pending/
    (POST) /api/v1/clans/manage/<int:pk>/approve/
    (POST) /api/v1/clans/manage/<int:pk>/reject/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        # 운영자만 접근 가능
        if not self.request.user.role == 'OPERATOR':
             # DRF permission class가 아니라 view 레벨에서 체크하거나 커스텀 permission을 만들어야 함
             # 여기서는 간단히 로직 내에서 처리하거나, Custom Permission을 만드는게 좋음.
             pass 
        return super().get_permissions()

    def get(self, request):
        if request.user.role != 'OPERATOR':
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        pending_clans = Clan.objects.filter(status='pending').order_by('created_at')
        serializer = ClanSerializer(pending_clans, many=True)
        return Response(serializer.data)

class ClanApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'OPERATOR':
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        clan = get_object_or_404(Clan, pk=pk)
        if clan.status != 'pending':
            return Response({"detail": "대기 중인 클랜이 아닙니다."}, status=status.HTTP_400_BAD_REQUEST)
            
        clan.status = 'active'
        # 승인 시, 만드는 사람(owner)을 멤버로 추가
        clan.members.add(clan.owner)
        clan.save()
        
        # 알림 전송
        try:
            Alert.objects.create(
                user=clan.owner,
                message=f"클랜 '{clan.name}' 생성이 승인되었습니다.",
                link_url=f"/clans/{clan.id}/"
            )
        except Exception:
            pass
            
        return Response({"detail": "클랜이 승인되었습니다."}, status=status.HTTP_200_OK)

class ClanRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'OPERATOR':
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        clan = get_object_or_404(Clan, pk=pk)
        clan.status = 'rejected'
        clan.save()
        
        # 알림 전송
        try:
            Alert.objects.create(
                user=clan.owner,
                message=f"클랜 '{clan.name}' 생성이 거절되었습니다.",
            )
        except Exception:
            pass
            
        return Response({"detail": "클랜이 거절되었습니다."}, status=status.HTTP_200_OK)


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
        # ▼▼▼ [수정] TODO를 알림 생성 코드로 변경 ▼▼▼
        try:
            Alert.objects.create(
                user=clan.owner, # 클랜장에게
                message=f"'{user.nickname}'님이 '{clan.name}' 클랜 가입을 신청했습니다.",
                link_url=f"/clans/{clan.id}/" # 클릭 시 클랜 상세 페이지로 이동
            )
        except Exception as e:
            # 알림 실패가 가입 신청을 막으면 안 됨
            print(f"Error creating alert for clan owner {clan.owner.id}: {e}")
        # ▲▲▲ [수정] ▲▲▲

        
        
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
            # ▼▼▼ [수정] 'TODO'를 'Alert' 생성 코드로 변경 ▼▼▼
            try:
                Alert.objects.create(
                    user=req.user, # 'instance' 대신 'req' 변수 사용
                    message=f"'{clan.name}' 클랜 가입이 승인되었습니다!",
                    link_url=f"/clans/{clan.id}/"
                )
            except Exception as e:
                print(f"Error creating alert for user {req.user.id}: {e}") 
            # ▲▲▲ [수정] ▲▲▲
            message = "가입을 승인했습니다."
        elif action == "reject":
            req.status = "rejected"
            # ▼▼▼ [추가] 가입 거절 알림 ▼▼▼
            try:
                Alert.objects.create(
                    user=req.user,
                    message=f"'{clan.name}' 클랜 가입이 거절되었습니다."
                    # (거절은 link_url이 불필요할 수 있음)
                )
            except Exception as e:
                print(f"Error creating alert for user {req.user.id}: {e}")
            # ▲▲▲ [추가] ▲▲▲
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
                # ▼▼▼ [추가] 강퇴 알림 ▼▼▼
        try:
            Alert.objects.create(
                user=user_to_kick,
                message=f"'{clan.name}' 클랜에서 강퇴되었습니다."
            )
        except Exception as e:
            print(f"Error creating alert for user {user_to_kick.id}: {e}")
        # ▲▲▲ [추가] ▲▲▲
        return Response({"detail": f"{nickname}님을 강퇴했습니다."}, status=status.HTTP_200_OK)

class ClanPromoteMemberView(APIView):
    """
    (POST) /api/v1/clans/<int:clan_id>/members/<int:user_id>/promote/
    멤버 -> 간부 승급
    """
    permission_classes = [IsClanOwner]

    def post(self, request, clan_id, user_id):
        clan = get_object_or_404(Clan, pk=clan_id)
        self.check_object_permissions(request, clan)
        
        user = get_object_or_404(User, pk=user_id)
        
        if not clan.members.filter(id=user.id).exists():
            return Response({"detail": "클랜 멤버가 아닙니다."}, status=status.HTTP_400_BAD_REQUEST)
            
        if clan.admins.filter(id=user.id).exists():
             return Response({"detail": "이미 간부(운영진)입니다."}, status=status.HTTP_400_BAD_REQUEST)
             
        clan.admins.add(user)
        return Response({"detail": f"{user.nickname}님을 운영진으로 임명했습니다."}, status=status.HTTP_200_OK)

class ClanDemoteMemberView(APIView):
    """
    (POST) /api/v1/clans/<int:clan_id>/members/<int:user_id>/demote/
    간부 -> 멤버 강등
    """
    permission_classes = [IsClanOwner]

    def post(self, request, clan_id, user_id):
        clan = get_object_or_404(Clan, pk=clan_id)
        self.check_object_permissions(request, clan)
        
        user = get_object_or_404(User, pk=user_id)
        
        if not clan.admins.filter(id=user.id).exists():
             return Response({"detail": "운영진이 아닙니다."}, status=status.HTTP_400_BAD_REQUEST)
             
        clan.admins.remove(user)
        return Response({"detail": f"{user.nickname}님의 운영진 권한을 해제했습니다."}, status=status.HTTP_200_OK)


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
        alerts_to_create = [] # [추가] 알림 목록 준비

        for req in pending_requests:
            req.status = "approved"
            users_to_add.append(req.user)
             # ▼▼▼ [수정] 'TODO'를 'Alert' 생성 코드로 변경 (bulk create 준비) ▼▼▼
            alerts_to_create.append(
                Alert(
                    user=req.user,
                    message=f"'{clan.name}' 클랜 가입이 승인되었습니다!",
                    link_url=f"/clans/{clan.id}/"
                )
            )
            # ▲▲▲ [수정] ▲▲▲

        # 1. 멤버 일괄 추가
        clan.members.add(*users_to_add)
        # 2. 신청서 일괄 업데이트
        ClanJoinRequest.objects.bulk_update(pending_requests, ['status'])
         # ▼▼▼ [추가] 알림 일괄 생성 (DB 효율성) ▼▼▼
        try:
            Alert.objects.bulk_create(alerts_to_create)
        except Exception as e:
            print(f"Error bulk creating alerts: {e}")
        # ▲▲▲ [추가] ▲▲▲

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
        # ▼▼▼ [수정] TODO를 '새 공지' 알림 코드로 변경 ▼▼▼
        try:
            clan_members = clan.members.exclude(id=self.request.user.id) # 작성자 제외
            alerts_to_create = []
            for member in clan_members:
                alerts_to_create.append(
                    Alert(
                        user=member,
                        message=f"'{clan.name}' 클랜에 새 공지사항이 등록되었습니다.",
                        link_url=f"/clans/{clan.id}/"
                    )
                )
            Alert.objects.bulk_create(alerts_to_create)
        except Exception as e:
            print(f"Error creating announcement alerts: {e}")
        # ▲▲▲ [수정] ▲▲▲


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


# ▼▼▼ ClanRoomListAPIView 전체 교체 ▼▼▼
class ClanRoomListAPIView(generics.ListCreateAPIView): # [수정] ListCreateAPIView로 변경
    """
    (GET) /api/v1/clans/<int:pk>/rooms/
    (POST) /api/v1/clans/<int:pk>/rooms/
    클랜 합주방 목록 조회 및 생성
    """
    serializer_class = RoomListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # 1. 클랜 멤버인지 확인
        clan = get_object_or_404(Clan, pk=self.kwargs['pk'])
        if not clan.members.filter(id=self.request.user.id).exists():
             raise PermissionDenied("클랜 멤버만 조회할 수 있습니다.")
        
        # 2. 정렬 및 필터링
        sort_by = self.request.query_params.get('sort', 'latest')
        queryset = Room.objects.filter(clan=clan, ended=False)
        
        if sort_by == 'oldest':
            return queryset.order_by('created_at')
        
        return queryset.order_by('-created_at')

    # [복구] 생성 로직 (POST 요청 처리)
    def create(self, request, *args, **kwargs):
        clan = get_object_or_404(Clan, pk=self.kwargs['pk'])
        
        # 멤버 확인
        if not clan.members.filter(id=request.user.id).exists():
            raise PermissionDenied("클랜 멤버만 방을 생성할 수 있습니다.")

        sessions_data = request.data.get("sessions", [])
        if not sessions_data:
            return Response({"detail": "세션 정보가 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

        # request.data는 수정 불가능할 수 있으므로 복사
        room_data = request.data.copy()
        room_data.pop('sessions', None) # 세션 데이터 분리
# ▼▼▼ [핵심 수정] 검증 전에 방장 닉네임을 강제로 주입합니다! ▼▼▼
        room_data['manager_nickname'] = request.user.nickname
        # ▲▲▲ [수정 완료] ▲▲▲

        # 시리얼라이저 검증
        room_serializer = self.get_serializer(data=room_data)
        room_serializer.is_valid(raise_exception=True)

        # [핵심] 방 저장 시 Clan 정보와 방장 정보를 함께 저장
        db_room = room_serializer.save(
            manager_nickname=request.user.nickname,
            clan=clan  # <-- 이 부분이 있어야 클랜 방이 됩니다!
        )

        # 세션 생성
        session_instances = []
        for session_name in sessions_data:
            session_instances.append(Session(room=db_room, session_name=session_name))
        Session.objects.bulk_create(session_instances)

        # 방장 자동 참가
        try:
            manager_session = Session.objects.filter(room=db_room).first()
            if manager_session:
                manager_session.participant_nickname = request.user.nickname
                manager_session.save()
        except Session.DoesNotExist:
            pass

        response_serializer = self.get_serializer(db_room)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)# (이하 코드는 원본 파일에 있던 테스트용 코드들입니다)
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
    
User = get_user_model()

# (기존 ClanViewSet, ClanJoinRequestListView, ClanJoinRequestUpdateView, ClanKickMemberView, ClanApproveAllView 코드... )
# ... (이전 코드와 동일) ...

class ClanViewSet(viewsets.ModelViewSet):
    queryset = Clan.objects.all()
    serializer_class = ClanSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly] # 목록(GET)은 누구나, 생성(POST)은 로그인한 사람만

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ClanDetailSerializer
        return ClanSerializer

    def perform_create(self, serializer):
         # 1. 클랜을 저장하고, 소유자를 request.user로 설정합니다.
        clan_instance = serializer.save(owner=self.request.user)
        
        # 2. [중요] 생성한 사람(owner)을 'members' 목록에 자동으로 추가합니다.
        clan_instance.members.add(self.request.user)
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def join_request(self, request, pk=None):
        clan = self.get_object()
        user = request.user

        if user in clan.members.all():
            return Response({'detail': '이미 클랜 멤버입니다.'}, status=status.HTTP_400_BAD_REQUEST)

        if ClanJoinRequest.objects.filter(clan=clan, user=user, status='pending').exists():
            return Response({'detail': '이미 가입 요청을 보냈습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        ClanJoinRequest.objects.create(clan=clan, user=user)
        return Response({'detail': '클랜 가입 요청을 보냈습니다.'}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated, IsClanMember])
    def members(self, request, pk=None):
        clan = self.get_object()
        members = clan.members.all()
        serializer = ClanMemberSerializer(members, many=True, context={'clan': clan})
        return Response(serializer.data)


class ClanJoinRequestListView(generics.ListAPIView):
    serializer_class = ClanJoinRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsClanOwnerOrAdmin]

    def get_queryset(self):
        clan_id = self.kwargs.get('clan_id')
        return ClanJoinRequest.objects.filter(clan_id=clan_id, status='pending')


class ClanJoinRequestUpdateView(generics.UpdateAPIView):
    queryset = ClanJoinRequest.objects.all()
    serializer_class = ClanJoinRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsClanOwnerOrAdmin]
    lookup_field = 'id'

    def get_object(self):
        obj = super().get_object()
        # URL의 clan_id와 요청 대상의 clan_id가 일치하는지,
        # 그리고 요청자가 해당 클랜의 관리자인지 확인
        clan_id = self.kwargs.get('clan_id')
        if obj.clan.id != clan_id:
            raise PermissionError("URL과 요청 대상의 클랜이 일치하지 않습니다.")
        
        # IsClanOwnerOrAdmin 권한이 이미 view 레벨에서 체크되지만, 
        # get_object 레벨에서 한 번 더 확인 (혹은 permission 클래스가 object-level-permission을 쓰도록 수정)
        # 여기서는 permission_classes에 설정된 IsClanOwnerOrAdmin가
        # view.kwargs.get('clan_id')를 사용하므로 object-level 체크가 아니어도 됨.
        
        return obj

    def update(self, request, *args, **kwargs):
        join_request = self.get_object()
        action = request.data.get('action') # 'approve' or 'reject'

        if action == 'approve':
            join_request.status = 'approved'
            join_request.clan.members.add(join_request.user)
            join_request.clan.save()
            join_request.save()
            return Response({'detail': '가입이 승인되었습니다.'}, status=status.HTTP_200_OK)
        elif action == 'reject':
            join_request.status = 'rejected'
            join_request.save()
            return Response({'detail': '가입이 거절되었습니다.'}, status=status.HTTP_200_OK)
        
        return Response({'detail': '잘못된 요청입니다. (action: "approve" or "reject")'}, status=status.HTTP_400_BAD_REQUEST)


class ClanKickMemberView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsClanOwnerOrAdmin]

    def post(self, request, clan_id, user_id):
        clan = get_object_or_404(Clan, id=clan_id)
        user_to_kick = get_object_or_404(User, id=user_id)

        # IsClanOwnerOrAdmin이 clan_id를 기준으로 이미 검사함
        
        if user_to_kick == clan.owner:
            return Response({'detail': '클랜 소유자는 강퇴할 수 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if user_to_kick not in clan.members.all():
            return Response({'detail': '클랜 멤버가 아닙니다.'}, status=status.HTTP_400_BAD_REQUEST)

        if user_to_kick in clan.admins.all():
            clan.admins.remove(user_to_kick) # 관리자 목록에서도 제거
            
        clan.members.remove(user_to_kick) # 멤버 목록에서 제거
        clan.save()

        return Response({'detail': f'{user_to_kick.nickname} 님이 강퇴되었습니다.'}, status=status.HTTP_200_OK)


class ClanApproveAllView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsClanOwnerOrAdmin]

    def post(self, request, clan_id):
        clan = get_object_or_404(Clan, id=clan_id)
        
        # IsClanOwnerOrAdmin이 clan_id를 기준으로 이미 검사함
        
        pending_requests = ClanJoinRequest.objects.filter(clan=clan, status='pending')
        
        if not pending_requests.exists():
            return Response({'detail': '승인 대기 중인 요청이 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        approved_count = 0
        for req in pending_requests:
            req.status = 'approved'
            req.clan.members.add(req.user)
            req.save()
            approved_count += 1

        clan.save()
        
        return Response({'detail': f'총 {approved_count}건의 가입 요청이 일괄 승인되었습니다.'}, status=status.HTTP_200_OK)


# --- 3순위 (마무리): 클랜 내부 기능 ---

class ClanAnnouncementCreateView(generics.CreateAPIView):
    """
    클랜 공지사항 생성 뷰
    - IsClanOwnerOrAdmin 권한: 클랜 소유자 또는 관리자만 작성 가능
    - URL (clan_id) / Request (user) 로부터 clan, author 자동 주입
    """
    queryset = ClanAnnouncement.objects.all()
    serializer_class = ClanAnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated, IsClanOwnerOrAdmin]

    def perform_create(self, serializer):
        # URL kwargs에서 clan_id를 가져옵니다.
        clan_id = self.kwargs.get('clan_id')
        clan = get_object_or_404(Clan, id=clan_id)
        
        # author는 요청한 유저로, clan은 URL의 클랜으로 자동 설정합니다.
        serializer.save(author=self.request.user, clan=clan)

class ClanBoardListCreateView(generics.ListCreateAPIView):
    """
    클랜 전용 게시판 목록(GET) 및 생성(POST) 뷰
    - GET (목록): IsClanMember (클랜 멤버)
    - POST (생성): IsClanOwnerOrAdmin (클랜 관리자/소유자)
    """
    serializer_class = ClanBoardSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            # 프론트엔드(ClanDetail.js)가 isOwner(isClanAdmin)일 때만 폼을 보여주므로
            return [permissions.IsAuthenticated(), IsClanOwnerOrAdmin()]
        # 조회(GET)는 클랜 멤버
        return [permissions.IsAuthenticated(), IsClanMember()]

    def get_queryset(self):
        clan_id = self.kwargs.get('clan_id')
        # ClanBoard 모델(게시글)을 최신순으로 정렬
        return ClanBoard.objects.filter(clan_id=clan_id).order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """
        [중요] 프론트엔드-백엔드 불일치 해결
        프론트엔드(ClanDetail.js)는 { name: "게시판이름" } 을 보냅니다.
        백엔드(ClanBoard 모델)는 { title: "..." } 필드를 가집니다.
        'name'을 'title'로 변환하여 저장합니다.
        """
        data = request.data.copy()
        if 'name' in data and 'title' not in data:
            data['title'] = data['name']
        
        # 'content'는 모델에서 (null=True, blank=True)이므로 필수가 아님
        # 'category'는 모델에서 (default='free')이므로 필수가 아님

        # 수정된 data로 시리얼라이저 생성
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # perform_create를 호출 (clan, author 주입)
        self.perform_create(serializer) 
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        clan_id = self.kwargs.get('clan_id')
        clan = get_object_or_404(Clan, id=clan_id)

        # ▼▼▼ [추가] 클랜 멤버에게 알림 (비동기 추천) ▼▼▼
        try:
            clan_members = clan.members.exclude(id=self.request.user.id) # 작성자 제외
            alerts_to_create = []
            for member in clan_members:
                alerts_to_create.append(
                    Alert(
                        user=member,
                        message=f"'{clan.name}' 클랜에 새 공지사항이 등록되었습니다.",
                        link_url=f"/clans/{clan.id}/"
                    )
                )
            Alert.objects.bulk_create(alerts_to_create)
        except Exception as e:
            print(f"Error creating announcement alerts: {e}")
        # ▲▲▲ [추가] ▲▲▲

        
        # 'author'를 request.user로, 'clan'을 URL의 clan_id로 설정
        serializer.save(author=self.request.user, clan=clan)
# ▲▲▲ [신규 추가] ▲▲▲
        
class ClanEventListCreateView(generics.ListCreateAPIView):
    """
    클랜 캘린더 이벤트 목록(GET) 및 생성(POST) 뷰
    - GET (목록): IsClanMember (클랜 멤버)
    - POST (생성): IsClanOwnerOrAdmin (클랜 관리자/소유자)
    """
    serializer_class = ClanEventSerializer

    def get_permissions(self):
        # [중요] 요청 메서드(GET/POST)에 따라 다른 권한 적용
        if self.request.method == 'POST':
            # 생성(POST)은 관리자만
            return [permissions.IsAuthenticated(), IsClanOwnerOrAdmin()]
        # 조회(GET)는 클랜 멤버
        return [permissions.IsAuthenticated(), IsClanMember()]

    def get_queryset(self):
        # URL에서 clan_id를 가져와 해당 클랜의 이벤트만 필터링
        clan_id = self.kwargs.get('clan_id')
        return ClanEvent.objects.filter(clan_id=clan_id).order_by('date', 'time')

    def perform_create(self, serializer):
        # 생성 시, URL의 clan_id와 요청 유저(creator)를 자동으로 주입
        clan_id = self.kwargs.get('clan_id')
        clan = get_object_or_404(Clan, id=clan_id)
        serializer.save(creator=self.request.user, clan=clan)
# ▼▼▼ [복구] 파일 맨 아래에 다시 추가해주세요! ▼▼▼
class ClanRoomDashboardView(APIView):
    """
    (GET) /api/v1/clans/<int:pk>/dashboard/
    클랜 합주방 대시보드 (룸 리스트 + 세션 상세 정보 반환)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        clan = get_object_or_404(Clan, pk=pk)
        
        # 멤버 확인
        if not clan.members.filter(id=request.user.id).exists():
             return Response({"detail": "클랜 멤버만 접근할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)
        
        # 해당 클랜의 진행 중인 방 목록
        rooms = Room.objects.filter(clan=clan, ended=False).order_by('-created_at')
        
        # RoomListSerializer를 사용하면 sessions 정보가 포함됩니다.
        serializer = RoomListSerializer(rooms, many=True)
        
        return Response({
            "clan_name": clan.name,
            "rooms": serializer.data
        })
    
# ▼▼▼ [복구] 파일 맨 아래에 다시 추가해주세요! ▼▼▼
class ClanMemberActivityAPIView(generics.ListAPIView):
    serializer_class = MemberActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        clan = get_object_or_404(Clan, pk=self.kwargs['pk'])
        if not clan.members.filter(id=self.request.user.id).exists():
             raise PermissionDenied("클랜 멤버만 조회할 수 있습니다.")
        return clan.members.all().order_by('nickname')
    
# ▼▼▼ [복구] 파일 맨 아래에 이 코드를 추가해주세요! ▼▼▼
class ClanMemberActivityAPIView(generics.ListAPIView):
    """
    (GET) /api/v1/clans/<int:pk>/activity/
    클랜 멤버 활동 현황 조회
    """
    serializer_class = MemberActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        clan = get_object_or_404(Clan, pk=self.kwargs['pk'])
        
        # 멤버인지 확인
        if not clan.members.filter(id=self.request.user.id).exists():
             raise PermissionDenied("클랜 멤버만 조회할 수 있습니다.")
             
        # 닉네임 순으로 정렬하여 반환
        return clan.members.all().order_by('nickname')