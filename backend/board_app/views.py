from django.shortcuts import render
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, views, permissions
from rest_framework.response import Response
from rest_framework.request import Request
from .models import Post, Comment, Board
from user_app.models import User
from clan_app.models import ClanBoard
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

class PostListView(generics.ListCreateAPIView):
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
     # ▼▼▼ [신규 추가] POST 요청 시, 작성자(author)를 자동으로 주입 ▼▼▼
    def perform_create(self, serializer):
        """
        CreatePost.js가 보낸 'board_type'은 serializer가 자동으로 처리합니다.
        우리는 'author'만 request.user로 설정해줍니다.
        (is_anonymous는 CreatePost.js가 formData에 포함시켜 보냅니다)
        """
        serializer.save(author=self.request.user)
    # ▲▲▲ [신규 추가] ▲▲▲

class PostCreateView(generics.CreateAPIView):
    queryset = Post.objects.all()
    serializer_class = PostDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # 1. 프론트엔드(CreatePost.js)가 보낸 'board_type' 또는 'clan_board_id'를 가져옵니다.
        # (apiPostForm은 FormData를 request.data로 보냅니다)
        board_type = self.request.data.get('board_type')
        clan_board_id = self.request.data.get('clan_board_id')

        board = None
        clan_board = None

        if board_type:
            # 일반 게시판 (board_type: general, novice 등)
            try:
                # [수정] Board 모델에서 'type' 대신 실제 필드명인 'board_type'을 사용합니다.
                board = get_object_or_404(Board, board_type=board_type) 
            except:
                 # 게시판이 없을 경우 403 대신 400 Bad Request를 반환하는 것이 사용자 경험에 좋습니다.
                 return Response({"detail": f"'{board_type}'(이)라는 게시판이 없습니다."}, status=status.HTTP_400_BAD_REQUEST)


        elif clan_board_id:
            # 클랜 게시판 (clan_board_id)
            try:
                clan_board = get_object_or_404(ClanBoard, id=clan_board_id)
            except:
                 return Response({"detail": "존재하지 않는 클랜 게시판입니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        else:
            # 둘 다 없을 경우
            return Response({"detail": "게시판 정보(board_type 또는 clan_board_id)가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        # 2. author, board, clan_board를 serializer에 주입하여 저장
        serializer.save(
            author=self.request.user,
            board=board,           # (일반 게시판일 경우)
            clan_board=clan_board  # (클랜 게시판일 경우)
        )
# ▲▲▲ [핵심 수정] ▲▲▲
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