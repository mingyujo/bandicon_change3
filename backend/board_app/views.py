from django.shortcuts import render

# board_app/views.py

from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.permissions import AllowAny # (테스트를 위해 AllowAny)
from django.shortcuts import get_object_or_404
from .models import Post, Comment
from user_app.models import User
from .serializers import (
    PostSerializer, PostListSerializer, PostCreateSerializer,
    CommentSerializer, CommentCreateSerializer
)

from rest_framework import parsers # MultiPartParser 추가
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import uuid
import os
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

# --- Post Views ---

class PostListCreateAPIView(generics.CreateAPIView):
    """
    POST: FastAPI의 create_post_api 
    (파일 업로드 로직 추가)
    """
    queryset = Post.objects.all()
    serializer_class = PostCreateSerializer
    permission_classes = [AllowAny]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser] # 폼/파일 파싱

    def perform_create(self, serializer):
        # 1. 파일 가져오기 (FastAPI의 file: Optional[UploadFile] )
        file = self.request.FILES.get('file')
        image_url = None

        if file:
            # 2. 파일명/경로 생성 (FastAPI의 handle_image_upload  로직)
            subfolder = "posts"
            ext = os.path.splitext(file.name)[1].lower()
            allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
            if ext not in allowed_extensions:
                # (엄밀히는 validation 단계에서 처리해야 하지만, 우선 로직 유지)
                raise serializers.ValidationError("지원하지 않는 이미지 형식입니다.")
            
            filename = f"{uuid.uuid4()}{ext}"
            save_path = os.path.join(subfolder, filename) # 예: "posts/uuid.png"

            try:
                # 3. 파일 저장
                file_path = default_storage.save(save_path, ContentFile(file.read()))
                image_url = default_storage.url(file_path) # 예: /media/posts/uuid.png
            except Exception as e:
                raise serializers.ValidationError(f"파일 저장 실패: {str(e)}")

        # 4. DB에 저장 (FastAPI처럼 nickname을 폼 데이터로 받음 )
        nickname = self.request.data.get('nickname')
        user = get_user_by_nickname(None, nickname)
        
        # (임시) FastAPI의 crud.send_push_to_all [cite: 689-2169] 호출 (일단 생략)
        
        # serializer.save() 호출 시 image_url과 owner를 추가로 전달
        serializer.save(owner=user, image_url=image_url)

class PostListView(generics.ListAPIView):
    """
    GET: FastAPI의 get_posts_api 
    """
    serializer_class = PostListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        # URL의 board_type을 가져옴
        board_type = self.kwargs['board_type']
        
        # crud.get_posts  로직 재구현
        from django.db.models import Q, Count
        
        query = Post.objects.filter(board_type=board_type)
        
        search = self.request.query_params.get('search', '')
        if search:
            query = query.filter(
                Q(title__icontains=search) | Q(content__icontains=search)
            )
            
        return query.order_by('-created_at')


class PostDetailAPIView(generics.RetrieveDestroyAPIView):
    """
    GET: FastAPI의 get_post_detail_api 
    DELETE: FastAPI의 delete_post_api 
    """
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [AllowAny]
    lookup_field = 'post_id'

    def retrieve(self, request: Request, *args, **kwargs):
        # FastAPI의 get_post_detail_api  로직 (복잡한 부분)
        post = self.get_object()
        
        # nickname을 쿼리 파라미터로 받는다고 가정 
        nickname = request.query_params.get('nickname')
        user = get_user_by_nickname(None, nickname)

        # Serializer에게 user 정보를 전달 (is_liked 등 계산용)
        context = {'request': request, 'user': user}
        serializer = self.get_serializer(post, context=context)
        
        # FastAPI의 응답 스키마 [cite: 1334-1921]에 맞게 추가 데이터 계산
        data = serializer.data
        data['likes_count'] = post.liked_by_users.count()
        data['is_liked'] = post.liked_by_users.filter(id=user.id).exists()
        data['is_scrapped'] = post.scrapped_by_users.filter(id=user.id).exists()
        data['is_owner'] = (post.owner == user)
        
        # (익명 닉네임 매핑 로직은 serializer에서 처리 [cite: 1334-1921])
        return Response(data)

    def destroy(self, request: Request, *args, **kwargs):
        # FastAPI의 delete_post_api  로직
        post = self.get_object()
        nickname = request.query_params.get('nickname')
        user = get_user_by_nickname(None, nickname)
        
        if post.owner != user:
            return Response({"detail": "작성자만 게시글을 삭제할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)
        
        # crud.delete_post  (Cascade로 댓글/좋아요 등 자동 삭제됨)
        self.perform_destroy(post)
        return Response({"success": True, "message": "게시글이 삭제되었습니다."}, status=status.HTTP_200_OK)


class CommentCreateAPIView(generics.CreateAPIView):
    """
    POST: FastAPI의 create_comment_api 
    """
    queryset = Comment.objects.all()
    serializer_class = CommentCreateSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        post = get_object_or_404(Post, id=self.kwargs['post_id'])
        nickname = self.request.query_params.get('nickname')
        user = get_user_by_nickname(None, nickname)
        
        parent_id = self.request.query_params.get('parent_id')
        parent = None
        if parent_id:
            parent = get_object_or_404(Comment, id=parent_id)
            
        # crud.create_comment  로직
        serializer.save(owner=user, post=post, parent=parent)
        
        # (Alert/Push 로직  생략)


class PostToggleLikeView(views.APIView):
    """
    POST: FastAPI의 toggle_like_api 
    """
    permission_classes = [AllowAny]
    
    def post(self, request: Request, post_id: int):
        post = get_object_or_404(Post, id=post_id)
        nickname = request.data.get('nickname') # 폼 데이터로 받는다고 가정
        user = get_user_by_nickname(None, nickname)
        
        # crud.toggle_post_like  로직
        message = ""
        if user in post.liked_by_users.all():
            post.liked_by_users.remove(user)
            message = "좋아요 취소"
        else:
            post.liked_by_users.add(user)
            message = "좋아요"
            # (Alert/Push 로직  생략)
            
        return Response({
            "success": True, 
            "message": message, 
            "likes_count": post.liked_by_users.count()
        })

# (MyPostListView, MyCommentListView, MyScrapListView, PostToggleScrapView는
#  위와 유사한 패턴으로 crud.py 의 로직을 변환/재구현합니다)