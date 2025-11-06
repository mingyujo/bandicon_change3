# board_app/serializers.py

from rest_framework import serializers
from .models import Post, Comment
from user_app.serializers import UserBaseSerializer

# --- Comment ---

class CommentSerializer(serializers.ModelSerializer):
    """
    FastAPI의 Comment  스키마를 변환.
    대댓글(replies)을 재귀적으로 처리합니다.
    """
    owner = UserBaseSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    anonymous_nickname = serializers.CharField(read_only=True, required=False) # View에서 채워줄 필드
    
    class Meta:
        model = Comment
        fields = (
            'id', 
            'post_id', # FastAPI 스키마에 이 필드가 있었습니다 
            'parent_id',
            'content', 
            'created_at', 
            'owner', 
            'replies',
            'anonymous_nickname'
        )
        extra_kwargs = {
            'post_id': {'source': 'post.id', 'read_only': True}
        }

    def get_replies(self, obj):
        # 재귀적으로 대댓글을 직렬화
        if obj.replies.exists():
            return CommentSerializer(obj.replies.all(), many=True, context=self.context).data
        return []


class CommentCreateSerializer(serializers.ModelSerializer):
    """
    FastAPI의 CommentCreate  스키마를 변환.
    """
    class Meta:
        model = Comment
        fields = ('content',)

# --- Post ---

class PostCreateSerializer(serializers.ModelSerializer):
    """
    FastAPI의 PostCreate  스키마를 변환.
    """
    class Meta:
        model = Post
        fields = ('title', 'content', 'board_type', 'is_anonymous', 'clan_board_id')
        extra_kwargs = {
            'board_type': {'required': False, 'allow_null': True},
            'clan_board_id': {'required': False, 'allow_null': True}
        }


class PostListSerializer(serializers.ModelSerializer):
    """
    FastAPI의 PostList  스키마를 변환 (목록용).
    """
    owner = UserBaseSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = (
            'id', 
            'title', 
            'board_type', 
            'owner', 
            'created_at', 
            'likes_count', 
            'comments_count', 
            'is_anonymous'
        )

    def get_likes_count(self, obj):
        # 'liked_by_users'는 ManyToMany 필드
        return obj.liked_by_users.count()

    def get_comments_count(self, obj):
        # 'comments'는 ForeignKey의 related_name
        return obj.comments.count()


class PostSerializer(serializers.ModelSerializer):
    """
    FastAPI의 Post  스키마를 변환 (상세보기용).
    """
    owner = UserBaseSerializer(read_only=True)
    comments = serializers.SerializerMethodField()
    
    # View에서 request.user를 기반으로 계산해서 넣어줄 필드들
    likes_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.BooleanField(read_only=True)
    is_scrapped = serializers.BooleanField(read_only=True)
    is_owner = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Post
        fields = (
            'id', 
            'title', 
            'content', 
            'board_type', 
            'created_at', 
            'image_url', 
            'owner', 
            'comments', 
            'likes_count', 
            'is_liked', 
            'is_scrapped', 
            'is_anonymous',
            'is_owner'
        )

    def get_comments(self, obj):
        # 최상위 댓글(부모가 없는 댓글)만 직렬화
        top_level_comments = obj.comments.filter(parent__isnull=True)
        # context를 전달하여 request 객체를 CommentSerializer에서도 사용 가능하게 함
        return CommentSerializer(top_level_comments, many=True, context=self.context).data