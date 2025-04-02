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
from django.db.models.functions import TruncMonth
from .models import CustomUser, CrimeReport, PoliceUser
from django.views import View
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
        "status": report.status  # Change if there's an actual status field
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
            "status": report.status,  # Modify if there's a status field
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

@csrf_exempt
def inspector_general_login(request):
    if request.method == "POST":
        badge_number = request.POST.get("badge_number")
        password = request.POST.get("password")
        
        # Authenticate using badge number
        user = authenticate(request, badge_number=badge_number, password=password)
        
        if user is not None:
            login(request, user)
            return redirect('inspectorgeneral_dashboard') 
        else:
            messages.error(request, "Invalid credentials or insufficient permissions")
    
    return render(request, "inspectorgeneral/login.html")

@login_required(login_url='inspectorgeneral_login')
def inspector_general_dashboard(request):
    """
    View function for the Inspector General dashboard.
    """
    officer = request.user  # The logged-in IG
    
    # Verify the user is actually an IG
    if not hasattr(officer, 'is_ig') or not officer.is_ig:
        messages.error(request, "You do not have permission to access the Inspector General dashboard.")
        return redirect('inspectorgeneral_login')
    
    # Context data for the template
    context = {
        "officer_name": officer.get_full_name(),
        "badge_number": officer.badge_number,
        "email": officer.email,
        "rank": officer.rank,
        "department": officer.department,
        "is_ig": True  # Flag to indicate this is the IG's dashboard
    }
    
    #Get active police officers, total cases, and active cases
    active_officers = PoliceUser.objects.filter(is_active=True).count()
    total_cases = CrimeReport.objects.count()
    active_cases = CrimeReport.objects.filter(status="Active").count()
    
    context.update({
        "active_officers": active_officers,
        "total_cases": total_cases,
        "active_cases": active_cases,
    })
    
    return render(request, "inspectorgeneral/dashboard.html", context)

def inspector_general_profile(request):
    officer = request.user
    
    # Officer details
    context = {
        "officer_name": officer.get_full_name(),
        "badge_number": officer.badge_number,
        "email": officer.email,
        "rank": officer.rank,
        "department": officer.department,
        "phone_number": officer.phone_number,
        "date_joined": officer.date_joined.strftime("%Y-%m-%d"),
        "is_ig": True,
    }
    return render(request, 'inspectorgeneral/profile.html', context)

def inspector_general_case_assignment(request):
    return render(request, 'inspectorgeneral/assign-case.html')

def inspector_general_case_management(request):
    
    officer = request.user
    
    # Officer details
    context = {
        "officer_name": officer.get_full_name(),
        "badge_number": officer.badge_number,
        "email": officer.email,
        "rank": officer.rank,
        "department": officer.department,
        "is_ig": True,
    }
    
    return render(request, 'inspectorgeneral/case-management.html', context)

