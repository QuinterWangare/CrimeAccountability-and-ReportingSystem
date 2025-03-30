from django.contrib.auth.backends import BaseBackend
from citizens.models import PoliceUser

class PoliceUserBackend(BaseBackend):
    def authenticate(self, request, badge_number=None, password=None):
        try:
            user = PoliceUser.objects.get(badge_number=badge_number)
            if user.check_password(password):
                return user
        except PoliceUser.DoesNotExist:
            return None

    def get_user(self, user_id):
        try:
            return PoliceUser.objects.get(pk=user_id)
        except PoliceUser.DoesNotExist:
            return None