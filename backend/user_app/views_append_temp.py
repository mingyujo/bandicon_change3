
class DirectChatView(APIView):
    """
    1:1 채팅 메시지를 조회하거나 전송합니다.
    GET /api/v1/users/chat/direct/<str:nickname>/
    POST /api/v1/users/chat/direct/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, nickname):
        """
        특정 유저(nickname)와의 채팅 내역 조회
        """
        target_user = get_object_or_404(User, nickname=nickname)
        current_user = request.user

        # 나와 상대방 사이의 메시지 (보낸 것 + 받은 것)
        chats = DirectChat.objects.filter(
            (Q(sender=current_user) & Q(receiver=target_user)) |
            (Q(sender=target_user) & Q(receiver=current_user))
        ).order_by('timestamp')

        serializer = DirectChatSerializer(chats, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """
        메시지 전송
        """
        sender = request.user
        receiver_nickname = request.data.get('receiver')
        
        # serializer data 준비
        data = request.data.copy()
        data['sender'] = sender.nickname # sender는 현재 유저로 강제

        serializer = DirectChatSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            
            # 알림 생성 (상대방에게)
            # 본인이 아닌 경우에만 알림
            if sender.nickname != receiver_nickname:
                try:
                    receiver = User.objects.get(nickname=receiver_nickname)
                    Alert.objects.create(
                        user=receiver,
                        alert_type='SYSTEM', # 또는 CHAT_MESSAGE 타입 추가 고려
                        message=f"{sender.nickname}님이 메시지를 보냈습니다.",
                        related_url=f"/chats/direct/{sender.nickname}",
                        related_id=sender.id
                    )
                except User.DoesNotExist:
                    pass # 이미 serializer에서 검증되겠지만 안전장치

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
