# user_app/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
# --- 👇 VerificationCode, DirectChat 임포트 추가 ---
from .models import User, DeviceToken, FriendRequest, VerificationCode, DirectChat

####################################3
class CustomUserAdmin(UserAdmin):
    model = User
    # admin 리스트에서 보여줄 필드 목록 (기본값에 nickname, role 추가)
    list_display = ('username', 'nickname', 'email', 'role', 'status', 'is_staff')
    
    # admin에서 사용자 수정 시 보여줄 필드 목록
    # (FastAPI 모델의 커스텀 필드들을 추가)
    fieldsets = UserAdmin.fieldsets + (
        ('밴디콘 추가 정보', {'fields': ('nickname', 'phone', 'skills', 'manner_score', 'badges', 'role', 'status', 'marketing_consent')}),
    )
    # admin에서 사용자 추가 시 보여줄 필드 목록
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('밴디콘 추가 정보', {'fields': ('nickname', 'phone', 'skills', 'manner_score', 'badges', 'role', 'status', 'marketing_consent')}),
    )
# ... (CustomUserAdmin 클래스 코드는 그대로 둠) ...

admin.site.register(User, CustomUserAdmin)
admin.site.register(DeviceToken)
admin.site.register(FriendRequest)

# --- 👇 맨 아래 두 줄 추가 ---
admin.site.register(VerificationCode)
admin.site.register(DirectChat)