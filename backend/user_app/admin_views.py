from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework import views, status, permissions
from rest_framework.response import Response
from .serializers import UserBaseSerializer

User = get_user_model()

class IsOperator(permissions.BasePermission):
    """
    운영자(OPERATOR) 권한을 가진 유저만 접근 가능
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'OPERATOR'

class AdminPendingUsersView(views.APIView):
    """
    GET /api/v1/admin/pending-users
    승인 대기 중인 사용자 목록 조회
    """
    permission_classes = [IsOperator]

    def get(self, request):
        # status가 'pending'인 유저들 조회
        pending_users = User.objects.filter(status='pending').order_by('-date_joined')
        
        # UserBaseSerializer 또는 별도 AdminUserSerializer 사용
        # 여기서는 간단히 리스트 반환
        data = []
        for u in pending_users:
            data.append({
                "id": u.id,
                "nickname": u.nickname,
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "status": u.status,
                "date_joined": u.date_joined
            })
        return Response(data, status=status.HTTP_200_OK)

class AdminApproveUserView(views.APIView):
    """
    POST /api/v1/admin/approve-user
    사용자 승인 (status -> approved)
    """
    permission_classes = [IsOperator]

    def post(self, request):
        nickname = request.data.get('nickname')
        if not nickname:
            return Response({"detail": "닉네임이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = get_object_or_404(User, nickname=nickname)
        user.status = 'approved'
        user.save()
        
        return Response({"detail": f"{nickname}님이 승인되었습니다."}, status=status.HTTP_200_OK)

class AdminSetRoleView(views.APIView):
    """
    POST /api/v1/admin/set-role
    사용자 역할 변경
    """
    permission_classes = [IsOperator]

    def post(self, request):
        nickname = request.data.get('nickname')
        new_role = request.data.get('role') # '멤버', '간부', '운영자' (프론트에서 오는 값)
        
        if not nickname or not new_role:
            return Response({"detail": "닉네임과 역할이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        # 프론트엔드의 한글 역할을 백엔드 코드로 매핑
        role_map = {
            "멤버": "USER",
            "간부": "USER", # 간부도 기술적으로는 USER (권한 관리 필요 시 분리) -> 현재 모델엔 USER/OPERATOR만 있음.
            "운영자": "OPERATOR"
        }
        
        # 모델의 choices: [('USER', '사용자'), ('OPERATOR', '운영자')]
        # 따라서 '간부'는 별도 필드가 없으면 USER로 처리하되, 
        # 만약 '간부'라는 Role을 모델에 추가했다면 그걸 써야 함.
        # 현재 코드상 'OPERATOR' 아니면 모두 'USER'로 간주되는 듯 함.
        
        db_role = role_map.get(new_role, "USER")
        
        user = get_object_or_404(User, nickname=nickname)
        user.role = db_role
        
        # 운영자면 is_staff/is_superuser 부여 (선택사항)
        if db_role == 'OPERATOR':
            user.is_staff = True
            user.is_superuser = True
        else:
            user.is_staff = False
            user.is_superuser = False
            
        user.save()
        
        return Response({"detail": f"{nickname}님의 역할이 {new_role}({db_role})로 변경되었습니다."}, status=status.HTTP_200_OK)
