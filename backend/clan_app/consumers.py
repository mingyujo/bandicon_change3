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
        message = data['message']
        sender_nickname = data['sender'] # 프론트에서 보낸 건 '닉네임 문자열'

        # DB 저장 (비동기 처리)
        # 여기서 닉네임을 넘기면 save_message 안에서 User 객체로 변환합니다.
        await self.save_message(self.clan_id, sender_nickname, message)

        # 그룹 전체에 메시지 전송 (여기선 닉네임 그대로 보냄)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'sender': sender_nickname,
                'timestamp': str(timezone.now())
            }
        )

    # 그룹에서 메시지 받기 (백엔드 -> 프론트)
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'sender': event['sender'],
            'timestamp': event['timestamp']
        }))

    @database_sync_to_async
    def save_message(self, clan_id, sender_nickname, message):
        from .models import Clan, ClanChat
        
        # 1. 닉네임 문자열로 실제 User 객체를 찾습니다.
        try:
            user = User.objects.get(nickname=sender_nickname)
        except User.DoesNotExist:
            # 유저가 없으면 저장하지 않고 리턴 (또는 에러 로그)
            print(f"User with nickname {sender_nickname} not found.")
            return

        clan = Clan.objects.get(id=clan_id)
        
        # 2. sender 필드에 닉네임(String) 대신 유저 객체(User Instance)를 넣습니다.
        ClanChat.objects.create(clan=clan, sender=user, message=message)