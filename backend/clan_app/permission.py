# clan_app/permission.py

from rest_framework import permissions
from .models import Clan
class IsClanOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the clan.
        return obj.owner_id == request.user.id

# --- 👇 [오류 수정] 누락된 클래스 추가 ---

# --- [신규 추가] ---
# (views.py에서 import하려던 IsClanOwnerOrReadOnly 추가)
class IsClanOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    Assumes the model instance has an `owner` attribute.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the snippet.
        # (obj가 Clan 모델일 경우)
        if isinstance(obj, Clan):
            return obj.owner == request.user
        
        # (obj가 다른 모델이고 owner 속성이 있을 경우)
        if hasattr(obj, 'owner'):
             return obj.owner == request.user

        # (obj가 author 속성을 가질 경우, 예: Post, Comment)
        if hasattr(obj, 'author'):
             return obj.author == request.user

        return False
# --- [여기까지] ---
class IsClanOwnerOrAdmin(permissions.BasePermission):
    """
    클랜 소유자 또는 관리자만 접근 허용
    (URL에 clan_id가 포함된 view에서 사용)
    """
    def has_permission(self, request, view):
        clan_id = view.kwargs.get('clan_id')
        if not clan_id:
            # clan_id가 URL에 없는 경우 (예: /api/v1/clans/ - 목록 조회/생성)
            # view.kwargs.get('pk')를 사용할 수도 있음 (ClanViewSet의 retrieve, update 등)
            clan_id = view.kwargs.get('pk')
            
        if not clan_id:
            # (예외: ClanViewSet의 'create'는 clan_id가 없어도 인증만 되면 허용)
            if view.action == 'create':
                return request.user.is_authenticated
            return False # clan_id를 찾을 수 없으면 권한 없음

        try:
            clan = Clan.objects.get(id=clan_id)
            return request.user == clan.owner or request.user in clan.admins.all()
        except Clan.DoesNotExist:
            return False

    def has_object_permission(self, request, view, obj):
        # has_permission에서 clan_id 기반으로 이미 체크했지만,
        # 객체 레벨(예: ClanJoinRequest)에서 한 번 더 확인
        
        clan = None
        if isinstance(obj, Clan):
            clan = obj
        elif hasattr(obj, 'clan'):
            clan = obj.clan
        else:
            # clan_id를 URL에서 다시 가져와서 확인
            clan_id = view.kwargs.get('clan_id') or view.kwargs.get('pk')
            if clan_id:
                try:
                    clan = Clan.objects.get(id=clan_id)
                except Clan.DoesNotExist:
                    return False
            else:
                return False # 클랜 정보를 알 수 없으면 권한 없음

        if not clan:
            return False

        return request.user == clan.owner or request.user in clan.admins.all()

# --- [신규 추가] ---
# (views.py에서 import하려던 IsClanMember 추가)
class IsClanMember(permissions.BasePermission):
    """
    클랜 멤버인지 확인 (소유자, 관리자 포함)
    (URL에 clan_id 또는 pk가 포함된 view에서 사용)
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
            
        clan_id = view.kwargs.get('clan_id') or view.kwargs.get('pk')
        if not clan_id:
            return False # clan_id를 찾을 수 없으면 권한 없음

        try:
            clan = Clan.objects.get(id=clan_id)
            # 클랜 멤버이거나, 소유자이거나, 관리자여야 함
            # (Clan 모델 정의에 따라 members가 소유자/관리자를 포함하는지 확인 필요)
            # -> Clan 모델에서 members = ManyToManyField(..., related_name='clans')
            # -> Clan 생성 시 owner가 members에 자동 추가/ 관리자 임명 시 members에 자동 추가
            #    (이 로직이 없다면, 3가지를 모두 체크해야 함)
            
            # 현재 로직: members는 가입 승인 시 추가됨. owner/admins는 별도 필드.
            # 따라서 3가지 모두 확인
            is_member = request.user in clan.members.all()
            is_owner = request.user == clan.owner
            is_admin = request.user in clan.admins.all()
            
            return is_member or is_owner or is_admin

        except Clan.DoesNotExist:
            return False

    def has_object_permission(self, request, view, obj):
        # has_permission에서 이미 체크했지만, 객체 레벨에서도 확인
        clan = None
        if isinstance(obj, Clan):
            clan = obj
        elif hasattr(obj, 'clan'):
            clan = obj.clan
        else:
            clan_id = view.kwargs.get('clan_id') or view.kwargs.get('pk')
            if clan_id:
                try:
                    clan = Clan.objects.get(id=clan_id)
                except Clan.DoesNotExist:
                    return False
            else:
                return False

        if not clan:
            return False

        is_member = request.user in clan.members.all()
        is_owner = request.user == clan.owner
        is_admin = request.user in clan.admins.all()
        
        return is_member or is_owner or is_admin
# --- [여기까지] ---