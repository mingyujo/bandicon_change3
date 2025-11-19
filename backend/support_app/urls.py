# support_app/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # FastAPI의 POST /support/create 
    path('create/', views.FeedbackCreateView.as_view(), name='feedback-create'),
    
    # FastAPI의 GET /support/my/{nickname} 
    path('my/<str:nickname>/', views.MyFeedbackListView.as_view(), name='my-feedback-list'),

    # FastAPI의 GET /admin/feedbacks  (admin_app으로 분리 권장)
    #path('admin/feedbacks/', views.AllFeedbackListView.as_view(), name='all-feedback-list'),
    
    # FastAPI의 POST /admin/feedback/{feedback_id}/reply 
    #path('admin/feedback/<int:feedback_id>/reply/', views.FeedbackReplyView.as_view(), name='feedback-reply'),

    # FastAPI의 GET /popup-announcements/unread 
    path('popup-announcements/unread/', views.UnreadPopupView.as_view(), name='popup-unread'),
    
    # FastAPI의 POST /popup-announcements/{announcement_id}/read 
    path('popup-announcements/<int:announcement_id>/read/', views.ReadPopupView.as_view(), name='popup-read'),

    # (운영자용 팝업 생성/삭제 API 는 Django Admin 기능으로 대체 가능하므로 생략)

   
]