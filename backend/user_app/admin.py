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
    list_display = ('username', 'nickname', 'email', 'role', 'status', 'is_staff')
    # --- 👆 [수정] ---
    search_fields = ('username', 'nickname', 'email')
    readonly_fields = ('created_at',)
    filter_horizontal = ('groups', 'user_permissions', 'friends')


admin.site.register(User, UserAdmin)
admin.site.register(UserDevice) 
admin.site.register(FriendRequest)
admin.site.register(VerificationCode)
admin.site.register(DirectChat)
admin.site.register(Alert)