def inspector_general_analytics(request):
    
    officer = request.user
    
    # Basic Case Statistics
    active_cases = CrimeReport.objects.filter(status="Active").count()
    resolved_cases = CrimeReport.objects.filter(status="Resolved").count()
    pending_cases = CrimeReport.objects.filter(status="Pending").count()
    critical_cases = CrimeReport.objects.filter(status="Critical").count()
    
    # Calculate percentage changes (for the trend indicators)
    # For demonstration purposes - in production you'd compare with previous period
    active_trend = 12
    resolved_trend = 8
    pending_trend = -5
    critical_trend = 15
    
    # Add absolute values for the trends (since Django has no |abs filter)
    active_trend_abs = abs(active_trend)
    resolved_trend_abs = abs(resolved_trend)
    pending_trend_abs = abs(pending_trend)
    critical_trend_abs = abs(critical_trend)
    
    # Case Trends (Last 12 Months)
    end_date = timezone.now()
    start_date = end_date - timedelta(days=365)
    
    monthly_trends = CrimeReport.objects.filter(
        incident_datetime__range=(start_date, end_date)
    ).annotate(
        month=TruncMonth('incident_datetime')
    ).values('month').annotate(
        reported=Count('id'),
        resolved=Count('id', filter=Q(status='Resolved'))
    ).order_by('month')
    
    trend_labels = [trend['month'].strftime("%b %Y") for trend in monthly_trends]
    reported_data = [trend['reported'] for trend in monthly_trends]
    resolved_data = [trend['resolved'] for trend in monthly_trends]
    
    # Cases by Type
    case_types = CrimeReport.objects.values('crime_type').annotate(
        count=Count('id')
    ).order_by('-count')
    
    type_labels = [t['crime_type'] for t in case_types]
    type_values = [t['count'] for t in case_types]
    
    # Officer Performance
    officer_performance = CrimeReport.objects.filter(
        assigned_officer__isnull=False
    ).values(
        'assigned_officer__first_name', 
        'assigned_officer__last_name'
    ).annotate(
        assigned=Count('id'),
        resolved=Count('id', filter=Q(status='Resolved'))
    ).order_by('-resolved')[:5]
    
    officer_labels = [f"{o.get('assigned_officer__first_name', 'Unknown')} {o.get('assigned_officer__last_name', '')}" 
                    for o in officer_performance]
    officer_assigned = [o['assigned'] for o in officer_performance]
    officer_resolved = [o['resolved'] for o in officer_performance]
    
    # Cases by Region
    region_data = CrimeReport.objects.values('location').annotate(
        count=Count('id')
    ).order_by('-count')[:5]
    
    region_labels = [r['location'] for r in region_data]
    region_values = [r['count'] for r in region_data]
    
    
    import json
    context = {
        # Officer details
        "officer_name": officer.get_full_name(),
        "badge_number": officer.badge_number,
        "email": officer.email,
        "rank": officer.rank,
        "department": officer.department,
        "is_ig": True,
        
        # Basic stats
        'active_cases': active_cases,
        'resolved_cases': resolved_cases,
        'pending_cases': pending_cases,
        'critical_cases': critical_cases,
        'active_trend': active_trend,
        'resolved_trend': resolved_trend,
        'pending_trend': pending_trend,
        'critical_trend': critical_trend,
        # Absolute values for trends
        'active_trend_abs': active_trend_abs,
        'resolved_trend_abs': resolved_trend_abs,
        'pending_trend_abs': pending_trend_abs,
        'critical_trend_abs': critical_trend_abs,
        
        # Chart data
        'trend_labels': json.dumps(trend_labels),
        'reported_data': json.dumps(reported_data),
        'resolved_data': json.dumps(resolved_data),
        
        'type_labels': json.dumps(type_labels),
        'type_values': json.dumps(type_values),
        
        'officer_labels': json.dumps(officer_labels),
        'officer_assigned': json.dumps(officer_assigned),
        'officer_resolved': json.dumps(officer_resolved),
        
        'region_labels': json.dumps(region_labels),
        'region_values': json.dumps(region_values),
    }
    
    return render(request, 'inspectorgeneral/analytics.html', context)

def inspector_general_officer_oversight(request):
    
    officer = request.user
    
    # Officer details
    context = {
        "officer_name": officer.get_full_name(),
        "badge_number": officer.badge_number,
        "email": officer.email,
        "rank": officer.rank,
        "department": officer.department,
        "is_ig": True,
    }
    
    # Fetch specialization from database with correct field name
    specialization_values = PoliceUser.objects.values('specialization').distinct()
    
    # Format specialization values into a list of dictionaries with 'name' as the key
    specializations = [{'name': spec['specialization']} for spec in specialization_values if spec['specialization']]
    
    combined_context = {'specializations': specializations}
    combined_context.update(context)
    return render(request, 'inspectorgeneral/officer-oversight.html', combined_context)

