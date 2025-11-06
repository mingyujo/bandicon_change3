# room_app/admin.py
from django.contrib import admin
from .models import Room, Session, SessionReservation, Evaluation, GroupChat, RoomAvailability

admin.site.register(Room)
admin.site.register(Session)
admin.site.register(SessionReservation)
admin.site.register(Evaluation)
admin.site.register(GroupChat)
admin.site.register(RoomAvailability)