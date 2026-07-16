import logging
import firebase_admin
from firebase_admin import credentials
from django.conf import settings

logger = logging.getLogger(__name__)


def get_firebase_app():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    try:
        cred_dict = {
            "type": settings.FIREBASE_TYPE,
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key_id": settings.FIREBASE_PRIVATE_KEY_ID,
            "private_key": settings.FIREBASE_PRIVATE_KEY,
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "client_id": settings.FIREBASE_CLIENT_ID,
            "auth_uri": settings.FIREBASE_AUTH_URI,
            "token_uri": settings.FIREBASE_TOKEN_URI,
            "auth_provider_x509_cert_url": settings.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
            "client_x509_cert_url": settings.FIREBASE_CLIENT_X509_CERT_URL,
            "universe_domain": settings.FIREBASE_UNIVERSE_DOMAIN,
        }

        if not all(
            [
                settings.FIREBASE_TYPE,
                settings.FIREBASE_PROJECT_ID,
                settings.FIREBASE_PRIVATE_KEY,
                settings.FIREBASE_CLIENT_EMAIL,
            ]
        ):
            raise ValueError("Missing essential Firebase credential settings.")

        cred = credentials.Certificate(cred_dict)
        return firebase_admin.initialize_app(cred)

    except ValueError as e:
        logger.error("Firebase initialization failed: %s", e)
        return None
    except Exception as e:
        logger.exception("Unexpected error during Firebase initialization")
        return None
