from django.shortcuts import render

# Create your views here.
# support_app/views.py

from rest_framework import generics, status, views, permissions
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.permissions import AllowAny # (테스트를 위해 AllowAny)
from django.shortcuts import get_object_or_404
from .models import Feedback, FeedbackReply, PopupAnnouncement, PopupAnnouncementRead
from user_app.models import User
from .serializers import (
    FeedbackSerializer, FeedbackCreateSerializer, FeedbackReplySerializer,
    UnreadPopupAnnouncementSerializer
)


# --- FastAPI 로직 임시 임포트 ---
#try:
#    from backend import crud
#    from backend.database import get_db
#except ImportError:
#    print("[Warning] FastAPI 'backend' module not found. crud functions will fail.")
#    crud = None
#    get_db = None
# --- 임시 임포트 끝 ---

def get_user_by_nickname(db, nickname):
    return get_object_or_404(User, nickname=nickname)

# --- Feedback Views ---

class FeedbackCreateView(generics.CreateAPIView):
    """
    POST: FastAPI의 create_feedback_api 
    """
    queryset = Feedback.objects.all()
    serializer_class = FeedbackCreateSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        nickname = self.request.data.get('user_nickname')
        user = get_user_by_nickname(None, nickname)
        
        # crud.create_feedback  로직
        feedback = serializer.save(user=user)
        
        # (운영자 Alert 로직  생략)


class MyFeedbackListView(generics.ListAPIView):
    """
    GET: FastAPI의 get_my_feedbacks 
    """
    serializer_class = FeedbackSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        nickname = self.kwargs['nickname']
        user = get_user_by_nickname(None, nickname)
        # crud.get_user_feedbacks  로직
        return Feedback.objects.filter(user=user).prefetch_related('replies__admin').order_by('-created_at')

# (AllFeedbackListView, FeedbackReplyView는 admin 기능이므로 일단 생략) => 구현 시작

class AllFeedbackListView(generics.ListAPIView):
    """
    GET: /api/v1/support/admin/feedbacks/
    운영자용 모든 문의/피드백 조회
    """
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # 운영자 권한 체크 ( role='OPERATOR' or is_staff=True )
        if user.role != 'OPERATOR' and not user.is_staff:
            return Feedback.objects.none() # 권한 없음

        queryset = Feedback.objects.all().prefetch_related('user', 'replies__admin').order_by('-created_at')

        # 필터링
        type_filter = self.request.query_params.get('type_filter')
        if type_filter and type_filter != 'all':
            queryset = queryset.filter(type=type_filter)
            
        return queryset

    def list(self, request, *args, **kwargs):
        user = self.request.user
        if user.role != 'OPERATOR' and not user.is_staff:
             return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)


class FeedbackReplyView(views.APIView):
    """
    POST: /api/v1/support/admin/feedback/<int:feedback_id>/reply/
    문의 답변 작성
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, feedback_id):
        user = request.user
        if user.role != 'OPERATOR' and not user.is_staff:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)

        feedback = get_object_or_404(Feedback, id=feedback_id)
        
        content = request.data.get('content')
        if not content:
            return Response({"detail": "내용을 입력해주세요."}, status=status.HTTP_400_BAD_REQUEST)

        # 답변 생성
        reply = FeedbackReply.objects.create(
            feedback=feedback,
            admin=user,
            content=content
        )

        # 문의 상태를 'answered'로 변경
        feedback.status = 'answered'
        feedback.save()

        # (선택) 질문자에게 알림 생성 로직 추가 가능
        
        return Response({"success": True, "message": "답변이 등록되었습니다."})

# --- Popup Announcement Views ---

class UnreadPopupView(views.APIView):
    """
    GET: FastAPI의 get_unread_popup_announcements_api 
    """
    permission_classes = [AllowAny]
    
    def get(self, request: Request):
        nickname = request.query_params.get('nickname')
        user = get_user_by_nickname(None, nickname)
        
        # crud.get_unread_popup_announcements  로직 재구현
        read_ids = PopupAnnouncementRead.objects.filter(user=user).values_list('announcement_id', flat=True)
        unread_popups = PopupAnnouncement.objects.filter(
            is_active=True
        ).exclude(
            id__in=read_ids
        ).order_by('-created_at')
        
        serializer = UnreadPopupAnnouncementSerializer(unread_popups, many=True)
        return Response(serializer.data)


class ReadPopupView(views.APIView):
    """
    POST: FastAPI의 mark_popup_announcement_read_api 
    """
    permission_classes = [AllowAny]
    
    def post(self, request: Request, announcement_id: int):
        nickname = request.query_params.get('nickname')
        user = get_user_by_nickname(None, nickname)
        
        # crud.mark_popup_announcement_as_read  로직
        _, created = PopupAnnouncementRead.objects.get_or_create(
            announcement_id=announcement_id,
            user=user
        )
        
        if created:
            return Response({"success": True, "message": "공지를 확인했습니다."})
        else:
            return Response({"success": True, "message": "이미 확인한 공지입니다."})

# ▼▼▼ [신규 추가] 알림 목록 뷰 ▼▼▼
