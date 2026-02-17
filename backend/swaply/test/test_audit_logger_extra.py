from django.test import TestCase
from django.contrib.auth import get_user_model
from swaply.audit_logger import audit_api_access


User = get_user_model()


class Dummy:
    def __init__(self):
        self.status_code = 200


class TestAuditLoggerDecorator(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="a", email="a@example.com", password="StrongPass123"
        )

    def test_audit_api_access_decorator(self):
        @audit_api_access("test-endpoint")
        def view(request):
            return Dummy()

        class R:
            META = {"REMOTE_ADDR": "127.0.0.1", "HTTP_USER_AGENT": "pytest"}
            method = "GET"
            path = "/api/x"
            user = None

        r = view(R())
        assert isinstance(r, Dummy)
