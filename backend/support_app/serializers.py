# support_app/serializers.py

from rest_framework import serializers
from .models import Feedback, FeedbackReply, PopupAnnouncement
from user_app.serializers import UserBaseSerializer

# --- Popup Announcement ---

class PopupAnnouncementCreateSerializer(serializers.ModelSerializer):
    """
    FastAPI의 PopupAnnouncementCreate  스키마를 변환.
    """
    class Meta:
        model = PopupAnnouncement
        fields = ('title', 'content')


class PopupAnnouncementSerializer(serializers.ModelSerializer):
    """
    FastAPI의 PopupAnnouncement  스키마를 변환.
    """
    # FastAPI 스키마는 'created_by'가 닉네임(String)이었습니다 .
    # Django 모델은 User(FK)이므로, 닉네임만 응답하도록 source 지정
    created_by = serializers.CharField(source='created_by.nickname', read_only=True)
    
    class Meta:
        model = PopupAnnouncement
        fields = ('id', 'title', 'content', 'created_at', 'is_active', 'created_by')


class UnreadPopupAnnouncementSerializer(serializers.ModelSerializer):
    """
    FastAPI의 UnreadPopupAnnouncement  스키마를 변환.
    """
    class Meta:
        model = PopupAnnouncement
        fields = ('id', 'title', 'content', 'created_at')


# --- Feedback ---

class FeedbackCreateSerializer(serializers.ModelSerializer):
    """
    FastAPI의 FeedbackCreate  스키마를 변환.
    """
    class Meta:
        model = Feedback
        fields = ('type', 'title', 'content')


class FeedbackReplySerializer(serializers.ModelSerializer):
    """
    FastAPI의 FeedbackReply  스키마를 변환.
    """
    admin = UserBaseSerializer(read_only=True)
    
    class Meta:
        model = FeedbackReply
        fields = ('id', 'content', 'created_at', 'admin')


class FeedbackSerializer(serializers.ModelSerializer):
    """
    FastAPI의 Feedback  스키마를 변환.
    """
    user = UserBaseSerializer(read_only=True)
    replies = FeedbackReplySerializer(many=True, read_only=True)
    
    class Meta:
        model = Feedback
        fields = (
            'id', 
            'type', 
            'title', 
            'content', 
            'status', 
            'created_at', 
            'user', 
            'replies'
        )