def ig_cases_api(request):
    """API to fetch cases for Inspector General dashboard with pagination."""
    # Get filter parameters
    status_filter = request.GET.get('status', '')
    type_filter = request.GET.get('type', '')
    start_date = request.GET.get('start_date', '')
    end_date = request.GET.get('end_date', '')
    search_term = request.GET.get('search', '')
    
    # Get pagination parameters
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 10))  # Show 10 cases per page
    
    # Start with all cases
    cases = CrimeReport.objects.all().order_by('-incident_datetime')
    
    # Apply filters
    if status_filter and status_filter != 'all':
        cases = cases.filter(status__iexact=status_filter)
    
    if type_filter and type_filter != 'all':
        cases = cases.filter(crime_type__iexact=type_filter)
    
    if start_date:
        cases = cases.filter(incident_datetime__date__gte=start_date)
    
    if end_date:
        cases = cases.filter(incident_datetime__date__lte=end_date)
    
    
    
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
        cases_data.append({
            "case_id": case.tracking_number,
            "case_type": case.crime_type,
            "date": case.incident_datetime.isoformat(),
            "reported_on": case.incident_datetime.isoformat(),
            "status": case.status,
            "location": case.location,
            "description": case.description,
            "contact_number": case.contact_number,
            "contact_email": case.contact_email,
            "assigned_officer": "Unassigned" if not hasattr(case, 'assigned_officer') or case.assigned_officer is None else case.assigned_officer.get_full_name(),
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

def ig_case_detail_api(request, case_id):
    """API to fetch details for a specific case for Inspector General."""
    case = get_object_or_404(CrimeReport, tracking_number=case_id)
    
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
        "case_type": case.crime_type,
        "date": case.incident_datetime.isoformat(),
        "reported_on": case.incident_datetime.isoformat(),
        "status": case.status,
        "location": case.location,
        "evidence": evidence_data,
        "description": case.description,
        "contact_number": case.contact_number,
        "contact_email": case.contact_email,
        "assigned_officer": "Unassigned" if not hasattr(case, 'assigned_officer') or case.assigned_officer is None else case.assigned_officer.get_full_name(),
    }
    
    return JsonResponse(case_data)

def ig_available_officers(request):
    """API to fetch available officers for assignment by the Inspector General."""
    if request.method == 'GET':
        # Fetch all available officers
        officers = PoliceUser.objects.filter(is_active=True)  # Adjust the filter as needed
        officer_list = {
            "officers": [
                {
                    'id': officer.badge_number,
                    'name': officer.get_full_name(),
                    'badge_number': officer.badge_number,
                    'specialization': officer.specialization,
                }
                for officer in officers
            ]
        }
        return JsonResponse(officer_list)

    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def ig_assign_case(request):
    """API for Inspector General to assign a case to an officer."""
    if request.method == 'POST':
        try:
            # Parse the JSON request body
            data = json.loads(request.body)
            case_id = data.get('case_id')
            officer_id = data.get('officer_id')

            # Validate the inputs
            if not case_id or not officer_id:
                return JsonResponse({'success': False, 'message': 'Case ID and Officer ID are required.'}, status=400)

            # Get the case and officer objects
            case = get_object_or_404(CrimeReport, tracking_number=case_id)
            officer = get_object_or_404(PoliceUser, badge_number=officer_id)

            # Assign the officer to the case
            case.assigned_officer = officer
            case.save()

            # Return a success response
            return JsonResponse({
                'success': True,
                'message': f'Case {case_id} successfully assigned to Officer {officer.get_full_name()}.',
                'officer_name': officer.get_full_name()
            })

        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON data.'}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    # Return a method not allowed response for non-POST requests
    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)

# Add these to your views.py file

