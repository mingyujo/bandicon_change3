# support_app/admin.py
from django.contrib import admin
from .models import PopupAnnouncement, PopupAnnouncementRead, Feedback, FeedbackReply, Banner

@admin.register(PopupAnnouncement)
class PopupAnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_active', 'created_by_nickname', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('title', 'content')
    list_editable = ('is_active',)

    def created_by_nickname(self, obj):
        return obj.created_by.nickname if obj.created_by else "-"
    created_by_nickname.short_description = "작성자"

@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ('title', 'image', 'is_active', 'order', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('title',)
    list_editable = ('is_active', 'order')

# admin.site.register(PopupAnnouncement) # 위 데코레이터로 대체
admin.site.register(PopupAnnouncementRead)
admin.site.register(Feedback)
admin.site.register(FeedbackReply)