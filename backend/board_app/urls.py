# board_app/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # FastAPI의 POST /posts 
    path('posts/', views.PostListCreateAPIView.as_view(), name='post-list-create'),
    
    # FastAPI의 GET /boards/{board_type} 
    path('<str:board_type>/', views.PostListView.as_view(), name='post-list-by-type'),

    # FastAPI의 GET /profile/{nickname}/posts 
    #path('my-posts/<str:nickname>/', views.MyPostListView.as_view(), name='my-post-list'),
    
    # FastAPI의 GET /profile/{nickname}/comments 
    #path('my-comments/<str:nickname>/', views.MyCommentListView.as_view(), name='my-comment-list'),
    
    # FastAPI의 GET /profile/{nickname}/scraps 
    #path('my-scraps/<str:nickname>/', views.MyScrapListView.as_view(), name='my-scrap-list'),

    # FastAPI의 GET, DELETE /post/{post_id} 
    path('post/<int:post_id>/', views.PostDetailAPIView.as_view(), name='post-detail'),
    
    # FastAPI의 POST /post/{post_id}/comments 
    path('post/<int:post_id>/comments/', views.CommentCreateAPIView.as_view(), name='comment-create'),
    
    # FastAPI의 POST /post/{post_id}/like 
    path('post/<int:post_id>/like/', views.PostToggleLikeView.as_view(), name='post-toggle-like'),
    
    # FastAPI의 POST /post/{post_id}/scrap 
    #path('post/<int:post_id>/scrap/', views.PostToggleScrapView.as_view(), name='post-toggle-scrap'),
]