import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.contrib.auth import get_user_model

# Django의 User 모델 가져오기
User = get_user_model()

class ClanChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.clan_id = self.scope['url_route']['kwargs']['clan_id']
        print(f"DEBUG: WebSocket Connect Attempt for Clan {self.clan_id}")
        self.room_group_name = f'clan_{self.clan_id}'

        # 그룹에 참여
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # 그룹에서 탈퇴
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # 웹소켓으로 메시지 받기 (프론트 -> 백엔드)
    async def receive(self, text_data):
        data = json.loads(text_data)
        
        msg_type = data.get('type', 'message')

        if msg_type == 'read':
            sender_nickname = data.get('sender')
            # 읽음 처리 DB 업데이트 (읽은 메시지 ID 리스트 반환)
            read_ids = await self.mark_messages_as_read(self.clan_id, sender_nickname)
            
            # 읽음 상태 브로드캐스트 (읽은 메시지 ID 포함)
            if read_ids:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'read_update',
                        'reader': sender_nickname,
                        'read_ids': read_ids,
                        'timestamp': str(timezone.now())
                    }
                )
            return

        # 일반 메시지 처리 (기존 유지)
        message = data.get('message')
        sender_nickname = data.get('sender')

        saved_msg = await self.save_message(self.clan_id, sender_nickname, message)
        initial_unread = await self.get_initial_unread_count(self.clan_id)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'sender': sender_nickname,
                'timestamp': str(timezone.now()),
                'unread_count': initial_unread,
                'id': saved_msg.id if saved_msg else None
            }
        )

    # 그룹에서 메시지 받기 (백엔드 -> 프론트)
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'id': event.get('id'),
            'message': event['message'],
            'sender': event['sender'],
            'timestamp': event['timestamp'],
            'unread_count': event.get('unread_count', 0)
        }))

    # 읽음 업데이트 받기
    async def read_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'read_update',
            'reader': event['reader'],
            'read_ids': event.get('read_ids', []),
            'timestamp': event['timestamp']
        }))

    @database_sync_to_async
    def save_message(self, clan_id, sender_nickname, message):
        from .models import Clan, ClanChat
        try:
            user = User.objects.get(nickname=sender_nickname)
        except User.DoesNotExist:
            return None

        clan = Clan.objects.get(id=clan_id)
        chat = ClanChat.objects.create(clan=clan, sender=user, message=message)
        chat.read_by.add(user)
        return chat

    @database_sync_to_async
    def mark_messages_as_read(self, clan_id, nickname):
        from .models import ClanChat
        read_ids = []
        try:
            user = User.objects.get(nickname=nickname)
            # 내가 아직 안 읽은 메시지 찾기
            unread_chats = ClanChat.objects.filter(clan_id=clan_id).exclude(read_by=user)
            
            # ID 수집
            read_ids = list(unread_chats.values_list('id', flat=True))
            
            # 읽음 처리
            for chat in unread_chats:
                chat.read_by.add(user)
                
        except Exception as e:
            print(f"Error marking as read: {e}")
        
        return read_ids

    @database_sync_to_async
    def get_initial_unread_count(self, clan_id):
        from .models import Clan
        clan = Clan.objects.get(id=clan_id)
        # 전체 멤버 수 - 1 (보낸 사람)
        count = clan.members.count() - 1
        return count if count >= 0 else 0