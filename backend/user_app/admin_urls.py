from django.urls import path
from . import admin_views

urlpatterns = [
    path('pending-users', admin_views.AdminPendingUsersView.as_view(), name='admin-pending-users'),
    path('approve-user', admin_views.AdminApproveUserView.as_view(), name='admin-approve-user'),
    path('set-role', admin_views.AdminSetRoleView.as_view(), name='admin-set-role'),
    
    # 팝업 공지 (임시로 비워둠 - 404 방지용 더미 필요 시 추가)
]
