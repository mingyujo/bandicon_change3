# clan_app/serializers.py

from rest_framework import serializers
from .models import Clan, ClanJoinRequest, ClanAnnouncement
# User 모델을 직접 참조하는 대신 settings를 사용하는 것이 좋습니다.
# from django.conf import settings
# User = settings.AUTH_USER_MODEL 
# (하지만 여기서는 owner 이름만 가져올 거라 필요 없겠네요)
class ClanInfoSerializer(serializers.ModelSerializer):
    # owner를 nested object로 변경
    owner = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Clan
        fields = ['id', 'name', 'description', 'owner', 'members_count', 'members']
        read_only_fields = ['owner']
    
    def get_owner(self, obj):
        """owner를 {id, nickname} 형태로 반환"""
        if obj.owner:
            return {
                'id': obj.owner.id,
                'nickname': obj.owner.nickname
            }
        return None
    
    def get_members_count(self, obj):
        return obj.members.count()
# class ClanInfoSerializer(serializers.ModelSerializer):
#     """
#     클랜 목록(GET) 및 생성(POST)을 위한 Serializer
#     """
    
#     # owner 필드는 '읽기 전용'으로 설정하고, ID 대신 username을 보여줍니다.
#     # POST로 생성 시에는 view 로직에서 request.user를 직접 할당할 것입니다.
#     owner = serializers.SerializerMethodField(read_only=True)
    
#     # 'members_count'라는 필드를 커스텀으로 추가합니다.
#     members_count = serializers.SerializerMethodField()

#     class Meta:
#         model = Clan
#         # 'members' 필드는 제외합니다. (목록이므로)
#         # 'owner'는 read_only_fields에 포함시켜 POST 요청 시 받지 않도록 합니다.
#         fields = ['id', 'name', 'description', 'owner', 'members_count']
#         read_only_fields = ['owner']

#     def get_members_count(self, obj):
#         """
#         SerializerMethodField('members_count')의 값을 계산합니다.
#         obj는 Clan 인스턴스입니다.
#         """
#         # obj.members는 ManyToMany 관계입니다. .count()로 개수를 셉니다.
#         return obj.members.count()


class ClanDetailSerializer(serializers.ModelSerializer):
    """
    클랜 상세 정보를 위한 Serializer
    """
    # owner 필드는 '읽기 전용'으로, ID 대신 username을 보여줍니다.
    owner = serializers.StringRelatedField(read_only=True)
    
    # 'members' 필드를 (단순히 숫자 대신) 사용자 이름의 '리스트'로 보여줍니다.
    members = serializers.SerializerMethodField()
    
    # (선택 사항) 나중에 게시판, 공지사항 목록 등도 여기에 추가할 수 있습니다.
    # boards = ClanBoardSerializer(many=True, read_only=True)
    # announcements = ClanAnnouncementSerializer(many=True, read_only=True)

    class Meta:
        model = Clan
        # 'members_count' 대신 'members' 필드를 포함시킵니다.
        fields = ['id', 'name', 'description', 'owner', 'members']

#클랜 가입 신청
class ClanJoinRequestSerializer(serializers.ModelSerializer):
    """
    클랜 가입 신청 목록을 보여주기 위한 Serializer
    """
    # user와 clan 필드는 ID 대신 이름을 보여줍니다.
    user = serializers.StringRelatedField(read_only=True)
    clan = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = ClanJoinRequest
        # 'user', 'clan', 'status' 필드를 보여줍니다.
        fields = ['id', 'user', 'clan', 'status']

class ClanAnnouncementSerializer(serializers.ModelSerializer):
    """
    클랜 공지사항 생성(POST) 및 조회(GET)를 위한 Serializer
    """
    # clan 필드는 '읽기 전용'으로 설정합니다.
    # 생성 시에는 View 로직에서 URL을 통해 clan 객체를 직접 할당할 것입니다.
    clan = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = ClanAnnouncement
        # 'clan'은 read_only_fields에 포함시켜 POST 요청 시 받지 않도록 합니다.
        fields = ['id', 'clan', 'title', 'content', 'created_at']
        read_only_fields = ['clan', 'created_at']