@csrf_exempt
def ig_officer_stats(request):
    """API to get officer statistics for the IG dashboard."""
    try:
        # Get all officers
        officers = PoliceUser.objects.all()
        
        # Count active and inactive officers
        total_officers = officers.count()
        active_officers = officers.filter(is_active=True).count()
        inactive_officers = total_officers - active_officers
        
        # Count assigned and unassigned cases
        assigned_cases = CrimeReport.objects.exclude(assigned_officer=None).count()
        unassigned_cases = CrimeReport.objects.filter(assigned_officer=None).count()
        
        # Calculate average caseload
        average_caseload = "0"
        if active_officers > 0:
            average_caseload = "{:.1f}".format(assigned_cases / active_officers)
        
        # Get department distribution
        departments = PoliceUser.objects.values('department').annotate(count=Count('department'))
        department_distribution = {dept['department']: dept['count'] for dept in departments}
        
        return JsonResponse({
            'total_officers': total_officers,
            'active_officers': active_officers,
            'inactive_officers': inactive_officers,
            'assigned_cases': assigned_cases,
            'unassigned_cases': unassigned_cases,
            'average_caseload': average_caseload,
            'department_distribution': department_distribution
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def ig_officers(request):
    """API to get list of officers for the officer oversight page."""
    try:
        officers = PoliceUser.objects.all().order_by('badge_number')
        
        officers_data = []
        for officer in officers:
            # Count assigned cases
            cases_assigned = CrimeReport.objects.filter(assigned_officer=officer).count()
            
            officers_data.append({
                'badge_number': officer.badge_number,
                'name': f"{officer.first_name} {officer.last_name}",
                'specialization': officer.specialization,
                'cases_assigned': cases_assigned,
                'is_active': officer.is_active
            })
        
        return JsonResponse({
            'officers': officers_data
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def ig_officer_detail(request, badge_number):
    """API to get detailed information about a specific officer."""
    try:
        officer = get_object_or_404(PoliceUser, badge_number=badge_number)
        
        # Get current case assignments
        cases = CrimeReport.objects.filter(assigned_officer=officer)
        cases_resolved = cases.filter(status="Resolved").count()
        
        current_cases = []
        for case in cases[:5]:  # Limit to 5 most recent cases
            current_cases.append({
                'case_id': case.tracking_number,
                'case_type': case.crime_type,
                'status': case.status,
                'date': case.incident_datetime.isoformat()
            })
        
        return JsonResponse({
            'badge_number': officer.badge_number,
            'name': f"{officer.first_name} {officer.last_name}",
            'email': officer.email,
            'specialization': officer.specialization,
            'rank': officer.rank,
            'is_active': officer.is_active,
            'cases_assigned': cases.count(),
            'cases_resolved': cases_resolved,
            'current_cases': current_cases
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def ig_remove_officer(request):
    """API to remove an officer."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        badge_number = data.get('badge_number')
        
        if not badge_number:
            return JsonResponse({'success': False, 'message': 'Badge number is required'}, status=400)
        
        officer = get_object_or_404(PoliceUser, badge_number=badge_number)
        
        # Check if officer has assigned cases
        has_cases = CrimeReport.objects.filter(assigned_officer=officer).exists()
        if has_cases:
            return JsonResponse({
                'success': False, 
                'message': 'Cannot remove officer with assigned cases. Reassign cases first.'
            }, status=400)
        
        # Permanently delete the officer
        officer.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Officer removed successfully'
        })
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

def case_trends(request):
    """API endpoint for case trends over time."""
    end_date = timezone.now()
    start_date = end_date - timedelta(days=365)
    
    # Get monthly trends
    trends = CrimeReport.objects.filter(
        incident_datetime__range=(start_date, end_date)
    ).annotate(
        month=TruncMonth('incident_datetime')
    ).values('month').annotate(
        reported=Count('id'),
        resolved=Count('id', filter=Q(status='Resolved'))
    ).order_by('month')
    
    # Format data for chart
    labels = []
    reported_data = []
    resolved_data = []
    
    for trend in trends:
        labels.append(trend['month'].strftime("%b %Y"))
        reported_data.append(trend['reported'])
        resolved_data.append(trend['resolved'])
    
    return JsonResponse({
        'labels': labels,
        'reported': reported_data,
        'resolved': resolved_data
    })

def case_types(request):
    """API endpoint for case type distribution."""
    types = CrimeReport.objects.values('crime_type').annotate(
        count=Count('id')
    ).order_by('-count')
    
    return JsonResponse({
        'labels': [t['crime_type'] for t in types],
        'values': [t['count'] for t in types]
    })

def resolution_times(request):
    """API endpoint for case resolution times."""
    resolution_data = CrimeReport.objects.filter(
        status='Resolved'
    ).values('crime_type').annotate(
        avg_days=Avg('resolution_time')
    ).order_by('-avg_days')
    
    return JsonResponse({
        'labels': [d['crime_type'] for d in resolution_data],
        'values': [round(d['avg_days'] or 0, 1) for d in resolution_data]
    })

def filtered_analytics(request):
    """API endpoint for filtered analytics data."""
    date_range = request.GET.get('dateRange')
    region = request.GET.get('region')
    case_type = request.GET.get('caseType')
    status = request.GET.get('status')
    
    # Start with all reports
    reports = CrimeReport.objects.all()
    
    # Apply filters
    if date_range and date_range != 'all':
        days = int(date_range)
        start_date = timezone.now() - timedelta(days=days)
        reports = reports.filter(incident_datetime__gte=start_date)
        
    if region and region != 'all':
        reports = reports.filter(location__icontains=region)
        
    if case_type and case_type != 'all':
        reports = reports.filter(crime_type=case_type)
        
    if status and status != 'all':
        reports = reports.filter(status=status)
    
    # Calculate metrics
    total = reports.count()
    resolved = reports.filter(status='Resolved').count()
    resolution_rate = (resolved / total * 100) if total > 0 else 0
    
    return JsonResponse({
        'total_cases': total,
        'resolved_cases': resolved,
        'resolution_rate': round(resolution_rate, 1),
        'case_types': dict(reports.values('crime_type').annotate(count=Count('id')).values_list('crime_type', 'count')),
        'status_distribution': dict(reports.values('status').annotate(count=Count('id')).values_list('status', 'count'))
    })

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
            "case_type": case.crime_type,
            "date": case.incident_datetime.isoformat(),
            "status": ui_status,
            "location": case.location,
            "description": case.description,
            "contact_number":case.contact_number,
            "contact_email": case.contact_email,
            "assigned_officer": "Unassigned" if not case.assigned_officer else case.assigned_officer.get_full_name(),
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
        "assigned_officer": case.assigned_officer(),
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
        # Check if it's a form or API request
        if request.content_type == 'application/x-www-form-urlencoded':
            # Form data
            badge_number = request.POST.get('badge_number')
            password = request.POST.get('password')
        else:
            # JSON data from API
            badge_number = request.data.get('badge_number')
            password = request.data.get('password')

        user = authenticate(request, badge_number=badge_number, password=password)

        if user is not None:
            login(request, user)
            
            # Form submission returns redirect
            if request.content_type == 'application/x-www-form-urlencoded':
                return redirect('police_dashboard')
                
            # API request returns JSON
            return Response({
                "message": "Login successful", 
                "redirect": "/police/dashboard/"
            }, status=status.HTTP_200_OK)

        # Form submission returns redirect with message
        if request.content_type == 'application/x-www-form-urlencoded':
            messages.error(request, "Invalid credentials")
            return redirect('police_login')
            
        # API request returns error response
        return Response({
            "message": "Invalid credentials"
        }, status=status.HTTP_401_UNAUTHORIZED)

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
        "phone_number": officer.phone_number,
    }

    return render(request, "police/profile.html", context)

class LogoutView(View):
    def post(self, request):
        logout(request)
        return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
    
    def get(self, request):
        logout(request)
        messages.success(request, "Logged out successfully")
        return redirect('police_login')
    


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
    

def available_officers(request):
    if request.method == 'GET':
        # Fetch all available officers
        officers = PoliceUser.objects.filter(is_active=True)  # Adjust the filter as needed
        officer_list = [
            {
                'id': officer.badge_number,
                'name': officer.get_full_name(),
                'badge': officer.badge_number,
                'specialization': officer.specialization if hasattr(officer, 'specialization') else 'General'
            }
            for officer in officers
        ]
        return JsonResponse(officer_list, safe=False)

    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def assign_case(request):
    if request.method == 'POST':
        try:
            # Parse the JSON request body
            data = json.loads(request.body)
            case_id = data.get('case_id')
            officer_id = data.get('officer_id')

            # Validate the inputs
            if not case_id or not officer_id:
                return JsonResponse({'success': False, 'message': 'Case ID and Officer ID are required.'}, status=400)

            # Get the case and officer objects
            case = get_object_or_404(CrimeReport, tracking_number=case_id)
            officer = get_object_or_404(PoliceUser, badge_number=officer_id)

            # Assign the officer to the case
            case.assigned_officer = officer
            case.save()

            # Return a success response
            return JsonResponse({
                'success': True,
                'message': f'Case {case_id} successfully assigned to Officer {officer.get_full_name()}.',
                'officer_name': officer.get_full_name()
            })

        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON data.'}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    # Return a method not allowed response for non-POST requests
    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)

