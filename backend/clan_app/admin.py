# clan_app/admin.py
from django.contrib import admin
from .models import Clan, ClanChat, ClanBoard, ClanJoinRequest, ClanAnnouncement, ClanEvent
class ClanAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'created_at') # 목록에 표시할 필드
    # 'members'와 'admins' 필드를 사용하기 편한 UI로 변경
    filter_horizontal = ('members', 'admins') 
    search_fields = ('name', 'owner__nickname') # 검색 기능

    # [핵심] Admin에서 모델을 저장할 때 실행되는 함수
    def save_model(self, request, obj, form, change):
        # 1. 일단 모델을 저장합니다 (ID 생성을 위해)
        super().save_model(request, obj, form, change)
        
        # 2. 'change'가 False = "새로 생성"
        if not change:
            # 3. 새 클랜이면, members 목록에 owner를 추가합니다.
            obj.members.add(obj.owner)
            # (M2M 관계는 .save()가 즉시 필요 없습니다)
# ▲▲▲ [신규] ▲▲▲

# ▼▼▼ [수정] Clan을 ClanAdmin과 함께 등록합니다 ▼▼▼
admin.site.register(Clan, ClanAdmin)
# ▲▲▲ [수정] ▲▲▲

admin.site.register(ClanChat)
admin.site.register(ClanBoard)
admin.site.register(ClanJoinRequest)
admin.site.register(ClanAnnouncement)
admin.site.register(ClanEvent)