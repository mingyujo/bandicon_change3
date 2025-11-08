from rest_framework import serializers
from .models import Room, Session, GroupChat, Evaluation, SessionReservation
# --- 👇 [신규] User 모델 임포트 ---
from user_app.models import User


# --- 👇 [신규] 평가 대상 유저 정보 Serializer ---
class LimitedUserSerializer(serializers.ModelSerializer):
    """
    평가 대상 유저의 닉네임과 프로필 이미지만 반환하는 Serializer
    """
    class Meta:
        model = User
        fields = ['nickname', 'profile_img']

# --- 👇 [신규] 평가 목록 Serializer (GET 요청용) ---
class EvaluationListSerializer(serializers.ModelSerializer):
    """
    GET /evaluations/ 요청 시, 평가해야 할 대상 목록을 반환
    """
    target = LimitedUserSerializer(read_only=True)

    class Meta:
        model = Evaluation
        fields = ['id', 'target']


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ['session_name', 'participant_nickname']

class RoomSerializer(serializers.ModelSerializer):
    sessions = SessionSerializer(many=True, read_only=True)
    # is_manager 필드는 SerializerMethodField로 직접 구현
    is_manager = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            'id', 'title', 'song', 'artist', 'description', 
            'sessions', 'manager_nickname', 'is_private', 
            'confirmed', 'ended', 'created_at', 'clan',
            'is_manager' # is_manager 추가
        ]
        
    def get_is_manager(self, obj):
        # 이 Serializer가 호출되는 context에서 request를 가져옴
        request = self.context.get('request')
        if request and hasattr(request, "user") and request.user.is_authenticated:
             # (JWT 인증 로직이 완성되면 request.user.nickname으로 변경)
             # 임시로 쿼리 파라미터나 다른 방식으로 현재 유저 닉네임을 받아야 함
             # 여기서는 임시로직으로, 실제 구현 시 JWT 유저를 사용해야 함
            current_nickname = request.query_params.get('nickname') # 예시
            return obj.manager_nickname == current_nickname
        
        # 클랜 방 목록 등 [cite: 318-348] 비로그인 유저가 볼 경우
        if request:
            current_nickname = request.query_params.get('nickname')
            if current_nickname:
                return obj.manager_nickname == current_nickname

        return False

class RoomCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=100)
    song = serializers.CharField(max_length=100)
    artist = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True)
    is_private = serializers.BooleanField(default=False)
    password = serializers.CharField(required=False, allow_blank=True, max_length=20)
    clan_id = serializers.IntegerField(required=False, allow_null=True)
    sessions = serializers.ListField(
        child=serializers.CharField(max_length=50),
        min_length=1,
        max_length=10
    )

    def validate(self, data):
        if data['is_private'] and not data.get('password'):
            raise serializers.ValidationError("비공개 방은 비밀번호가 필요합니다.")
        return data

class RoomUpdateSerializer(serializers.Serializer):
    # PUT /rooms/{room_id}
    title = serializers.CharField(max_length=100)
    song = serializers.CharField(max_length=100)
    artist = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True)
    nickname = serializers.CharField(max_length=100) # 방장 확인용


class GroupChatSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupChat
        fields = ['id', 'room', 'sender', 'message', 'timestamp', 'file_url']
        read_only_fields = ['id', 'room', 'timestamp']


class MannerEvalSerializer(serializers.ModelSerializer):
    """
    [삭제] 이 Serializer는 MannerEval.js의 POST 요청과 맞지 않아 사용하지 않음
    대신 views.py에서 POST 요청을 수동으로 처리
    """
    # evaluator_nickname = serializers.CharField(write_only=True)
    # target_nickname = serializers.CharField(write_only=True)
    class Meta:
        model = Evaluation
        fields = ['id', 'room_id', 'score', 'comment'] # 'evaluator_nickname', 'target_nickname', 
        # (필드가 간소화됨. 실제 로직은 View에서 처리)


# (RoomAvailability 관련 Serializer 생략)
class UpdateAvailabilityRequestSerializer(serializers.Serializer):
    nickname = serializers.CharField()
    room_id = serializers.IntegerField()
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()
    available = serializers.BooleanField()

class AvailabilitySlotSerializer(serializers.Serializer):
    start = serializers.DateTimeField()
    end = serializers.DateTimeField()
    available_members = serializers.ListField(child=serializers.CharField())
    unavailable_members = serializers.ListField(child=serializers.CharField())

# --- 👇👇👇 [신규] ImportError 해결을 위해 추가 (1/2) ---
class RoomInfoForActivitySerializer(serializers.ModelSerializer):
    """
    clan_app.views에서 Import 에러가 발생하지 않도록 추가
    클랜 멤버 활동 내역 표시에 사용
    """
    class Meta:
        model = Room
        fields = ['id', 'title', 'song', 'artist', 'ended_at']

# --- 👇👇👇 [신규] ImportError 해결을 위해 추가 (2/2) ---
class MemberActivitySerializer(serializers.ModelSerializer):
    """
    clan_app.views에서 Import 에러가 발생하지 않도록 추가
    클랜 멤버 활동 내역(참여 세션) 표시에 사용
    """
    # 'room' 필드를 위에서 정의한 RoomInfoSerializer로 중첩
    room = RoomInfoForActivitySerializer(read_only=True) 

    class Meta:
        model = Session # 이 Serializer는 Session 모델을 기반으로 함
        fields = ['id', 'session_name', 'participant_nickname', 'room']