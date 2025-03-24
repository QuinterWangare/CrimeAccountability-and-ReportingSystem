from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from .models import CustomUser, CrimeReport

class SignupForm(UserCreationForm):
    email = forms.EmailField(required=True)

    class Meta:
        model = CustomUser
        fields = ['first_name', 'last_name', 'email', 'password1', 'password2']

class LoginForm(AuthenticationForm):
    username = forms.CharField(widget=forms.TextInput(attrs={'placeholder': 'Email or Username'}))

class CrimeReportForm(forms.ModelForm):
    class Meta:
        model = CrimeReport
        fields = [
            'crime_type',
            'incident_datetime',
            'description',
            'location',
            'evidence',
            'contact_name',
            'contact_number',
            'contact_email',
            'preferred_contact_method'
        ]