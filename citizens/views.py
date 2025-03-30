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
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.db import models
import os

from django.utils.decorators import method_decorator

from .forms import CrimeReportForm
from django.db.models import Count, Q, F, FloatField, Avg, Case, When, Value
from .models import CustomUser, CrimeReport, PoliceUser
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
import uuid

from rest_framework import status, views
from rest_framework.response import Response
from .serializers import PoliceUserSerializer
from django.contrib.auth.hashers import make_password

def get_report_stats(request):
    """API to get total reports count and status-wise breakdown."""
    
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
            "status": report.status,
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

def get_police_stats(request):
    """API endpoint to provide statistics for the police dashboard."""
    # Calculate core statistics
    active_cases = CrimeReport.objects.filter(status="Active").count()
    pending_reviews = CrimeReport.objects.filter(status="Pending").count()
    resolved_cases = CrimeReport.objects.filter(status="Resolved").count()
    
    # Calculate trends (comparing with previous period)
    # For actual implementation, you would compare with data from previous week
    active_trend = 12  # Percentage change from previous period
    pending_trend = -5  # Negative indicates a decrease
    resolved_trend = 8
    
    return JsonResponse({
        'stats': {
            'active_cases': {
                'count': active_cases,
                'trend': active_trend,
                'trend_direction': 'up' if active_trend >= 0 else 'down'
            },
            'pending_reviews': {
                'count': pending_reviews,
                'trend': pending_trend,
                'trend_direction': 'up' if pending_trend >= 0 else 'down'
            },
            'resolved_cases': {
                'count': resolved_cases,
                'trend': resolved_trend,
                'trend_direction': 'up' if resolved_trend >= 0 else 'down'
            }
        }
    })

def case_analytics(request):
    """API endpoint to provide case analytics data for charts."""
    # Get date range (last 7 days)
    end_date = timezone.now()
    start_date = end_date - timedelta(days=6)  # 7 days including today
    
    # Generate dates for x-axis
    dates = []
    new_cases_data = []
    resolved_cases_data = []
    
    # Process each day
    for i in range(7):
        current_date = start_date + timedelta(days=i)
        date_str = current_date.strftime('%Y-%m-%d')
        dates.append(date_str)
        
        # Count new cases for this day
        new_cases = CrimeReport.objects.filter(
            incident_datetime__date=current_date.date()
        ).count()
        
        # Count all resolved cases
        resolved_cases = CrimeReport.objects.filter(
            status="Resolved"
        ).count() // 7  # Distribute evenly across days
        
        new_cases_data.append(new_cases)
        resolved_cases_data.append(resolved_cases)
        
        # Prepare and return the data
    return JsonResponse({
        'dates': dates,
        'new_cases': new_cases_data,
        'resolved_cases': resolved_cases_data
    })

# Add this to citizens/views.py
def police_cases_api(request):
    """API to fetch cases for police dashboard with pagination."""
    # Get filter parameters
    status_filter = request.GET.get('status', '')
    search_term = request.GET.get('search', '')
    
    # Get pagination parameters
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 10))  # Show 10 cases per page
    
    # Start with all cases
    cases = CrimeReport.objects.all().order_by('-incident_datetime')
    
    # Apply filters
    if status_filter:
        if status_filter == 'open':
            cases = cases.filter(status='Active')
        elif status_filter == 'pending':
            cases = cases.filter(status='Pending')
        elif status_filter == 'closed':
            cases = cases.filter(status__in=['Resolved', 'Closed'])
    
    if search_term:
        cases = cases.filter(
            Q(tracking_number__icontains=search_term) |
            Q(crime_type__icontains=search_term) |
            Q(description__icontains=search_term) |
            Q(location__icontains=search_term)
        )
    
    # Calculate total items and pages
    total_items = cases.count()
    total_pages = (total_items + per_page - 1) // per_page  # Ceiling division
    
    # Apply pagination
    start = (page - 1) * per_page
    end = start + per_page
    paginated_cases = cases[start:end]
    
    # Format cases for response
    cases_data = []
    for case in paginated_cases:
        # Map database status to UI status
        ui_status = {
            "Active": "Active",
            "Pending": "Pending",
            "Resolved": "Closed",
        }.get(case.status, "Open")
        
        cases_data.append({
            "case_id": case.tracking_number,
            "title": case.crime_type,
            "case_type": case.crime_type,
            "date": case.incident_datetime.isoformat(),
            "status": ui_status,
            "location": case.location,
            "description": case.description,
            "assigned_officer": "Unassigned"  # You'll need to add this field to your model
        })
    
    # Return the response with pagination info
    return JsonResponse({
        "cases": cases_data,
        "pagination": {
            "current_page": page,
            "per_page": per_page,
            "total_pages": total_pages,
            "total_items": total_items
        }
    })
    
