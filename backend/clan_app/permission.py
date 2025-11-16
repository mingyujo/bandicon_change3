# clan_app/permission.py

from rest_framework import permissions

class IsClanOwner(permissions.BasePermission):
    """
    클랜 소유자(owner)만 접근을 허용하는 권한
    (views.py에서 self.check_object_permissions(request, clan)으로 사용)
    """
    def has_object_permission(self, request, view, obj):
        # obj가 Clan 모델의 인스턴스인지 확인
        # (obj 자체를 clan 객체로 전달받아야 함)
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        # (ClanJoinRequest 등 다른 모델일 경우)
        if hasattr(obj, 'clan'):
            return obj.clan.owner == request.user
            
        return False

# --- 👇 [오류 수정] 누락된 클래스 추가 ---

class IsClanOwnerOrReadOnly(permissions.BasePermission):
    """
    클랜 소유자(owner)는 수정/삭제 가능,
    그 외에는 읽기(GET)만 허용하는 권한
    """
    def has_object_permission(self, request, view, obj):
        # 읽기 요청(GET, HEAD, OPTIONS)은 누구나 허용
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # 쓰기 요청(POST, PUT, PATCH, DELETE)은 클랜 소유자에게만 허용
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
            
        return False