# room_app/admin.py
from django.contrib import admin
# --- 👇 [수정] RoomAvailability -> RoomAvailabilitySlot ---
from .models import Room, Session, SessionReservation, Evaluation, GroupChat, RoomAvailabilitySlot

admin.site.register(Room)
admin.site.register(Session)
admin.site.register(SessionReservation)
admin.site.register(Evaluation)
admin.site.register(GroupChat)
# --- 👇 [수정] RoomAvailability -> RoomAvailabilitySlot ---
admin.site.register(RoomAvailabilitySlot)