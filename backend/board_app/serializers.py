from rest_framework import serializers
from .models import Post, Comment, Board 
from user_app.serializers import UserBaseSerializer
from clan_app.models import ClanBoard 

# --- BoardSerializer ---
class BoardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Board
        #fields = ['id', 'name', 'description']
        fields = '__all__'
# --- CommentSerializer ---
class CommentSerializer(serializers.ModelSerializer):
    author = UserBaseSerializer(read_only=True)
    post_id = serializers.ReadOnlyField(source='post.id')

    class Meta:
        model = Comment
        fields = ['id', 'post', 'post_id', 'author', 'content', 'created_at', 'updated_at']
        read_only_fields = ['author', 'post_id']
        extra_kwargs = {
            'post': {'required': True},
        }

# --- PostListSerializer ---
class PostListSerializer(serializers.ModelSerializer):
    author = UserBaseSerializer(read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = ['id', 'title', 'author', 'created_at', 'likes_count', 'comments_count', 'is_liked', 'updated_at']

    def get_is_liked(self, obj):
        request = self.context.get('request', None)
        if request and request.user.is_authenticated:
            return obj.likes.filter(pk=request.user.pk).exists()
        return False

# --- PostDetailSerializer ---
class PostDetailSerializer(serializers.ModelSerializer):
    author = UserBaseSerializer(read_only=True)
    comments = CommentSerializer(many=True, read_only=True) 
    
    likes_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()
    
    scraps_count = serializers.SerializerMethodField()
    is_scrapped = serializers.SerializerMethodField()
    
    board_info = serializers.SerializerMethodField()
    # ▼▼▼ [핵심 수정 1] 이 필드들을 required=False로 선언하여 시리얼라이저 유효성 검사를 통과시킵니다. ▼▼▼
    board = serializers.PrimaryKeyRelatedField(queryset=Board.objects.all(), required=False)
    clan_board = serializers.PrimaryKeyRelatedField(queryset=ClanBoard.objects.all(), required=False)
    # ▲▲▲ [핵심 수정 1] ▲▲▲

    class Meta:
        model = Post
        fields = [
            'id', 'author', 'title', 'content', 'created_at', 'updated_at', 
            'comments', 
            'likes_count', 'is_liked',
            'scraps_count', 'is_scrapped',
            'board', 'clan_board', 'board_info'
        ]
        read_only_fields = [
            'author', 'created_at', 'updated_at', 'comments',
            'likes_count', 'is_liked', 'scraps_count', 'is_scrapped', 'board_info'
        ]
        extra_kwargs = {
            'board': {'write_only': True, 'required': False, 'allow_null': True},
            'clan_board': {'write_only': True, 'required': False, 'allow_null': True},
        }

    def get_is_liked(self, obj):
        request = self.context.get('request', None)
        if request and request.user.is_authenticated:
            return obj.likes.filter(pk=request.user.pk).exists()
        return False
        
    def get_scraps_count(self, obj):
        # --- 👇 [수정] 'scraps' -> 'scrapped_by_users' ---
        return obj.scrapped_by_users.count()
        
    def get_is_scrapped(self, obj):
        request = self.context.get('request', None)
        if request and request.user.is_authenticated:
            # --- 👇 [수정] 'scraps' -> 'scrapped_by_users' ---
            return obj.scrapped_by_users.filter(pk=request.user.pk).exists()
        return False
        
    def get_board_info(self, obj):
        if obj.board:
            return {
                'type': 'public',
                'id': obj.board.id,
                'name': obj.board.name
            }
        elif obj.clan_board:
            return {
                'type': 'clan',
                'id': obj.clan_board.id,
                'name': obj.clan_board.name,
                'clan_id': obj.clan_board.clan_id 
            }
        return None
        
    def validate(self, data):
        board = data.get('board', None)
        clan_board = data.get('clan_board', None)

        if self.instance:
            pass
        else:
            if not board and not clan_board:
                raise serializers.ValidationError("게시판(board) 또는 클랜 게시판(clan_board) 중 하나는 반드시 선택해야 합니다.")
            
        if board and clan_board:
            raise serializers.ValidationError("게시판(board)과 클랜 게시판(clan_board)을 동시에 선택할 수 없습니다.")
            
        return data