# room_app/views.py

from django.shortcuts import get_object_or_404, get_list_or_404
from django.db.models import Count, Q
from django.utils import timezone
from django.db import transaction 

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound

from user_app.models import User
# [오류 수정] 'user_app.utils' 임포트 라인 제거
from user_app.serializers import UserBaseSerializer
from .models import (
    Room, Session, SessionReservation, Evaluation, GroupChat, RoomAvailabilitySlot
)
from .serializers import (
    RoomListSerializer, RoomDetailSerializer, 
    SessionSerializer, SessionReservationSerializer,
    EvaluationSerializer, GroupChatSerializer,
    ReserveSessionSerializer, RoomAvailabilitySlotSerializer,
    MyRoomListSerializer 
)
from clan_app.models import Clan 

# 1. Room
# -----------------------------------------------------------------

class RoomListCreateAPIView(generics.ListCreateAPIView):
    """
    (GET) /api/v1/rooms/
    (POST) /api/v1/rooms/
    """
    queryset = Room.objects.filter(confirmed=False, ended=False, clan__isnull=True).order_by('-created_at')
    serializer_class = RoomListSerializer
    
    # [수정] 방 생성은 로그인한 사용자만
    permission_classes = [permissions.IsAuthenticatedOrReadOnly] 

    def create(self, request, *args, **kwargs):
        user = request.user
        if not user or not user.is_authenticated:
            return Response({"detail": "사용자 정보를 찾을 수 없습니다."}, 
                           status=status.HTTP_401_UNAUTHORIZED)

        sessions_data = request.data.get("sessions", [])
        if not sessions_data:
            return Response({"detail": "세션 정보가 없습니다."}, 
                           status=status.HTTP_400_BAD_REQUEST)

        # ✅ request.data를 복사하고 sessions를 제거
        room_data = request.data.copy()
        room_data.pop('sessions', None)

        # ✅ manager_nickname을 validation 전에 추가
        room_data['manager_nickname'] = user.nickname

        # 1. 방 생성
        room_serializer = self.get_serializer(data=room_data)
        room_serializer.is_valid(raise_exception=True)

        # ✅ save()에서 manager_nickname 제거 (이미 포함됨)
        db_room = room_serializer.save()

        # 2. 세션 생성
        session_instances = []
        for session_name in sessions_data:
            session_instances.append(Session(room=db_room, session_name=session_name))
        Session.objects.bulk_create(session_instances)

        # 3. 방장 자동 참가
        try:
            manager_session = Session.objects.filter(room=db_room).first()
            if manager_session:
                manager_session.participant_nickname = user.nickname
                manager_session.save()
        except Session.DoesNotExist:
            pass

        # 응답 데이터 생성
        response_serializer = self.get_serializer(db_room)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class MyRoomListView(generics.ListAPIView):
    """
    (GET) /api/v1/rooms/my/
    """
    serializer_class = MyRoomListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # 내가 매니저이거나, 내가 세션에 참여 중인 방
        return Room.objects.filter(
            Q(manager_nickname=user.nickname) | 
            Q(sessions__participant_nickname=user.nickname),
            ended=False # 끝나지 않은 방
        ).distinct().order_by('-created_at')


class RoomDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    (GET) /api/v1/rooms/<int:pk>/
    (PATCH) /api/v1/rooms/<int:pk>/
    (DELETE) /api/v1/rooms/<int:pk>/
    """
    queryset = Room.objects.all()
    serializer_class = RoomDetailSerializer
    permission_classes = [permissions.IsAuthenticated] # 방 입장은 로그인 필수

    # (PATCH) 방장이 방 정보 수정 (제목, 설명 등)
    def update(self, request, *args, **kwargs):
        room = self.get_object()
        if room.manager_nickname != request.user.nickname:
            raise PermissionDenied("방 정보는 방장만 수정할 수 있습니다.")
        return super().update(request, *args, **kwargs)

    # (DELETE) 방장이 방 삭제
    def destroy(self, request, *args, **kwargs):
        room = self.get_object()
        if room.manager_nickname != request.user.nickname:
            raise PermissionDenied("방 삭제는 방장만 가능합니다.")
        return super().destroy(request, *args, **kwargs)

# 2. Session
# -----------------------------------------------------------------

class RoomSessionJoinView(APIView):
    """
    (POST) /api/v1/rooms/<int:room_id>/sessions/<int:session_id>/join/
    세션 참여, 취소, 변경을 모두 처리
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic # [추가] 세션 변경 로직을 트랜잭션으로 묶음
    def post(self, request, room_id, session_id):
        try:
            # 1. Get the session the user clicked on
            selected_session = Session.objects.select_for_update().get(id=session_id, room_id=room_id)
            user = request.user

            # 2. Check if the user is already participating in THIS session (Cancel case)
            if selected_session.participant_nickname == user.nickname:
                selected_session.participant_nickname = None
                selected_session.save()
                return Response({"detail": "세션 참여가 취소되었습니다."}, status=status.HTTP_200_OK)

            # Case 2: User clicked a session that is already full
            if selected_session.participant_nickname is not None:
                return Response({"detail": "해당 세션은 이미 참여 중인 사용자가 있습니다."}, status=status.HTTP_400_BAD_REQUEST)

            # Case 3: User clicked a new, empty session (Join)
            # (Old logic removed: do not force leave other sessions)
                
            # Now, join the new session
            selected_session.participant_nickname = user.nickname
            selected_session.save()
            
            return Response({"detail": "세션에 참여했습니다."}, status=status.HTTP_200_OK)

        except Session.DoesNotExist:
            return Response({"detail": "세션을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RoomLeaveView(APIView):
    """
    (POST) /api/v1/rooms/<int:pk>/leave/
    방 나가기 (방장 X)
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        room = get_object_or_404(Room, pk=pk)
        user = request.user

        if room.manager_nickname == user.nickname:
            return Response({"detail": "방장은 방을 나갈 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

        # 이 방에서 사용자의 세션 참여를 취소
        Session.objects.filter(
            room=room, 
            participant_nickname=user.nickname
        ).update(participant_nickname=None)
        
        return Response({"detail": "방에서 나갔습니다."}, status=status.HTTP_200_OK)

class RoomKickView(APIView):
    """
    (POST) /api/v1/rooms/<int:pk>/kick/
    방장이 멤버 강퇴
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        room = get_object_or_404(Room, pk=pk)
        target_nickname = request.data.get('nickname')

        if room.manager_nickname != request.user.nickname:
            raise PermissionDenied("강퇴는 방장만 가능합니다.")
            
        if room.manager_nickname == target_nickname:
            return Response({"detail": "방장을 강퇴할 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

        # 이 방에서 대상의 세션 참여를 취소
        kicked_count = Session.objects.filter(
            room=room, 
            participant_nickname=target_nickname
        ).update(participant_nickname=None)

        if kicked_count > 0:
            return Response({"detail": f"{target_nickname}님을 강퇴했습니다."}, status=status.HTTP_200_OK)
        else:
            return Response({"detail": "강퇴할 멤버가 방에 없습니다."}, status=status.HTTP_400_BAD_REQUEST)


class RoomConfirmView(APIView):
    """
    (POST) /api/v1/rooms/<int:pk>/confirm/
    방장이 합주 확정
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        room = get_object_or_404(Room, pk=pk)
        
        if room.manager_nickname != request.user.nickname:
            raise PermissionDenied("합주 확정은 방장만 가능합니다.")
            
        if room.confirmed:
            return Response({"detail": "이미 확정된 방입니다."}, status=status.HTTP_400_BAD_REQUEST)

        # [추가] 모든 세션이 꽉 찼는지 확인
        # participant_nickname이 None이거나 빈 문자열인 세션이 하나라도 있으면 확정 불가
        unfilled_sessions = room.sessions.filter(Q(participant_nickname__isnull=True) | Q(participant_nickname=""))
        if unfilled_sessions.exists():
             return Response({"detail": "모든 세션의 인원이 다 차야 확정할 수 있습니다."}, status=status.HTTP_400_BAD_REQUEST)

        room.confirmed = True
        room.confirmed_at = timezone.now()
        room.save()
        
        # TODO: 참여자들에게 알림 생성
        
        return Response({"detail": "합주가 확정되었습니다."}, status=status.HTTP_200_OK)


class RoomEndView(APIView):
    """
    (POST) /api/v1/rooms/<int:pk>/end/
    방장이 합주 종료
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        room = get_object_or_404(Room, pk=pk)
        
        if room.manager_nickname != request.user.nickname:
            raise PermissionDenied("합주 종료는 방장만 가능합니다.")
            
        if not room.confirmed:
            return Response({"detail": "확정되지 않은 방은 종료할 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)
            
        if room.ended:
            return Response({"detail": "이미 종료된 방입니다."}, status=status.HTTP_400_BAD_REQUEST)

        room.ended = True
        room.ended_at = timezone.now()
        room.save()
        
        # TODO: 평가 알림 생성
        
        return Response({"detail": "합주가 종료되었습니다."}, status=status.HTTP_200_OK)

# 3. Evaluation
# -----------------------------------------------------------------

class MannerEvaluationAPIView(APIView):
    """
    (POST) /api/v1/rooms/<int:pk>/evaluate/
    매너 평가 제출
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        room = get_object_or_404(Room, pk=pk)
        evaluator = request.user
        evaluations_data = request.data.get('evaluations', []) # [{"target_nickname": "...", "score": 50, ...}]

        if not room.ended:
            return Response({"detail": "종료된 합주방만 평가할 수 있습니다."}, status=status.HTTP_400_BAD_REQUEST)

        # TODO: 사용자가 이 방에 참여했었는지 확인
        
        # 이미 평가를 제출했는지 확인
        if Evaluation.objects.filter(room=room, evaluator=evaluator).exists():
            return Response({"detail": "이미 이 방의 평가를 제출했습니다."}, status=status.HTTP_400_BAD_REQUEST)

        evaluations_to_create = []
        for data in evaluations_data:
            try:
                target_user = User.objects.get(nickname=data.get("target_nickname"))
                
                # 자기 자신은 평가 X
                if evaluator == target_user:
                    continue 
                    
                evaluations_to_create.append(
                    Evaluation(
                        room=room,
                        evaluator=evaluator,
                        target=target_user,
                        score=data.get("score", 50),
                        comment=data.get("comment", ""),
                        is_mood_maker=data.get("is_mood_maker", False)
                    )
                )
            except User.DoesNotExist:
                continue # 없는 유저는 스킵

        Evaluation.objects.bulk_create(evaluations_to_create)
        
        # TODO: 평가 완료 알림의 is_read = True 처리
        
        return Response({"detail": "평가가 제출되었습니다."}, status=status.HTTP_201_CREATED)

# 4. Chat
# -----------------------------------------------------------------

class GroupChatView(generics.ListCreateAPIView):
    """
    (GET) /api/v1/rooms/<int:room_id>/chat/
    (POST) /api/v1/rooms/<int:room_id>/chat/
    """
    serializer_class = GroupChatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        room_id = self.kwargs.get('room_id')
        # TODO: 사용자가 이 방에 참여했는지 확인
        return GroupChat.objects.filter(room_id=room_id).order_by('timestamp')

    def perform_create(self, serializer):
        room_id = self.kwargs.get('room_id')
        room = get_object_or_404(Room, id=room_id)
        # TODO: 사용자가 이 방에 참여했는지 확인
        
        # [수정] sender를 request.user.nickname으로
        serializer.save(room=room, sender=self.request.user.nickname) 
        
        # TODO: 채팅 알림 생성 (방에 있으면서, 내가 아닌 사람에게)

# 5. 2순위 기능 (예약, 일정)
# -----------------------------------------------------------------

class ReserveSessionView(APIView):
    """
    (POST) /api/v1/rooms/sessions/<int:session_id>/reserve/
    세션 예약
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(Session, id=session_id)
        user = request.user

        # [수정됨] 방장 또는 참여자 제한 로직 삭제함
        # 이제 방장이나 이미 참여 중인 멤버도 예약을 신청할 수 있습니다.

        # 이미 예약한 경우 (중복 예약은 여전히 방지)
        if SessionReservation.objects.filter(session=session, user=user).exists():
            return Response({"detail": "이미 예약한 세션입니다."}, status=status.HTTP_400_BAD_REQUEST)

        SessionReservation.objects.create(session=session, user=user)
        return Response({"detail": "세션 예약이 완료되었습니다."}, status=status.HTTP_201_CREATED)

class CancelReservationView(APIView):
    """
    (POST) /api/v1/rooms/sessions/<int:session_id>/cancel-reserve/
    세션 예약 취소
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(Session, id=session_id)
        user = request.user

        reservation = get_object_or_404(SessionReservation, session=session, user=user)
        reservation.delete()
        
        return Response({"detail": "세션 예약이 취소되었습니다."}, status=status.HTTP_200_OK)


class RoomAvailabilityView(APIView):
    """
    (GET) /api/v1/rooms/<int:room_id>/availability/
    (POST) /api/v1/rooms/<int:room_id>/availability/
    합주 일정 조율 (시간 제출)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, room_id):
        """
        합주 일정 조율 현황 조회
        """
        # room = get_object_or_404(Room, id=room_id) # 방 존재 확인
        slots = RoomAvailabilitySlot.objects.filter(room_id=room_id).prefetch_related('voters')
        serializer = RoomAvailabilitySlotSerializer(slots, many=True, context={'request': request})
        return Response(serializer.data)

    @transaction.atomic
    def post(self, request, room_id):
        """
        합주 가능한 시간 제출 (덮어쓰기)
        """
        room = get_object_or_404(Room, id=room_id)
        user = request.user
        # 프론트에서 ["2025-11-10T14:00:00Z", "2025-11-10T15:00:00Z"] 형태로 보냄
        selected_times = request.data.get('times', []) 

        # 1. 이 유저의 기존 투표를 모두 제거
        existing_votes = RoomAvailabilitySlot.objects.filter(room=room, voters=user)
        for slot in existing_votes:
            slot.voters.remove(user)

        # 2. 이 유저의 새 투표를 추가
        for time_str in selected_times:
            try:
                # '2025-11-10T14:00:00' (naive) 또는
                # '2025-11-10T14:00:00Z' (aware)
                time_dt = timezone.datetime.fromisoformat(time_str.replace('Z', '+00:00'))
                
                # DB에서 슬롯을 찾거나, 없으면 새로 만듦
                slot, created = RoomAvailabilitySlot.objects.get_or_create(
                    room=room,
                    time=time_dt
                )
                slot.voters.add(user)
            except ValueError:
                continue # 잘못된 형식의 시간은 무시
            except Exception as e:
                # (디버깅용) print(f"Error processing time: {time_str}, {e}")
                continue

        # 3. 아무도 투표하지 않은 슬롯은 삭제 (선택적)
        RoomAvailabilitySlot.objects.filter(room=room, voters__isnull=True).delete()

        # 4. 업데이트된 현황 반환
        return self.get(request, room_id)
    
# [추가] 특정 사용자의 방 목록 조회 (프로필용)
class UserRoomListView(generics.ListAPIView):
    serializer_class = RoomListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # URL에서 nickname을 가져옴
        nickname = self.kwargs.get('nickname')
        if not nickname:
            return Room.objects.none()
            
        return Room.objects.filter(
            manager_nickname=nickname, 
            ended=False
        ).order_by('-created_at')
    
# ▼▼▼ 기존 ClanRoomListAPIView를 아래 코드로 통째로 교체해주세요 ▼▼▼
class ClanRoomListAPIView(generics.ListCreateAPIView):
    """
    (GET) /api/v1/clans/<int:pk>/rooms/
    (POST) /api/v1/clans/<int:pk>/rooms/  <-- 생성 기능 추가
    클랜 합주방 목록 조회 및 생성
    """
    serializer_class = RoomListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        clan = get_object_or_404(Clan, pk=self.kwargs['pk'])
        if not clan.members.filter(id=self.request.user.id).exists():
             raise PermissionDenied("클랜 멤버만 조회할 수 있습니다.")
        
        sort_by = self.request.query_params.get('sort', 'latest')
        queryset = Room.objects.filter(clan=clan, ended=False)
        
        if sort_by == 'oldest':
            return queryset.order_by('created_at')
        
        return queryset.order_by('-created_at')

    # [중요] 클랜 방 생성 로직 (일반 방 생성과 비슷하지만 Clan을 연결함)
    def create(self, request, *args, **kwargs):
        clan = get_object_or_404(Clan, pk=self.kwargs['pk'])
        
        # 멤버 확인
        if not clan.members.filter(id=request.user.id).exists():
            raise PermissionDenied("클랜 멤버만 방을 생성할 수 있습니다.")

        sessions_data = request.data.get("sessions", [])
        if not sessions_data:
            return Response({"detail": "세션 정보가 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

        room_data = request.data.copy()
        room_data.pop('sessions', None) # 세션 데이터 분리

        # 시리얼라이저를 통해 방 기본 정보 검증
        room_serializer = self.get_serializer(data=room_data)
        room_serializer.is_valid(raise_exception=True)

        # [핵심] 방 저장 시 Clan 정보와 방장 정보를 함께 저장
        db_room = room_serializer.save(
            manager_nickname=request.user.nickname,
            clan=clan  # <-- 이 부분이 있어야 클랜 방이 됩니다!
        )

        # 세션 생성 (일반 방 생성 로직과 동일)
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
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)