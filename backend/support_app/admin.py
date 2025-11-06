# support_app/admin.py
from django.contrib import admin
from .models import PopupAnnouncement, PopupAnnouncementRead, Feedback, FeedbackReply

admin.site.register(PopupAnnouncement)
admin.site.register(PopupAnnouncementRead)
admin.site.register(Feedback)
admin.site.register(FeedbackReply)