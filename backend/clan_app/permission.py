# clan_app/permissions.py

from rest_framework import permissions
from .models import Clan

class IsClanOwner(permissions.BasePermission):
    """
    요청한 유저가 URL로 전달된 클랜(pk)의 소유자인지 확인하는 권한
    """
    message = "클랜 소유자만 이 작업(조회)을 수행할 수 있습니다."

    def has_permission(self, request, view):
        # URL로부터 클랜 pk를 가져옵니다.
        clan_id = view.kwargs.get('pk')
        if not clan_id:
            return False
            
        try:
            clan = Clan.objects.get(pk=clan_id)
        except Clan.DoesNotExist:
            return False # 클랜이 없으면 권한 없음

        # 클랜 소유자와 요청한 유저가 동일한지 확인합니다.
        return clan.owner == request.user