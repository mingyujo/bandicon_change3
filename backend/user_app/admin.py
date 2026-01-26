from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, 
    UserDevice, 
    FriendRequest, 
    VerificationCode, 
    DirectChat,
    Alert
)


class UserAdmin(BaseUserAdmin):
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        # --- 👇 [수정] role, status 추가 ---
        ('Personal info', {'fields': ('nickname', 'email', 'profile_img', 'introduction', 'instruments', 'genres', 'region', 'score', 'role', 'status')}),
        # --- 👆 [수정] ---
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'created_at')}),
        ('Friends', {'fields': ('friends',)}),
    )
    # --- 👇 [수정] role, status 추가 ---
    list_display = ('username', 'nickname', 'email', 'role', 'status', 'is_staff', 'date_joined')
    list_filter = ('status', 'role', 'is_staff', 'is_superuser', 'is_active')
    # --- 👆 [수정] ---
    search_fields = ('username', 'nickname', 'email')
    readonly_fields = ('created_at',)
    filter_horizontal = ('groups', 'user_permissions', 'friends')
    
    actions = ['approve_users']

    def approve_users(self, request, queryset):
        updated_count = queryset.update(status='approved')
        self.message_user(request, f"{updated_count}명의 사용자가 승인되었습니다.")
    approve_users.short_description = "선택한 사용자 승인 (Status -> Approved)"


admin.site.register(User, UserAdmin)
admin.site.register(UserDevice) 
admin.site.register(FriendRequest)
admin.site.register(VerificationCode)
admin.site.register(DirectChat)
admin.site.register(Alert)