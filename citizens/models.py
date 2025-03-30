from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import AbstractUser, BaseUserManager, Group, Permission, PermissionsMixin, UserManager
from django.db import models
from django.utils import timezone
import uuid

from django.utils.timezone import now


class CustomUserManager(BaseUserManager):
    def create_user(self, email, first_name, last_name, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, first_name=first_name, last_name=last_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, first_name, last_name, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, first_name, last_name, password, **extra_fields)

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    username = None
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    citizen_id = models.CharField(max_length=50, unique=True, null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = CustomUserManager()  # Use the custom manager

    groups = models.ManyToManyField(Group, related_name="customuser_set", blank=True)
    user_permissions = models.ManyToManyField(Permission, related_name="customuser_permissions_set", blank=True)

    def __str__(self):
        return self.email

class CrimeReport(models.Model):
    CRIME_TYPES = [
        ('Theft', 'Theft'),
        ('Assault', 'Assault'),
        ('Vandalism', 'Vandalism'),
        ('Fraud', 'Fraud'),
        ('Domestic Violence', 'Domestic Violence'),
        ('Cybercrime', 'Cybercrime'),
        ('Other', 'Other'),
    ]

    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Active", "Active"),
        ("Resolved", "Resolved"),
    ]

    tracking_number = models.CharField(
        max_length=20,
        unique=True,
        default=uuid.uuid4().hex[:10],  # ✅ Generates a unique tracking number
        editable=False
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="Pending")
    user = models.ForeignKey("CustomUser", on_delete=models.CASCADE, null=True, blank=True)
    crime_type = models.CharField(max_length=50, choices=CRIME_TYPES)
    incident_datetime = models.DateTimeField(default=timezone.now)
    description = models.TextField()
    location = models.TextField()
    evidence = models.FileField(upload_to='evidence/', max_length=255, null=True, blank=True)
    contact_name = models.CharField(max_length=100, null=True, blank=True)
    contact_number = models.CharField(max_length=15, null=True, blank=True)
    contact_email = models.EmailField(null=True, blank=True)
    preferred_contact_method = models.CharField(
        max_length=10,
        choices=[('email', 'Email'), ('phone', 'Phone'), ('none', 'No contact needed')],
        default='none', 
        blank=True
    )

    def __str__(self):
        return f"{self.crime_type} reported on {self.incident_datetime}"


class PoliceUserManager(BaseUserManager):
    def create_user(self, badge_number, email, password=None, **extra_fields):
        if not badge_number:
            raise ValueError("The badge number must be set")
        if not email:
            raise ValueError("The email must be set")

        email = self.normalize_email(email)
        user = self.model(badge_number=badge_number, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, badge_number, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        return self.create_user(badge_number, email, password, **extra_fields)

class PoliceUser(AbstractBaseUser, PermissionsMixin):
    badge_number = models.CharField(max_length=20, unique=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    password = models.CharField(max_length=128, null=True, blank=True)
    rank = models.CharField(max_length=50, default="Officer")
    department = models.CharField(max_length=50, default="Unknown")
    is_ig = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=now)
    is_active = models.BooleanField(default=True)

    USERNAME_FIELD = 'badge_number'
    REQUIRED_FIELDS = ['email', 'first_name', 'last_name']

    objects = PoliceUserManager()

    def __str__(self):
        return f"{self.badge_number} - {self.first_name} {self.last_name}"

    def set_password(self, raw_password):
        super().set_password(raw_password)

    def has_perm(self, perm, obj=None):
        """Check if user has a specific permission."""
        return True

    def has_module_perms(self, app_label):
        """Check if user has permissions to view the app."""
        return True

    def get_username(self):
        """Returns the username of the user, which in this case is the badge number."""
        return self.badge_number

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    def get_short_name(self):
        return self.first_name