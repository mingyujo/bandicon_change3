from django.shortcuts import render

# room_app/views.py

from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.permissions import AllowAny # (테스트를 위해 AllowAny)
from django.shortcuts import get_object_or_404
from django.utils import timezone # <<< [수정] timezone 임포트
import itertools # <<< [신규] 평가 생성을 위한 조합 임포트

# --- 👇 [수정] Evaluation, SessionReservation 임포트 추가 ---
from .models import Room, Session, GroupChat, SessionReservation, Evaluation
from .serializers import (
    RoomSerializer, RoomCreateSerializer, RoomUpdateSerializer,
    GroupChatSerializer, MannerEvalSerializer, 
    UpdateAvailabilityRequestSerializer, AvailabilitySlotSerializer
)
# --- 👇 [수정] User, Alert 임포트 추가 ---
from user_app.models import User, Alert
from datetime import datetime # <<< GroupChatView를 위해 추가

# --- FastAPI 로직 임시 임포트 ---
# (이 코드가 작동하려면 Django 프로젝트의 상위 폴더가 Python 경로에 잡혀있어야 합니다)
#try:
#    from backend import crud, models as fastapi_models
#    from backend.database import get_db
#except ImportError:
    # 이 임포트는 Django의 runserver 환경에서는 실패할 수 있습니다.
    # 우선은 구조를 잡는 데 집중합니다.
#    print("[Warning] FastAPI 'backend' module not found. crud functions will fail.")
#    crud = None
#    get_db = None
# --- 임시 임포트 끝 ---

def get_db_session():
    """FastAPI의 get_db [cite: 120-130] 의존성을 임시로 흉내내는 헬퍼"""
    if get_db:
        return next(get_db())
    return None

# FastAPI의 get_current_user  헬퍼 임시 대체
def get_user_by_nickname(db, nickname):
    # Django ORM 버전
    return get_object_or_404(User, nickname=nickname)

# --- Room Views ---

