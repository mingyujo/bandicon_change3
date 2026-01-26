from django.urls import path
from . import admin_views

urlpatterns = [
    path('pending-users', admin_views.AdminPendingUsersView.as_view(), name='admin-pending-users'),
    path('approve-user', admin_views.AdminApproveUserView.as_view(), name='admin-approve-user'),
    path('set-role', admin_views.AdminSetRoleView.as_view(), name='admin-set-role'),
    
    # 팝업 공지 URLs
    path('popup-announcements', admin_views.AdminPopupAnnouncementListView.as_view(), name='admin-popup-announcements'),
    path('popup-announcements/<int:pk>/deactivate', admin_views.AdminPopupAnnouncementDeactivateView.as_view(), name='admin-popup-announcement-deactivate'),
]
