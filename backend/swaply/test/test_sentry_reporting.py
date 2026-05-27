"""
Regression tests: production API exceptions must reach Sentry with stack traces.
"""

from unittest.mock import patch

from django.test import RequestFactory, TestCase, override_settings
from rest_framework.exceptions import APIException, AuthenticationFailed
from rest_framework.test import APIRequestFactory

from swaply.middleware import GlobalErrorHandlingMiddleware, custom_exception_handler
from swaply.sentry_reporting import capture_reportable_exception


class TestCaptureReportableException(TestCase):
    def test_capture_passes_live_exception_with_traceback(self):
        factory = RequestFactory()
        request = factory.post("/api/auth/skills/")

        try:
            raise FileNotFoundError("missing-config.json")
        except FileNotFoundError as exc:
            with patch("swaply.sentry_reporting.sentry_sdk.capture_exception") as mock_capture:
                capture_reportable_exception(exc, request)

            mock_capture.assert_called_once()
            reported = mock_capture.call_args[0][0]
            self.assertIs(reported, exc)
            self.assertIsNotNone(reported.__traceback__)


@override_settings(DEBUG=False)
class TestUnhandledApiExceptionSentryReporting(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = GlobalErrorHandlingMiddleware(lambda r: None)

    @patch("swaply.middleware.capture_reportable_exception")
    @patch("swaply.middleware.logger")
    def test_unhandled_api_exception_captured_not_error_logged(
        self, mock_logger, mock_capture
    ):
        request = self.factory.post("/api/auth/skills/")
        exc = FileNotFoundError("secrets.json")

        response = self.middleware.process_exception(request, exc)

        mock_capture.assert_called_once_with(exc, request)
        mock_logger.error.assert_not_called()
        mock_logger.info.assert_called_once()
        self.assertEqual(response.status_code, 500)
        payload = response.json()
        self.assertEqual(payload["code"], "INTERNAL_ERROR")
        self.assertNotIn("secrets.json", response.content.decode("utf-8"))


@override_settings(DEBUG=False)
class TestDrfExceptionHandlerSentryReporting(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    @patch("swaply.middleware.capture_reportable_exception")
    @patch("swaply.sentry_reporting.logger")
    def test_5xx_calls_capture_not_error_log(self, mock_logger, mock_capture):
        exc = APIException("Upstream unavailable")
        context = {"request": self.factory.get("/api/auth/me/")}

        response = custom_exception_handler(exc, context)

        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 500)
        mock_capture.assert_called_once_with(exc, context["request"])
        mock_logger.error.assert_not_called()
        mock_logger.info.assert_called_once()

    @patch("swaply.middleware.capture_reportable_exception")
    @patch("swaply.middleware.logger")
    def test_401_does_not_call_capture(self, mock_logger, mock_capture):
        exc = AuthenticationFailed("Authentication credentials were not provided.")
        context = {"request": self.factory.get("/api/auth/skills/")}

        response = custom_exception_handler(exc, context)

        self.assertEqual(response.status_code, 401)
        mock_capture.assert_not_called()
        mock_logger.error.assert_not_called()
        mock_logger.info.assert_called_once()
