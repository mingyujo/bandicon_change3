# user_app/serializers.py

from rest_framework import serializers
from .models import User, FriendRequest, DeviceToken, DirectChat
# (VerificationCode는 API로 직접 반환되지 않으므로 serializer는 불필요)

# --- User ---

class UserBaseSerializer(serializers.ModelSerializer):
    """
    FastAPI의 UserBase  스키마와 유사.
    다른 Serializer에서 중첩으로 사용될 간단한 유저 정보.
    """
    class Meta:
        model = User
        fields = ('id', 'nickname', 'profile_img')


class UserCreateSerializer(serializers.ModelSerializer):
    """
    FastAPI의 UserCreate  스키마를 변환.
    (id는 username으로 매핑)
    """
    # FastAPI의 UserCreate 스키마에서 'id' 필드를 username으로 사용했음 
    id = serializers.CharField(source='username') 
    skills = serializers.JSONField(required=False)

    class Meta:
        model = User
        fields = (
            'id', 
            'password', 
            'nickname', 
            'phone', 
            'email', 
            'skills', 
            'role', 
            'marketing_consent'
        )
        extra_kwargs = {
            'password': {'write_only': True} # 비밀번호는 응답에 포함되지 않도록 설정
        }

    def create(self, validated_data):
        # Django의 create_user()를 사용해 비밀번호를 자동으로 해싱합니다.
        # (FastAPI의 crud.create_user [cite: 689-2169] + security.get_password_hash 역할)
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            nickname=validated_data['nickname'],
            phone=validated_data['phone'],
            email=validated_data.get('email'),
            skills=validated_data.get('skills', {}),
            role=validated_data['role'],
            marketing_consent=validated_data.get('marketing_consent', False),
            
            # FastAPI의 기본값(pending/approved)을 여기서 설정
            status="pending" if validated_data['role'] == "간부" else "approved"
        )
        return user


class UserLoginSerializer(serializers.Serializer):
    """
    FastAPI의 UserLogin  스키마를 변환.
    (DB 모델과 관계없으므로 일반 Serializer 사용)
    """
    id = serializers.CharField()
    password = serializers.CharField(write_only=True)


class NicknameUpdateSerializer(serializers.Serializer):
    """
    FastAPI의 NicknameUpdate  스키마를 변환.
    """
    current_nickname = serializers.CharField()
    new_nickname = serializers.CharField()


# --- Friends ---

class FriendRequestSerializer(serializers.ModelSerializer):
    """
    FastAPI의 FriendRequest  스키마를 변환.
    """
    sender = UserBaseSerializer(read_only=True)
    
    class Meta:
        model = FriendRequest
        fields = ('id', 'sender', 'status')


class FriendsListSerializer(serializers.Serializer):
    """
    FastAPI의 FriendsList  스키마를 변환.
    """
    friends = UserBaseSerializer(many=True, read_only=True)
    pending_requests = FriendRequestSerializer(many=True, read_only=True)


# --- Chat & Device ---

class DeviceTokenSerializer(serializers.ModelSerializer):
    """
    FastAPI의 DeviceTokenIn  스키마와 유사.
    """
    class Meta:
        model = DeviceToken
        fields = ('token',)


class DirectChatSerializer(serializers.ModelSerializer):
    """
    FastAPI의 DirectChatMessage  스키마를 변환.
    """
    class Meta:
        model = DirectChat
        fields = ('id', 'sender', 'receiver', 'message', 'timestamp', 'image_url', 'is_read')