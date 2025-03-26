import json

from django.contrib.auth.hashers import check_password
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.shortcuts import get_object_or_404
import smtplib
from django.core.mail import send_mail, BadHeaderError

from .forms import CrimeReportForm
from .models import CustomUser, CrimeReport
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from django.conf import settings
import uuid

def get_report_stats(request):
    """API to get total reports count and status-wise breakdown."""

    # Ensure status field exists (Modify as per actual model field)
    total_reports = CrimeReport.objects.filter(user=request.user).count()
    active_cases = CrimeReport.objects.filter(user=request.user, status="Active").count()
    resolved_cases = CrimeReport.objects.filter(user=request.user, status="Resolved").count()
    pending_cases = CrimeReport.objects.filter(user=request.user, status="Pending").count()

    stats = {
        "total_reports": total_reports,
        "active_cases": active_cases,
        "resolved_cases": resolved_cases,
        "pending_cases": pending_cases
    }

    return JsonResponse(stats)

def get_recent_reports(request):
    """API to fetch the most recent reports."""
    reports = CrimeReport.objects.order_by('-incident_datetime')[:5]
    reports_data = [
        {
            "tracking_number": report.tracking_number,
            "type": report.crime_type,
            "location": report.location,
            "status": "Pending",  # Modify if there's a status field
            "date": report.incident_datetime.strftime("%Y-%m-%d %H:%M:%S")
        }
        for report in reports
    ]
    return JsonResponse({"reports": reports_data})

@login_required
def get_user_report_stats(request):
    """API to get total reports count and status breakdown for the logged-in user."""
    total_reports = CrimeReport.objects.filter(user=request.user).count()
    pending_cases = CrimeReport.objects.filter(user=request.user, status="Pending").count()
    resolved_cases = CrimeReport.objects.filter(user=request.user, status="Resolved").count()

    stats = {
        "total_reports": total_reports,
        "pending_cases": pending_cases,
        "resolved_cases": resolved_cases,
    }
    return JsonResponse(stats)


def report_detail(request, tracking_number):
    """Retrieve a single report and return JSON data."""
    report = get_object_or_404(CrimeReport, tracking_number=tracking_number)

    report_data = {
        "tracking_number": report.tracking_number,
        "crime_type": report.crime_type,
        "location": report.location,
        "date": report.incident_datetime.strftime("%Y-%m-%d %H:%M:%S"),
        "description": report.description,
        "status": "Pending"  # Change if there's an actual status field
    }
    return JsonResponse(report_data)

@login_required
def all_reports(request):
    """Retrieve and display crime reports for the logged-in user."""
    reports = CrimeReport.objects.filter(user=request.user).order_by('-incident_datetime')  # ✅ Only user's reports
    return render(request, "all_reports.html", {"reports": reports})

#Recet reports by user
def get_recent_reports_by_user(request):
    """API to fetch the most recent reports by the logged-in user."""
    reports = CrimeReport.objects.filter(user=request.user).order_by('-incident_datetime')[:5]
    reports_data = [
        {
            "tracking_number": report.tracking_number,
            "type": report.crime_type,
            "location": report.location,
            "status": "Pending",  # Modify if there's a status field
            "date": report.incident_datetime.strftime("%Y-%m-%d %H:%M:%S")
        }
        for report in reports
    ]
    return JsonResponse({"reports": reports_data})

def get_notifications(request):
    """API to fetch the latest crime report notifications."""
    if not request.user.is_authenticated:
        return JsonResponse({"notifications": []})  # Return empty for guests

    reports = CrimeReport.objects.filter(user=request.user).order_by('-incident_datetime')[:5]

    notifications = [
        {
            "message": f"Your report {report.tracking_number} ({report.crime_type}) has been received.",
            "date": report.incident_datetime.strftime("%Y-%m-%d %H:%M:%S")
        }
        for report in reports
    ]
    return JsonResponse({"notifications": notifications})

def index(request):
    return render(request, 'index.html')

def signup_view(request):
    if request.method == "POST":
        first_name = request.POST["fname"]
        last_name = request.POST["lname"]
        email = request.POST["email"]
        password1 = request.POST["password"]
        password2 = request.POST["confirmPassword"]

        if password1 != password2:
            messages.warning(request, "Passwords do not match!")
            return redirect("signup")

        if CustomUser.objects.filter(email=email).exists():
            messages.warning(request, "Email is already registered!")
            return redirect("signup")

        # ✅ Generate a unique Citizen ID
        citizen_id = f"CTZ-{uuid.uuid4().hex[:6].upper()}"

        user = CustomUser.objects.create_user(
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=password1,
            citizen_id=citizen_id  # ✅ Save citizen ID
        )
        user.is_staff = False
        user.is_superuser = False
        user.save()

        messages.success(request, "Account created successfully! You can now log in.")
        return redirect("login")

    return render(request, "signup.html")

@csrf_exempt
def login_view(request):
    if request.method == "POST":
        email = request.POST["email"]
        password = request.POST["password"]
        user = authenticate(request, username=email, password=password)

        if user is not None:
            login(request, user)
            return redirect("citizens" )  # Redirect to a dashboard or homepage
        else:
            messages.warning(request, "Invalid email or password!")
            return redirect("login")

    return render(request, "login.html")

