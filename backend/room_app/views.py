from django.shortcuts import render

# room_app/views.py

from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.permissions import AllowAny # (테스트를 위해 AllowAny)
from django.shortcuts import get_object_or_404
from .models import Room, Session, GroupChat
from .serializers import (
    RoomSerializer, RoomCreateSerializer, RoomUpdateSerializer,
    GroupChatSerializer, MannerEvalSerializer, 
    UpdateAvailabilityRequestSerializer, AvailabilitySlotSerializer
)
from user_app.models import User

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

# (LeaveSessionView, ConfirmRoomView 등 나머지 뷰는 
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