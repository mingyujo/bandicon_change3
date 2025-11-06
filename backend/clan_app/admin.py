# clan_app/admin.py
from django.contrib import admin
from .models import Clan, ClanChat, ClanBoard, ClanJoinRequest, ClanAnnouncement, ClanEvent

admin.site.register(Clan)
admin.site.register(ClanChat)
admin.site.register(ClanBoard)
admin.site.register(ClanJoinRequest)
admin.site.register(ClanAnnouncement)
admin.site.register(ClanEvent)