def logout_view(request):
    logout(request)
    messages.success(request, "You have been logged out.")
    return redirect('login')

def logout_view_ig(request):
    logout(request)
    messages.success(request, "You have been logged out.")
    return redirect('inspectorgeneral_login')

def citizen_homepage(request):
    return render(request, 'homepage.html')

@login_required
def report_crime(request):
    if request.method == "POST":
        form = CrimeReportForm(request.POST, request.FILES)
        if form.is_valid():
            crime_report = form.save(commit=False)
            crime_report.user = request.user
            crime_report.tracking_number = uuid.uuid4().hex[:10]  # Generate unique tracking number
            crime_report.save()

            # Use the email provided in the report form
            recipient_email = request.POST.get("contact_email",
                                            request.user.email)  # Use form email or fallback to user's email

            # Ensure recipient email is valid before sending
            if recipient_email:
                try:
                    subject = "Crime Report Submitted - Tracking Number"
                    message = f"""
                    Dear {request.user.first_name},

                    Your crime report has been submitted successfully. Your tracking number is {crime_report.tracking_number}.

                    You can use this tracking number to follow up on your report.

                    Best regards,
                    CARS Team
                    """
                    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [recipient_email])

                except (smtplib.SMTPAuthenticationError, BadHeaderError) as e:
                    pass

            return JsonResponse(
                {"message": "Report submitted successfully!", "tracking_number": crime_report.tracking_number})

        return JsonResponse({"message": "Form is not valid!", "errors": form.errors}, status=400)

    form = CrimeReportForm()
    return render(request, "reportCrime.html", {"form": form})

@csrf_exempt
@login_required
def update_profile(request):
    """Handles updating user profile."""
    if request.method == "POST":
        data = json.loads(request.body)
        user = request.user

        # Update fields
        user.first_name = data.get("first_name", user.first_name)
        user.last_name = data.get("last_name", user.last_name)
        user.email = data.get("email", user.email)
        user.save()

        return JsonResponse({"message": "Profile updated successfully!"})

    return JsonResponse({"error": "Invalid request"}, status=400)

@csrf_exempt
@login_required
def change_password(request):
    """Handles password change."""
    if request.method == "POST":
        data = json.loads(request.body)
        user = request.user

        current_password = data.get("current_password")
        new_password = data.get("new_password")
        confirm_password = data.get("confirm_password")

        if not check_password(current_password, user.password):
            return JsonResponse({"error": "Current password is incorrect"}, status=400)

        if new_password != confirm_password:
            return JsonResponse({"error": "New passwords do not match"}, status=400)

        # Change password
        user.set_password(new_password)
        user.save()
        update_session_auth_hash(request, user)  # Keep the user logged in

        return JsonResponse({"message": "Password updated successfully!"})

    return JsonResponse({"error": "Invalid request"}, status=400)


def anonymous_report(request):
    """Handles anonymous crime reports."""
    if request.method == "POST":
        print("🔍 Received POST request for anonymous report")

        form = CrimeReportForm(request.POST, request.FILES)

        if form.is_valid():
            print("✅ Form is valid")

            crime_report = form.save(commit=False)
            crime_report.user = None  # ✅ Ensure it's an anonymous report
            crime_report.tracking_number = uuid.uuid4().hex[:10]  # ✅ Generate tracking number
            crime_report.save()

            print(f"📌 Report saved! Tracking Number: {crime_report.tracking_number}")

            return JsonResponse({
                "message": "Anonymous report submitted successfully!",
                "tracking_number": crime_report.tracking_number  # ✅ Always return tracking number
            }, status=200)

        # Log form errors for debugging
        print("🚨 Form Errors:", form.errors)

        return JsonResponse({
            "message": "Form submission failed!",
            "errors": json.loads(form.errors.as_json())  # Convert errors to JSON format
        }, status=400)

    else:
        print("🔍 Received GET request for anonymous report")
        form = CrimeReportForm()
        return render(request, "anonymousReporting.html", {"form": form})

def citizen_profile(request):
    return render(request, 'profile.html')

def inspector_general_dashboard(request):
    return render(request, 'inspectorgeneral/dashboard.html')

def inspector_general_login(request):
    return render(request, 'inspectorgeneral/login.html')

def inspector_general_profile(request):
    return render(request, 'inspectorgeneral/profile.html')

def inspector_general_case_assignment(request):
    return render(request, 'inspectorgeneral/assign-case.html')

def inspector_general_case_management(request):
    return render(request, 'inspectorgeneral/case-management.html')

def inspector_general_analytics(request):
    return render(request, 'inspectorgeneral/analytics.html')

def inspector_general_officer_oversight(request):
    return render(request, 'inspectorgeneral/officer-oversight.html')

# Render all police pages
def police_dashboard(request):
    return render(request, 'police/dashboard.html')

def police_cases(request):
    return render(request, 'police/cases.html')

def police_evidence(request):
    return render(request, 'police/evidence.html')

def police_statistics(request):
    return render(request, 'police/statistics.html')

def police_profile(request):
    return render(request, 'police/profile.html')

def police_report(request):
    return render(request, 'police/report.html')

def police_login(request):
    return render(request, 'police/login.html')