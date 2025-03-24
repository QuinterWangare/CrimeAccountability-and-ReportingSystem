from django.urls import path
from .views import index, signup_view, login_view,logout_view, citizen_homepage, citizen_profile, report_crime, \
    anonymous_report, inspector_general_dashboard, inspector_general_login, inspector_general_profile, \
    inspector_general_case_assignment, inspector_general_case_management, inspector_general_analytics, \
    inspector_general_officer_oversight, get_report_stats, get_recent_reports, get_notifications, report_detail, \
    all_reports, get_user_report_stats, update_profile, change_password, police_dashboard, police_cases, \
    police_evidence, police_statistics, police_profile, police_report, police_login

urlpatterns = [
    path('', index, name='index'),
    path('signup/', signup_view, name='signup'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('citizens/', citizen_homepage, name='citizens'),
    path('citizen-profile/', citizen_profile, name='citizen-profile'),
    path('reportcrime/', report_crime, name='reportcrime'),
    path('anonymousreport/', anonymous_report, name='anonymousreport'),
    path('police/dashboard/', police_dashboard, name='police_dashboard'),
    path('police/cases/', police_cases, name='police_cases'),
    path('police/evidence/', police_evidence, name='police_evidence'),
    path('police/statistics/', police_statistics, name='police_statistics'),
    path('police/profile/', police_profile, name='police_profile'),
    path('police/report/', police_report, name='police_report'),
    path('police/login/', police_login, name='police_login'),
    path('inspectorgeneral/dashboard/', inspector_general_dashboard, name='inspectorgeneral_dashboard'),
    path('inspectorgeneral/login/', inspector_general_login, name='inspectorgeneral_login'),
    path('inspectorgeneral/profile/', inspector_general_profile, name='inspectorgeneral_profile'),
    path('inspectorgeneral/assign-case/', inspector_general_case_assignment, name='inspectorgeneral_case_assignment'),
    path('inspectorgeneral/case-management/', inspector_general_case_management, name='inspectorgeneral_case_management'),
    path('inspectorgeneral/analytics/', inspector_general_analytics, name='inspectorgeneral_analytics'),
    path('inspectorgeneral/officer-oversight/', inspector_general_officer_oversight, name='inspectorgeneral_officer_oversight'),
    path('api/stats/', get_report_stats, name='api_stats'),
    path("api/user-report-stats/", get_user_report_stats, name="user_report_stats"),
    path('api/recent-reports/', get_recent_reports, name='api_recent_reports'),
    path('report-detail/<str:tracking_number>/', report_detail, name='report_detail'),
    path('all-reports/', all_reports, name='all_reports'),
    path('api/notifications/', get_notifications, name='api_notifications'),
    path("api/update-profile/", update_profile, name="update_profile"),
    path("api/change-password/", change_password, name="change_password"),
]