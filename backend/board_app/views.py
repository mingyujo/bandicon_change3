from django.shortcuts import render
from django.db.models import Q
from rest_framework import generics, status, views, permissions
from rest_framework.response import Response
from rest_framework.request import Request
from .models import Post, Comment, Board
from user_app.models import User
from .serializers import (
    BoardSerializer, # BoardSerializer 임포트
    PostListSerializer, 
    PostDetailSerializer, # PostDetailSerializer 임포트
    CommentSerializer,
)

# --- Board Views ---

class BoardListView(generics.ListAPIView):
    queryset = Board.objects.all()
    serializer_class = BoardSerializer
    permission_classes = [permissions.AllowAny]

# --- Post Views ---

class PostListView(generics.ListAPIView):
    serializer_class = PostListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        board_id = self.kwargs.get('board_id')
        clan_board_id = self.kwargs.get('clan_board_id')
        search = self.request.query_params.get('search', None)
        
        queryset = Post.objects.all()

        if board_id:
            queryset = queryset.filter(board_id=board_id)
        elif clan_board_id:
            queryset = queryset.filter(clan_board_id=clan_board_id)
        else:
            # (혹은 404를 반환하거나, 기본 게시판을 정할 수 있음)
            return Post.objects.none() 

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(content__icontains=search)
            )
            
        return queryset.order_by('-created_at')

class PostCreateView(generics.CreateAPIView):
    queryset = Post.objects.all()
    serializer_class = PostDetailSerializer # (생성 후 상세 데이터를 반환하기 위해)
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Post.objects.all()
    serializer_class = PostDetailSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'pk' # URL에서 'pk'로 받음

    def get_serializer_context(self):
        # Serializer에게 request 객체를 전달
        return {'request': self.request}

    def perform_destroy(self, instance):
        if instance.author != self.request.user:
            raise permissions.PermissionDenied("게시글 작성자만 삭제할 수 있습니다.")
        instance.delete()

class PostToggleLikeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        user = request.user
        
        if user in post.likes.all():
            post.likes.remove(user)
            liked = False
        else:
            post.likes.add(user)
            liked = True
            
        return Response({
            'liked': liked,
            'likes_count': post.likes_count
        }, status=status.HTTP_200_OK)

# --- 👇 [신규] PostToggleScrapView ---
class PostToggleScrapView(views.APIView):
    """
    게시글 스크랩 토글 (POST)
    POST /api/v1/boards/posts/<pk>/scrap/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        user = request.user
        
        # (수정) 'scraps' -> 'scrapped_by_users'
        if user in post.scrapped_by_users.all():
            post.scrapped_by_users.remove(user)
            scrapped = False
        else:
            post.scrapped_by_users.add(user)
            scrapped = True
            
        return Response({
            'scrapped': scrapped,
            # (수정) 'scraps' -> 'scrapped_by_users'
            'scraps_count': post.scrapped_by_users.count()
        }, status=status.HTTP_200_OK)
# --- 👆 [신규] ---

# --- Comment Views ---

class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        post_id = self.kwargs.get('post_pk')
        return Comment.objects.filter(post_id=post_id, parent__isnull=True).order_by('created_at')

    def perform_create(self, serializer):
        post_id = self.kwargs.get('post_pk')
        post = get_object_or_404(Post, pk=post_id)
        serializer.save(author=self.request.user, post=post)

class CommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_url_kwarg = 'comment_pk' # URL에서 'comment_pk'로 받음

    def perform_update(self, serializer):
        if serializer.instance.author != self.request.user:
            raise permissions.PermissionDenied("댓글 작성자만 수정할 수 있습니다.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author != self.request.user:
            raise permissions.PermissionDenied("댓글 작성자만 삭제할 수 있습니다.")
        instance.delete()

# --- Profile Views (MyPost, MyComment) ---

class MyPostListView(generics.ListAPIView):
    serializer_class = PostListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Post.objects.filter(author=self.request.user).order_by('-created_at')

class MyCommentListView(generics.ListAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Comment.objects.filter(author=self.request.user).order_by('-created_at')

# --- 👇 [신규] MyScrapListView ---
class MyScrapListView(generics.ListAPIView):
    """
    내가 스크랩한 글 목록 (GET)
    GET /api/v1/boards/my-scraps/
    """
    serializer_class = PostListSerializer # 목록이므로 ListSerializer 사용
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # (수정) 'scraps' -> 'scrapped_by_users'
        # request.user.scrapped_posts는 Post 모델의 related_name
        return self.request.user.scrapped_posts.all().order_by('-created_at')
# --- 👆 [신규] ---