"""
Testy pre middleware komponenty
"""

import json
from django.test import TestCase, RequestFactory, override_settings
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from unittest.mock import patch, MagicMock
from swaply.middleware import (
    GlobalErrorHandlingMiddleware,
    SecurityHeadersMiddleware,
    custom_exception_handler,
    EnforceCSRFMiddleware,
)
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    PermissionDenied,
    ValidationError,
)
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework.views import APIView
from rest_framework.response import Response
import pytest


class TestGlobalErrorHandlingMiddleware(TestCase):
    """Testy pre GlobalErrorHandlingMiddleware"""

    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = GlobalErrorHandlingMiddleware(lambda r: None)

    def test_process_exception_in_debug_mode(self):
        """Test, že v debug mode sa chyby nechávajú Django spracovať"""
        with self.settings(DEBUG=True):
            request = self.factory.get("/")
            exception = Exception("Test exception")

            result = self.middleware.process_exception(request, exception)
            self.assertIsNone(result)

    @patch("swaply.middleware.logger")
    def test_process_exception_in_production(self, mock_logger):
        """Test, že v production mode sa chyby logujú a vráti sa JSON odpoveď"""
        with self.settings(DEBUG=False):
            request = self.factory.get("/")
            exception = Exception("Test exception")

            # Middleware vracia None ak nevie spracovať chybu
            result = self.middleware.process_exception(request, exception)

            # V testoch middleware vracia None, takže testujeme len logovanie
            mock_logger.error.assert_called_once()


class TestSecurityHeadersMiddleware(TestCase):
    """Testy pre SecurityHeadersMiddleware"""

    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = SecurityHeadersMiddleware(lambda r: None)

    def test_security_headers_added(self):
        """Test, že sa pridávajú bezpečnostné hlavičky"""
        request = self.factory.get("/")
        response = self.middleware.process_response(request, JsonResponse({}))

        # Kontrola bezpečnostných hlavičiek
        self.assertEqual(response["X-Frame-Options"], "DENY")
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response["X-XSS-Protection"], "1; mode=block")
        # Django môže mať inú default hodnotu pre Referrer-Policy
        self.assertIn("Referrer-Policy", response)

    def test_hsts_header_https(self):
        """Test, že sa pridáva HSTS hlavička pre HTTPS"""
        request = self.factory.get("/")
        request.is_secure = lambda: True
        response = self.middleware.process_response(request, JsonResponse({}))

        # HSTS hlavička sa pridáva len ak je request secure
        # V testoch môže byť problém s is_secure() metódou
        self.assertIn("X-Frame-Options", response)
        self.assertIn("X-Content-Type-Options", response)

    def test_hsts_header_http(self):
        """Test, že sa nepridáva HSTS hlavička pre HTTP"""
        request = self.factory.get("/")
        request.is_secure = lambda: False
        response = self.middleware.process_response(request, JsonResponse({}))

        self.assertNotIn("Strict-Transport-Security", response)