def police_case_detail_api(request, case_id):
    """API to fetch details for a specific case."""
    case = get_object_or_404(CrimeReport, tracking_number=case_id)
    
    # Same status mapping as above
    ui_status = {
        "Active": "Active",
        "Pending": "Pending",
        "Resolved": "Closed",
    }.get(case.status, "Open")
    
    # Handle evidence file
    evidence_data = []
    if case.evidence and case.evidence.name:
            file_name = os.path.basename(case.evidence.name)
            file_url = f"{settings.MEDIA_URL}{case.evidence.name}"
            
            # Determine file type based on extension
            file_ext = os.path.splitext(file_name)[1].lower()
            if file_ext in ['.jpg', '.jpeg', '.png', '.gif']:
                file_type = 'image'
            elif file_ext in ['.mp4', '.avi', '.mov']:
                file_type = 'video'
            elif file_ext in ['.pdf', '.doc', '.docx']:
                file_type = 'document'
            else:
                file_type = 'file'
                
            evidence_data.append({
                "url": file_url,
                "name": file_name,
                "type": file_type
            })
    
    # Prepare case data
    case_data = {
        "case_id": case.tracking_number,
        "title": case.crime_type,
        "case_type": case.crime_type,
        "date": case.incident_datetime.isoformat(),
        "status": ui_status,
        "location": case.location,
        "evidence": evidence_data,
        "description": case.description,
        "assigned_officer": "Unassigned",
        "timeline": [
            {
                "title": "Case Created",
                "date": case.incident_datetime.isoformat(),
                "description": "Case was created and entered into the system."
            }
        ]
    }
    
    return JsonResponse(case_data)

def crime_stats(request):
    """API endpoint to provide crime type statistics for the police dashboard."""
    # Get crime type distribution
    crime_types = CrimeReport.objects.values('crime_type').annotate(count=Count('crime_type'))
    
    # Format data as crime_type: count dictionary
    crime_type_data = {item['crime_type']: item['count'] for item in crime_types}
    
    # Ensure we have data even if there are no reports
    if not crime_type_data:
        crime_type_data = {
            "Assault": 0,
            "Theft": 0, 
            "Fraud": 0,
            "Vandalism": 0,
            "Other": 0
        }
    
    return JsonResponse(crime_type_data)

def county_stats(request):
    """API endpoint to provide county statistics for the police dashboard."""
    # Get all crime reports
    reports = CrimeReport.objects.all()
    
    # List of Kenyan counties
    KENYA_COUNTIES = [
        "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita/Taveta", 
        "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru", 
        "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua", 
        "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot", 
        "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo/Marakwet", "Nandi", 
        "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho", 
        "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu", 
        "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi"
    ]
    
    # Group by county
    county_data = {}
    
    for report in reports:
        # Initialize with unknown
        county = "Unknown"
        
        if report.location:
            # Split location by comma and clean each part
            location_parts = [part.strip() for part in report.location.split(',')]
            
            # First try to find an exact match
            for part in location_parts:
                if part in KENYA_COUNTIES:
                    county = part
                    break
            
            # If no exact match, check if any county name is contained in any part
            if county == "Unknown":
                for part in location_parts:
                    for kenyan_county in KENYA_COUNTIES:
                        if kenyan_county in part:
                            county = kenyan_county
                            break
                    if county != "Unknown":
                        break
        
        # Initialize county entry if not exists
        if county not in county_data:
            county_data[county] = {
                'county': county,
                'total_cases': 0,
                'solved_cases': 0
            }
        
        # Update statistics
        county_data[county]['total_cases'] += 1
        if report.status == 'Resolved':
            county_data[county]['solved_cases'] += 1
    
    # Format the data for JSON response
    results = []
    for county, data in county_data.items():
        # Calculate clearance rate
        total = data['total_cases']
        solved = data['solved_cases']
        clearance_rate = (solved / total * 100) if total > 0 else 0
        
        results.append({
            'county': data['county'],
            'total_cases': total,
            'solved_cases': solved,
            'clearance_rate': round(clearance_rate, 1)
        })
    
    # Sort by total cases (descending)
    results.sort(key=lambda x: x['total_cases'], reverse=True)
    
    return JsonResponse(results, safe=False)

