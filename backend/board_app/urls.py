from django.urls import path
from . import views

urlpatterns = [
    # 게시판
    path('', views.BoardListView.as_view(), name='board-list'),
    path('<int:board_id>/posts/', views.PostListView.as_view(), name='post-list-by-board'),
    path('clan/<int:clan_board_id>/posts/', views.PostListView.as_view(), name='post-list-by-clan-board'),

    # 게시글
    path('posts/', views.PostCreateView.as_view(), name='post-create'),
    path('posts/<int:pk>/', views.PostDetailView.as_view(), name='post-detail'),
    path('posts/<int:pk>/like/', views.PostToggleLikeView.as_view(), name='post-toggle-like'),
    # --- 👇 [신규] 스크랩 URL ---
    path('posts/<int:pk>/scrap/', views.PostToggleScrapView.as_view(), name='post-toggle-scrap'),

    # --- 👇 [이동] 내 스크랩 URL (순서 중요: board_type 보다 위에 위치) ---
    path('my-scraps/', views.MyScrapListView.as_view(), name='my-scrap-list'),

    path('<str:board_type>/', views.PostListByTypeView.as_view(), name='post-list-by-type'),
    # 댓글
    path('posts/<int:post_pk>/comments/', views.CommentListCreateView.as_view(), name='comment-list-create'),
    path('comments/<int:comment_pk>/', views.CommentDetailView.as_view(), name='comment-detail'),

    # 프로필 연동
    path('my-posts/', views.MyPostListView.as_view(), name='my-post-list'),
    path('my-comments/', views.MyCommentListView.as_view(), name='my-comment-list'),
]