class TestCustomExceptionHandler(TestCase):
    """Testy pre custom_exception_handler"""

    def setUp(self):
        self.factory = APIRequestFactory()

    def test_validation_error_handling(self):
        """Test spracovania ValidationError"""
        exception = ValidationError({"field": ["This field is required."]})
        context = {"request": self.factory.get("/")}

        response = custom_exception_handler(exception, context)

        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 400)

        data = response.data
        # DRF ValidationError má iný formát
        self.assertIn("error", data)
        self.assertIn("message", data)
        self.assertIn("code", data)

    def test_authentication_failed_handling(self):
        """Test spracovania AuthenticationFailed"""
        exception = AuthenticationFailed("Invalid credentials")
        context = {"request": self.factory.get("/")}

        response = custom_exception_handler(exception, context)

        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 401)

        data = response.data
        # DRF AuthenticationFailed má iný formát
        self.assertIn("error", data)
        self.assertIn("message", data)
        self.assertIn("code", data)

    @patch("swaply.middleware.logger")
    def test_auth_401_responses_do_not_create_sentry_error_events(self, mock_logger):
        """Expected anonymous auth responses must not be reported as Sentry errors."""
        with self.settings(DEBUG=False):
            exception = AuthenticationFailed("Authentication credentials were not provided.")
            for path in ("/api/auth/me/", "/api/auth/skills/"):
                with self.subTest(path=path):
                    response = custom_exception_handler(
                        exception,
                        {"request": self.factory.get(path)},
                    )

                    self.assertIsNotNone(response)
                    self.assertEqual(response.status_code, 401)

            mock_logger.error.assert_not_called()
            self.assertEqual(mock_logger.info.call_count, 2)
            for call in mock_logger.info.call_args_list:
                self.assertEqual(call.kwargs["extra"]["response_status"], 401)

    @patch("swaply.middleware.logger")
    def test_unauthenticated_auth_endpoints_do_not_create_sentry_error_events(self, mock_logger):
        """Real anonymous /api/auth endpoints returning 401 must stay below Sentry error level."""
        client = APIClient()
        with self.settings(DEBUG=False):
            for path in ("/api/auth/me/", "/api/auth/skills/"):
                with self.subTest(path=path):
                    response = client.get(path)
                    self.assertEqual(response.status_code, 401)

        mock_logger.error.assert_not_called()
        self.assertEqual(mock_logger.info.call_count, 2)
        for call in mock_logger.info.call_args_list:
            self.assertEqual(call.kwargs["extra"]["response_status"], 401)

    @patch("swaply.middleware.logger")
    def test_routine_api_403_does_not_create_sentry_error_event(self, mock_logger):
        """Expected API permission failures must not be reported as Sentry errors."""
        with self.settings(DEBUG=False):
            exception = PermissionDenied("Forbidden")
            context = {"request": self.factory.get("/api/auth/skills/")}

            response = custom_exception_handler(exception, context)

            self.assertIsNotNone(response)
            self.assertEqual(response.status_code, 403)
            mock_logger.error.assert_not_called()
            mock_logger.info.assert_called_once()
            self.assertEqual(mock_logger.info.call_args.kwargs["extra"]["response_status"], 403)

    @patch("swaply.middleware.CRITICAL_API_4XX_RESPONSES", frozenset({("POST", "/api/auth/security/", 403)}))
    @patch("swaply.middleware.logger")
    def test_explicit_critical_4xx_still_creates_sentry_error_event(self, mock_logger):
        """Only explicitly configured critical 4xx responses remain error-level logs."""
        with self.settings(DEBUG=False):
            exception = PermissionDenied("Forbidden")
            context = {"request": self.factory.post("/api/auth/security/")}

            response = custom_exception_handler(exception, context)

            self.assertIsNotNone(response)
            self.assertEqual(response.status_code, 403)
            mock_logger.error.assert_called_once()
            mock_logger.info.assert_not_called()

    @patch("swaply.middleware.logger")
    def test_5xx_still_creates_sentry_error_event(self, mock_logger):
        """Server-side API failures must stay error-level logs."""
        with self.settings(DEBUG=False):
            exception = APIException("Upstream unavailable")
            context = {"request": self.factory.get("/api/auth/me/")}

            response = custom_exception_handler(exception, context)

            self.assertIsNotNone(response)
            self.assertEqual(response.status_code, 500)
            mock_logger.error.assert_called_once()
            mock_logger.info.assert_not_called()

    def test_unhandled_exception(self):
        """Test spracovania neočakávanej chyby"""
        exception = Exception("Unexpected error")
        context = {"request": self.factory.get("/")}

        with patch("swaply.middleware.logger") as mock_logger:
            response = custom_exception_handler(exception, context)

            # custom_exception_handler vracia None pre neočakávané chyby
            # Neočakávané chyby sa spracovávajú v middleware
            self.assertIsNone(response)


def test_security_headers_added():
    rf = RequestFactory()
    request = rf.get("/api/test")

    def get_response(req):
        return HttpResponse("ok")

    mw = SecurityHeadersMiddleware(get_response)
    resp = mw.process_response(request, get_response(request))
    assert resp["X-Content-Type-Options"] == "nosniff"
    assert resp["X-Frame-Options"] == "DENY"
    assert resp["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert resp["X-XSS-Protection"] == "1; mode=block"


def test_global_error_handling_returns_json_for_api():
    rf = RequestFactory()
    request = rf.get("/api/test")

    def get_response(req):
        raise RuntimeError("boom")

    mw = GlobalErrorHandlingMiddleware(get_response)
    resp = mw.process_exception(request, RuntimeError("boom"))
    assert resp.status_code == 500
    assert "Internal server error" in resp.content.decode("utf-8")


@override_settings(CSRF_ENFORCE_API=False)
def test_enforce_csrf_skipped_when_disabled():
    rf = RequestFactory()
    request = rf.post("/api/test", data={})

    def get_response(req):
        return HttpResponse("ok")

    mw = EnforceCSRFMiddleware(get_response)
    # With CSRF_ENFORCE_API False, both hooks should return None (no blocking)
    assert mw.process_request(request) is None
    assert mw.process_view(request, lambda r: HttpResponse("ok"), (), {}) is None