class RoomListCreateAPIView(views.APIView):
    """
    GET: FastAPI의 get_all_rooms 
    POST: FastAPI의 create_room 
    """
    permission_classes = [AllowAny]

    def get(self, request: Request):
        search = request.query_params.get('search', '')
        sort = request.query_params.get('sort', 'latest')
        
        # Django ORM으로 crud.get_all_rooms  로직 재구현
        from django.db.models import Q, Count, F
        
        query = Room.objects.filter(clan__isnull=True) # 클랜 ID가 없는 방 

        if search:
            query = query.filter(
                Q(title__icontains=search) |
                Q(song__icontains=search) |
                Q(artist__icontains=search)
            )
        
        # FastAPI의 empty_session_count [cite: 746-2377] 로직 재구현
        empty_session_count = Count('sessions', filter=Q(sessions__participant_nickname__isnull=True))
        query = query.annotate(empty_session_count=empty_session_count)

        order_criteria = [F('confirmed').asc()] # confirmed=False가 위로
        if sort == "fewest_empty":
            order_criteria.append(F('empty_session_count').asc())
        elif sort == "most_empty":
            order_criteria.append(F('empty_session_count').desc())
        
        order_criteria.append(F('id').desc()) # 최신순
        
        rooms = query.order_by(*order_criteria)
        
        serializer = RoomSerializer(rooms, many=True)
        return Response(serializer.data)

    def post(self, request: Request):
        nickname = request.query_params.get('nickname')
        if not nickname:
            return Response({"detail": "nickname 쿼리 파라미터가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = RoomCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room_data = serializer.validated_data
        
        # crud.create_room  로직 재구현
        user = get_user_by_nickname(None, nickname)
        
        try:
            db_room = Room.objects.create(
                title=room_data['title'],
                song=room_data['song'],
                artist=room_data['artist'],
                description=room_data.get('description', ''),
                is_private=room_data['is_private'],
                password=room_data.get('password'),
                manager_nickname=user.nickname,
                clan_id=room_data.get('clan_id')
            )
            
            sessions_to_create = [
                Session(room=db_room, session_name=name) 
                for name in room_data['sessions']
            ]
            Session.objects.bulk_create(sessions_to_create)
            
            # 응답을 위해 방금 만든 객체를 다시 serializer로
            response_serializer = RoomSerializer(db_room)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RoomDetailAPIView(views.APIView):
    """
    GET: FastAPI의 get_room_detail 
    PUT: FastAPI의 update_room_api 
    DELETE: FastAPI의 delete_room_api 
    """
    permission_classes = [AllowAny]
    
    def get(self, request: Request, room_id: int):
        room = get_object_or_404(Room, id=room_id)
        serializer = RoomSerializer(room)
        return Response(serializer.data)

    def put(self, request: Request, room_id: int):
        room = get_object_or_404(Room, id=room_id)
        serializer = RoomUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        # FastAPI의 방장 확인 로직 
        if room.manager_nickname != data['nickname']:
            return Response({"detail": "방장만 수정할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)
        if room.confirmed:
            return Response({"detail": "확정된 방은 수정할 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

        # crud.update_room  로직 재구현 (일부)
        room.title = data['title']
        room.song = data['song']
        room.artist = data['artist']
        room.description = data.get('description', room.description)
        # (세션 변경 로직은 crud.py 가 더 복잡하므로 여기서는 우선 기본 정보만)
        room.save()
        
        response_serializer = RoomSerializer(room)
        return Response(response_serializer.data)

    def delete(self, request: Request, room_id: int):
        nickname = request.query_params.get('nickname')
        room = get_object_or_404(Room, id=room_id)
        
        # FastAPI의 방장 확인 로직 
        if room.manager_nickname != nickname:
            return Response({"detail": "방장만 삭제할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)
        if room.confirmed:
            return Response({"detail": "확정된 방은 삭제할 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        room.delete()
        return Response({"success": True, "message": "방이 삭제되었습니다."}, status=status.HTTP_200_OK)


class JoinSessionView(views.APIView):
    """
    POST: FastAPI의 join_session_api 
    """
    permission_classes = [AllowAny]
    
    def post(self, request: Request):
        room_id = request.data.get('room_id')
        session_name = request.data.get('session_name')
        nickname = request.data.get('nickname')
        password = request.data.get('password', '')

        room = get_object_or_404(Room, id=room_id)
        
        # FastAPI의 로직 
        if room.confirmed:
            return Response({"detail": "확정된 방에는 참여할 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)
        if room.is_private and room.password != password: 
            return Response({"detail": "비밀번호가 틀렸습니다."}, status=status.HTTP_403_FORBIDDEN)

        # crud.join_session 의 핵심 (동시성 문제 제외)
        try:
            session = Session.objects.get(room_id=room_id, session_name=session_name, participant_nickname__isnull=True)
            session.participant_nickname = nickname
            session.save()
            
            # (crud.create_alert  로직은 일단 생략)
            
            return Response({"success": True, "message": f"{session_name} 참가 완료"})
        except Session.DoesNotExist:
            return Response({"detail": "세션 참가에 실패했거나 이미 자리가 찼습니다."}, status=status.HTTP_400_BAD_REQUEST)

class LeaveSessionView(views.APIView):
    """
    POST: FastAPI의 leave_session_api 
    방에서 나갑니다.
    """
    permission_classes = [AllowAny] # 프론트엔드와 동일하게 AllowAny 유지

    def post(self, request: Request):
        # React의 `handleLeaveSession`은 FormData를 사용합니다.
        room_id = request.data.get('room_id')
        session_name = request.data.get('session_name')
        nickname = request.data.get('nickname')

        room = get_object_or_404(Room, id=room_id)
        
        if room.confirmed:
            return Response({"detail": "확정된 방은 나갈 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)
            
        if room.manager_nickname == nickname:
            return Response({"detail": "방장은 방을 나갈 수 없습니다. (방 삭제만 가능)"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = Session.objects.get(
                room_id=room_id, 
                session_name=session_name, 
                participant_nickname=nickname
            )
            
            # 세션에서 참가자 제거
            session.participant_nickname = None
            session.save()
            
            # (crud.py의 예약자 자동 승급 로직은 일단 생략)
            
            return Response({"success": True, "message": "방에서 나왔습니다."})
        except Session.DoesNotExist:
            return Response({"detail": "참여 중인 세션이 아니거나 정보를 잘못 입력했습니다."}, status=status.HTTP_400_BAD_REQUEST)

class KickMemberView(views.APIView):
    """
    DELETE: FastAPI의 kick_member_api
    방장이 멤버를 강퇴합니다.
    URL: /rooms/<int:room_id>/members/<str:member_nickname>/
    Query: ?manager_nickname=<manager_nickname>
    """
    permission_classes = [AllowAny] # 프론트엔드와 동일하게 AllowAny 유지

    def delete(self, request: Request, room_id: int, member_nickname: str):
        manager_nickname = request.query_params.get('manager_nickname')
        
        if not manager_nickname:
            return Response({"detail": "방장 닉네임(manager_nickname)이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        room = get_object_or_404(Room, id=room_id)

        # 1. 방장 확인
        if room.manager_nickname != manager_nickname:
            return Response({"detail": "방장만 멤버를 강퇴할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)
        
        # 2. 확정/종료 확인
        if room.confirmed or room.ended:
            return Response({"detail": "확정되거나 종료된 방에서는 강퇴할 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. 자신 강퇴 확인
        if room.manager_nickname == member_nickname:
            return Response({"detail": "방장은 자신을 강퇴할 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_to_kick = get_object_or_404(User, nickname=member_nickname)
        except User.DoesNotExist:
            return Response({"detail": "강퇴할 사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        # 4. 해당 룸의 모든 세션 쿼리
        sessions_in_room = Session.objects.filter(room_id=room_id)

        # 5. 세션 참여 비우기 (update()는 몇 개가 변경되었는지 갯수를 반환)
        updated_sessions_count = sessions_in_room.filter(participant_nickname=member_nickname).update(participant_nickname=None)

        # 6. 예약 비우기 (delete()는 (총 삭제 갯수, {모델별 삭제 갯수}) 튜플 반환)
        deleted_reservations_tuple = SessionReservation.objects.filter(session__in=sessions_in_room, user=user_to_kick).delete()
        deleted_reservations_count = deleted_reservations_tuple[0]

        if updated_sessions_count == 0 and deleted_reservations_count == 0:
            return Response({"detail": "해당 멤버가 방에 참여하고 있거나 예약한 내역이 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        # (Alert/Push 로직 생략)
        
        return Response({"success": True, "message": f"{member_nickname}님을 강퇴했습니다. (참여 세션 {updated_sessions_count}개, 예약 {deleted_reservations_count}개 취소)"})

class ConfirmRoomView(views.APIView):
    """
    POST: FastAPI의 confirm_room_api
    방장이 방을 확정(모집 마감)합니다.
    URL: /rooms/<int:room_id>/confirm/
    Data: {"nickname": <manager_nickname>}
    """
    permission_classes = [AllowAny] # 프론트엔드와 동일하게 AllowAny 유지

    def post(self, request: Request, room_id: int):
        nickname = request.data.get('nickname')
        if not nickname:
            return Response({"detail": "방장 닉네임(nickname)이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        room = get_object_or_404(Room, id=room_id)

        # 1. 방장 확인
        if room.manager_nickname != nickname:
            return Response({"detail": "방장만 방을 확정할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)
        
        # 2. 상태 확인
        if room.confirmed:
            return Response({"detail": "이미 확정된 방입니다."}, status=status.HTTP_400_BAD_REQUEST)
        if room.ended:
            return Response({"detail": "이미 종료된 방입니다."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. 빈 세션 찾기 (참가자가 없는 세션)
        empty_sessions = Session.objects.filter(room_id=room_id, participant_nickname__isnull=True)
        
        # 4. 빈 세션 삭제 (연결된 예약도 on_delete=CASCADE로 자동 삭제됨)
        deleted_count, _ = empty_sessions.delete()
        
        # 5. 방 확정 상태로 변경
        room.confirmed = True
        room.confirmed_at = timezone.now()
        room.save()

        # (Alert/Push 로직 생략 - crud.create_alert_for_participants)
        
        return Response({
            "success": True, 
            "message": f"방을 확정했습니다. 빈 세션 {deleted_count}개가 삭제되었습니다."
        })

# --- 👇👇👇 [신규] EndRoomView 클래스 추가 ---
class EndRoomView(views.APIView):
    """
    POST: FastAPI의 end_room_api
    방장이 합주를 종료합니다.
    URL: /rooms/<int:room_id>/end/
    Data: {"nickname": <manager_nickname>}
    """
    permission_classes = [AllowAny] # 프론트엔드와 동일하게 AllowAny 유지

    def post(self, request: Request, room_id: int):
        nickname = request.data.get('nickname')
        if not nickname:
            return Response({"detail": "방장 닉네임(nickname)이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        room = get_object_or_404(Room, id=room_id)

        # 1. 방장 확인
        if room.manager_nickname != nickname:
            return Response({"detail": "방장만 방을 종료할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)
        
        # 2. 상태 확인
        if not room.confirmed:
            return Response({"detail": "확정되지 않은 방은 종료할 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)
        if room.ended:
            return Response({"detail": "이미 종료된 방입니다."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. 방 종료 상태로 변경
        room.ended = True
        room.ended_at = timezone.now()
        room.save()

        # 4. crud.create_evaluations_for_participants 로직 재구현
        # 4-1. 모든 참여자 닉네임 수집 (방장 포함)
        participant_nicknames = list(Session.objects.filter(room_id=room_id)
                                                    .values_list('participant_nickname', flat=True))
        if room.manager_nickname not in participant_nicknames:
             participant_nicknames.append(room.manager_nickname)
        
        # 중복 제거 (혹시 모를 상황 대비)
        unique_nicknames = sorted(list(set(participant_nicknames)))
        
        evaluations_to_create = []
        alerts_to_create = []
        
        # 4-2. User 객체 조회 (닉네임 -> User)
        participant_users = list(User.objects.filter(nickname__in=unique_nicknames))
        user_map = {user.nickname: user for user in participant_users}

        # 4-3. 평가 객체 및 알림 생성 (A->B, A->C, B->A, ...)
        for evaluator_nick, target_nick in itertools.permutations(unique_nicknames, 2):
            if evaluator_nick in user_map and target_nick in user_map:
                evaluator_user = user_map[evaluator_nick]
                target_user = user_map[target_nick]
                
                evaluations_to_create.append(
                    Evaluation(
                        room=room,
                        evaluator=evaluator_user,
                        target=target_user
                    )
                )

        # 4-4. "평가해주세요" 알림 생성 (모든 참여자에게)
        for user in participant_users:
            alerts_to_create.append(
                Alert(
                    user=user,
                    message=f"'{room.title}' 합주가 종료되었습니다. 매너 평가를 진행해주세요.",
                    url=f"/evaluation/{room.id}" # 프론트엔드 평가 페이지 URL
                )
            )

        # 5. DB에 일괄 생성
        Evaluation.objects.bulk_create(evaluations_to_create)
        Alert.objects.bulk_create(alerts_to_create)
        
        # (Push 알림 로직 생략)

        return Response({
            "success": True, 
            "message": f"합주를 종료했습니다. 참여자 {len(unique_nicknames)}명에 대해 {len(evaluations_to_create)}개의 평가가 생성되었습니다."
        })
# --- 👆👆👆 [신규] EndRoomView 클래스 추가 ---


# (ConfirmRoomView 등 나머지 뷰는 
#  JoinSessionView와 유사한 패턴으로 crud.py 의 로직을 변환/재구현합니다)

# --- Group Chat ---
class GroupChatView(views.APIView):
    """
    GET/POST: FastAPI의 /chat/group 
    """
    permission_classes = [AllowAny]
    
    def get(self, request: Request, room_id: int):
        messages = GroupChat.objects.filter(room_id=room_id).order_by('timestamp')
        serializer = GroupChatSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request: Request, room_id: int):
        # (파일 업로드(file)는 일단 제외하고 텍스트 메시지만 구현)
        sender = request.data.get('sender')
        message = request.data.get('message')
        
        if not sender or not message:
            return Response({"detail": "sender와 message가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        # crud.create_group_chat  로직 재구현
        db_msg = GroupChat.objects.create(
            room_id=room_id,
            sender=sender,
            message=message,
            timestamp=datetime.now().isoformat()
        )
        
        # (푸시 알림 및 Alert 생성  로직은 일단 생략)
        
        serializer = GroupChatSerializer(db_msg)
        return Response(serializer.data, status=status.HTTP_201_CREATED)