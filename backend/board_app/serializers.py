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
        read_only_fields = ['author', 'post_id','post']
        # extra_kwargs = {
        #     'post': {'required': True},
        # }

# --- PostListSerializer ---
class PostListSerializer(serializers.ModelSerializer):
    author = UserBaseSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()  # ✅ 변경
    comments_count = serializers.SerializerMethodField()  # ✅ 변경
    is_liked = serializers.SerializerMethodField()
    
    def get_likes_count(self, obj):
        return obj.likes.count()
    
    def get_comments_count(self, obj):
        return obj.comments.count()
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
    
    # ▼▼▼ [핵심 수정 1] likes_count를 SerializerMethodField로 변경 ▼▼▼
    likes_count = serializers.SerializerMethodField()
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
            'board', 'clan_board', 'board_info',
            'is_anonymous'
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
        # ▼▼▼ [핵심 수정] obj가 Post 인스턴스인지 확인 ▼▼▼
        if not isinstance(obj, Post):
            return False
        # ▲▲▲ [핵심 수정] ▲▲▲
        if request and request.user.is_authenticated:
            return obj.likes.filter(pk=request.user.pk).exists()
        return False

    # ▼▼▼ [핵심 수정 2] get_likes_count 메서드 추가 ▼▼▼
    def get_likes_count(self, obj):
        # Post 인스턴스인 경우에만 좋아요 개수를 반환하고,
        # dict 객체가 들어왔을 경우 (게시글 생성 직후) 0을 반환하여 에러를 방지합니다.
        if isinstance(obj, Post):
            return obj.likes.count()
        return 0
    # ▲▲▲ [핵심 수정 2] ▲▲▲

    def get_scraps_count(self, obj):
        # ▼▼▼ [핵심 수정] obj가 Post 인스턴스인지 확인하고, 필드명을 'scraps'로 통일 ▼▼▼
        if not isinstance(obj, Post):
            return 0
            
        return obj.scraps.count() # Post 모델의 ManyToMany 필드 이름은 'scraps'입니다.
        # ▲▲▲ [핵심 수정] ▲▲▲
        
    def get_is_scrapped(self, obj):
        request = self.context.get('request', None)
        
        # ▼▼▼ [핵심 수정] obj가 Post 인스턴스인지 확인 ▼▼▼
        if not isinstance(obj, Post):
            return False
        # ▲▲▲ [핵심 수정] ▲▲▲

        if request and request.user.is_authenticated:
            # 필드명을 'scraps'로 통일
            return obj.scraps.filter(pk=request.user.pk).exists()
        return False
        
    def get_board_info(self, obj):
        # ▼▼▼ [핵심 수정] obj가 Post 모델 인스턴스가 아니면 즉시 None 반환 ▼▼▼
        if not isinstance(obj, Post):
            return None
        # ▲▲▲ [핵심 수정] ▲▲▲

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
                # ▼▼▼ [수정] .name -> .title 로 변경 (ClanBoard 모델 필드명 일치) ▼▼▼
                'name': obj.clan_board.title, 
                # ▲▲▲ [수정] ▲▲▲
                'clan_id': obj.clan_board.clan_id 
            }
        return None
        
    def validate(self, data):
        board = data.get('board', None)
        clan_board = data.get('clan_board', None)

        # ▼▼▼ [핵심 수정 2] 생성 시 Serializer의 ForeignKey 검증 로직을 제거합니다. ▼▼▼
        # PostCreateView.perform_create에서 board/clan_board 객체를 수동으로 주입하므로,
        # is_valid() 단계에서 불필요한 오류가 발생하지 않도록 이 검증을 건너뜁니다.
        # if self.instance:
        #     pass
        # else:
        #     if not board and not clan_board:
        #         raise serializers.ValidationError("게시판(board) 또는 클랜 게시판(clan_board) 중 하나는 반드시 선택해야 합니다.")
            
        # if board and clan_board:
        #     raise serializers.ValidationError("게시판(board)과 클랜 게시판(clan_board)을 동시에 선택할 수 없습니다.")
        # ▲▲▲ [핵심 수정 2] ▲▲▲
            
        return data