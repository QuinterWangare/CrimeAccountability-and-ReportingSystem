from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser, CrimeReport
from django.utils.html import format_html

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ("email", "first_name", "last_name", "is_staff", "is_superuser")
    list_filter = ("is_staff", "is_superuser", "groups")
    ordering = ("email",)
    search_fields = ("email", "first_name", "last_name")

    # ✅ Override fieldsets to remove `username`
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name")}),
        ("Permissions", {"fields": ("is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important Dates", {"fields": ("last_login", "date_joined")}),
    )

    # ✅ Override add_fieldsets to remove `username`
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "first_name", "last_name", "password1", "password2"),
        }),
    )

    filter_horizontal = ("groups", "user_permissions")

class CrimeReportAdmin(admin.ModelAdmin):
    list_display = ('crime_type', 'incident_datetime', 'get_user_email', 'contact_email', 'evidence_link', 'tracking_number')
    search_fields = ('crime_type', 'user__email', 'contact_email', 'tracking_number')
    list_filter = ('crime_type', 'incident_datetime')

    def get_user_email(self, obj):
        return obj.user.email if obj.user else 'Anonymous'
    get_user_email.short_description = 'User Email'

    def evidence_link(self, obj):
        if obj.evidence:
            return format_html('<a href="{}" target="_blank">View Evidence</a>', obj.evidence.url)
        return "No Evidence"
    evidence_link.short_description = 'Evidence'

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(CrimeReport, CrimeReportAdmin)