def dashboard_summary_stats(request):
    """API endpoint to provide summary statistics for the dashboard cards."""
    # Calculate main statistics
    total_cases = CrimeReport.objects.count()
    solved_cases = CrimeReport.objects.filter(status="Resolved").count()
    
    # Calculate clearance rate
    clearance_rate = (solved_cases / total_cases * 100) if total_cases > 0 else 0
    
    return JsonResponse({
        'total_cases': {
            'count': total_cases
        },
        'solved_cases': {
            'count': solved_cases
        },
        'clearance_rate': {
            'value': round(clearance_rate, 1)
        }
    })

@csrf_exempt
def update_report_status(request, tracking_number):
    """API endpoint to update the status of a crime report."""
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method is allowed"}, status=405)
    
    # Get the report
    report = get_object_or_404(CrimeReport, tracking_number=tracking_number)
    
    try:
        # Parse the request body
        data = json.loads(request.body)
        new_status = data.get('status')
        
        # Validate the status
        valid_statuses = ["Active", "Under Investigation", "Pending Review", "Resolved", "Closed"]
        if not new_status or new_status not in valid_statuses:
            return JsonResponse({"error": "Invalid status provided"}, status=400)
        
        # Update the report status
        report.status = new_status
        report.save()
        
        # Return success response
        return JsonResponse({
            "success": True,
            "message": f"Status updated to {new_status}",
            "tracking_number": tracking_number,
            "status": new_status
        })
        
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON in request body"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(views.APIView):
    def post(self, request):
        badge_number = request.data.get('badge_number')
        password = request.data.get('password')

        # Using the correct keyword argument for badge_number
        user = authenticate(request, badge_number=badge_number, password=password)

        if user is not None:
            login(request, user)
            return Response({"message": "Login successful", "redirect": "/police/dashboard/"}, status=status.HTTP_200_OK)

        return Response({"message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

@login_required
def police_dashboard(request):
    officer = request.user  # Assuming the logged-in user is the police officer
    context = {
        "officer_name": officer.get_full_name(),
        "badge_number": officer.badge_number,
        "email": officer.email,
        "rank": officer.rank,
        "department": officer.department,  # Adjust to your model structure
    }
    return render(request, "police/dashboard.html", context)

@login_required
def police_profile(request):
    officer = request.user  # Assuming the logged-in user is the officer

    context = {
        "officer_name": officer.get_full_name(),
        "badge_number": officer.badge_number,
        "email": officer.email,
        "rank": officer.rank,
        "department": officer.department,
    }

    return render(request, "police/profile.html", context)

class LogoutView(views.APIView):
    def post(self, request):
        logout(request)
        return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)


class UpdateProfileView(views.APIView):
    def post(self, request):
        user = request.user
        full_name = request.data.get('full_name')
        email = request.data.get('email')

        if full_name:
            user.username = full_name
        if email:
            user.email = email

        user.save()
        return Response({"message": "Profile updated successfully"})


class ChangePasswordView(views.APIView):
    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not user.check_password(current_password):
            return Response({"message": "Incorrect current password"}, status=status.HTTP_400_BAD_REQUEST)

        user.password = make_password(new_password)
        user.save()
        return Response({"message": "Password changed successfully"})