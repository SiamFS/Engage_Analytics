import logging
from rest_framework import authentication
from rest_framework import exceptions
from firebase_admin import auth
from api.models import User

logger = logging.getLogger(__name__)


class FirebaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        token = self._extract_token(request)
        if not token:
            return None

        try:
            decoded_token = self._verify_token(token)
            sign_in_provider = decoded_token.get("firebase", {}).get("sign_in_provider", "")
            if sign_in_provider not in ("phone", "anonymous") and not decoded_token.get("email_verified", False):
                raise exceptions.AuthenticationFailed("Email not verified.")
            user = self._get_or_create_user(decoded_token)
            if not user.is_active:
                raise exceptions.AuthenticationFailed("Account is deactivated.")
            return (user, None)
        except auth.ExpiredIdTokenError:
            raise exceptions.AuthenticationFailed("Token expired.")
        except auth.RevokedIdTokenError:
            raise exceptions.AuthenticationFailed("Token revoked.")
        except auth.UserDisabledError:
            raise exceptions.AuthenticationFailed("User disabled.")
        except Exception as e:
            logger.error(f"Authentication failed due to an exception:{str(e)}", exc_info=True)
            raise exceptions.AuthenticationFailed("Invalid token.")

    def _extract_token(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION")
        if not auth_header:
            return None

        token_parts = auth_header.split()
        if len(token_parts) != 2 or token_parts[0].lower() != "bearer":
            return None

        return token_parts[1]

    def _verify_token(self, token):
        return auth.verify_id_token(token, check_revoked=True)

    @staticmethod
    def _get_user_data(decoded_token):
        name = decoded_token.get("name", "")
        name_parts = name.strip().split(" ", 1)
        first_name = name_parts[0] if name_parts else ""
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        return {
            "firebase_uid": decoded_token.get("uid", ""),
            "email": decoded_token.get("email", ""),
            "first_name": first_name,
            "last_name": last_name,
            "photo_url": decoded_token.get("picture", ""),
            "role": "user",
        }

    def _create_user_profile(self, user, role):
        if role == "company":
            from api.models import CompanyProfile
            CompanyProfile.objects.create(user=user)
        elif role == "user":
            from api.models import ViewerProfile
            ViewerProfile.objects.create(user=user)

    def _get_or_create_user(self, decoded_token):
        uid = decoded_token.get("uid", "")
        try:
            user = User.objects.get(firebase_uid=uid)
            user_data = self._get_user_data(decoded_token)
            update_fields = []
            if user_data["photo_url"] and user.photo_url != user_data["photo_url"]:
                user.photo_url = user_data["photo_url"]
                update_fields.append("photo_url")
            if user_data["email"] and user.email != user_data["email"]:
                user.email = user_data["email"]
                update_fields.append("email")
            if update_fields:
                user.save(update_fields=update_fields)
            return user
        except User.DoesNotExist:
            user_data = self._get_user_data(decoded_token)

            existing_user = User.objects.filter(email=user_data["email"]).first()
            if existing_user:
                existing_user.firebase_uid = user_data["firebase_uid"]
                update_fields = ["firebase_uid"]
                if user_data["photo_url"]:
                    existing_user.photo_url = user_data["photo_url"]
                    update_fields.append("photo_url")
                existing_user.save(update_fields=update_fields)
                return existing_user

            user = User.objects.create_user(
                firebase_uid=user_data["firebase_uid"],
                email=user_data["email"],
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                role=user_data["role"],
                photo_url=user_data["photo_url"],
            )
            self._create_user_profile(user, user_data["role"])

            try:
                from api.services.notification_service import NotificationService
                NotificationService.notify_admins(
                    notification_type="new_user_registered",
                    title=f"New {user_data['role']} registered",
                    message=f"{user_data['email']} signed up as a {user_data['role']}.",
                    data={"user_id": user.id, "email": user_data["email"], "role": user_data["role"]},
                )
            except Exception:
                logger.exception("Failed to notify admins of new user registration")

            return user
