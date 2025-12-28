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
    BoardSerializer,
    PostListSerializer, 
    PostDetailSerializer,
    CommentSerializer,
)
from rest_framework.exceptions import ValidationError

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
            return Post.objects.none() 

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(content__icontains=search)
            )
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class PostCreateView(generics.CreateAPIView):
    queryset = Post.objects.all()
    serializer_class = PostDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # 1. 프론트엔드에서 보낸 데이터 확인
        # 'board' (ID) 또는 'clan_board_id' (ID) 또는 'board_type' (문자열)을 확인
        board_id = self.request.data.get('board')
        board_type = self.request.data.get('board_type')
        clan_board_id = self.request.data.get('clan_board_id')

        save_kwargs = {'author': self.request.user}

        if board_id:
            # [CASE 1] 게시판 ID가 직접 넘어온 경우 (일반 게시글)
            # Serializer가 이미 'board' 필드를 검증하고 객체로 변환했을 것이므로
            # 추가적인 DB 조회 없이 저장만 하면 되지만, 
            # 확실하게 하기 위해 save_kwargs에 넣지 않고 serializer의 기본 동작을 따르게 합니다.
            pass 

        elif board_type:
            # [CASE 2] 게시판 타입 문자열로 넘어온 경우 (이전 호환성)
            try:
                board = Board.objects.get(board_type=board_type)
                save_kwargs['board'] = board
            except Board.DoesNotExist:
                raise ValidationError({"detail": f"'{board_type}'(이)라는 게시판이 없습니다."})

        elif clan_board_id:
            # [CASE 3] 클랜 게시판
            try:
                clan_board = ClanBoard.objects.get(id=clan_board_id)
                save_kwargs['clan_board'] = clan_board
            except ClanBoard.DoesNotExist:
                raise ValidationError({"detail": "존재하지 않는 클랜 게시판입니다."})
        
        else:
             # 아무 정보도 없는 경우 (단, Serializer validation에서 걸러질 수도 있음)
             # 'board'가 required=False로 설정되어 있다면 여기서 한 번 더 체크
             if not serializer.validated_data.get('board') and not serializer.validated_data.get('clan_board'):
                raise ValidationError({"detail": "게시판 정보(board 또는 clan_board_id)가 필요합니다."})

        # 2. 저장 (author 및 찾은 게시판 정보 주입)
        serializer.save(**save_kwargs)


class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Post.objects.all()
    serializer_class = PostDetailSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'pk'

    def get_serializer_context(self):
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
            'likes_count': post.likes.count()
        }, status=status.HTTP_200_OK)

class PostToggleScrapView(views.APIView):
    """
    게시글 스크랩 토글 (POST)
    POST /api/v1/boards/posts/<pk>/scrap/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        user = request.user
        
        if user in post.scraps.all():
            post.scraps.remove(user)
            scrapped = False
        else:
            post.scraps.add(user)
            scrapped = True
            
        return Response({
            'scrapped': scrapped,
            'scraps_count': post.scraps.count()
        }, status=status.HTTP_200_OK)

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
    lookup_url_kwarg = 'comment_pk'

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

class MyScrapListView(generics.ListAPIView):
    """
    내가 스크랩한 글 목록 (GET)
    GET /api/v1/boards/my-scraps/
    """
    serializer_class = PostListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.scrapped_posts.all().order_by('-created_at')

class PostListByTypeView(generics.ListAPIView):
    """
    board_type(문자열)으로 게시글 목록 조회
    GET /api/v1/boards/general/?search=...
    GET /api/v1/boards/beginner/?search=...
    """
    serializer_class = PostListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        board_type = self.kwargs.get('board_type')
        search = self.request.query_params.get('search', '')
        
        try:
            board = Board.objects.get(board_type=board_type)
        except Board.DoesNotExist:
            return Post.objects.none()
        
        queryset = Post.objects.filter(board=board)
        
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(content__icontains=search)
            )
            
        return queryset.order_by('-created_at')