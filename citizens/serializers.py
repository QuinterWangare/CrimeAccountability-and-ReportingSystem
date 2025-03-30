from rest_framework import serializers
from .models import PoliceUser

class PoliceUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoliceUser
        fields = ['badge_number', 'username', 'email', 'rank', 'department', 'is_ig']
