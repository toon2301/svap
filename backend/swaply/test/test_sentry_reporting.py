"""
Regression tests: production API exceptions must reach Sentry with stack traces.
"""

import json
import warnings
from types import SimpleNamespace
from unittest.mock import patch

import sentry_sdk
from django.test import RequestFactory, TestCase, override_settings
from rest_framework.exceptions import APIException, AuthenticationFailed
from rest_framework.test import APIRequestFactory

from swaply.middleware import GlobalErrorHandlingMiddleware, custom_exception_handler
from swaply.sentry_reporting import capture_reportable_exception


class TestCaptureReportableException(TestCase):
    """Pomocník `capture_reportable_exception` odovzdáva SDK živú výnimku."""

    def test_capture_passes_live_exception_with_traceback(self):
        """Do SDK ide tá istá výnimka (nie jej text), takže Sentry dostane aj jej traceback."""
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
    """Neošetrená výnimka v API ide do Sentry a klient dostane všeobecnú JSON odpoveď 500."""

    def setUp(self):
        """Pripraví továreň požiadaviek a middleware na obsluhu chýb."""
        self.factory = RequestFactory()
        self.middleware = GlobalErrorHandlingMiddleware(lambda r: None)

    @patch("swaply.middleware.capture_reportable_exception")
    @patch("swaply.middleware.logger")
    def test_unhandled_api_exception_captured_not_error_logged(
        self, mock_logger, mock_capture
    ):
        """Výnimka sa pošle do Sentry, nezapíše sa do logu ako chyba a jej text nepríde do odpovede."""
        request = self.factory.post("/api/auth/skills/")
        exc = FileNotFoundError("secrets.json")

        response = self.middleware.process_exception(request, exc)

        mock_capture.assert_called_once_with(exc, request)
        mock_logger.error.assert_not_called()
        mock_logger.info.assert_called_once()
        self.assertEqual(response.status_code, 500)
        payload = json.loads(response.content)
        self.assertEqual(payload["code"], "INTERNAL_ERROR")
        self.assertNotIn("secrets.json", response.content.decode("utf-8"))


@override_settings(DEBUG=False)
class TestDrfExceptionHandlerSentryReporting(TestCase):
    """Obsluha výnimiek DRF hlási do Sentry len chyby 5xx."""

    def setUp(self):
        """Pripraví továreň požiadaviek DRF."""
        self.factory = APIRequestFactory()

    @patch("swaply.middleware.capture_reportable_exception")
    @patch("swaply.sentry_reporting.logger")
    def test_5xx_calls_capture_not_error_log(self, mock_logger, mock_capture):
        """Chyba 5xx ide do Sentry a v logu je len informácia, nie chyba."""
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
        """Chyba 401 sa do Sentry neposiela a v logu nie je chyba."""
        exc = AuthenticationFailed("Authentication credentials were not provided.")
        context = {"request": self.factory.get("/api/auth/skills/")}

        response = custom_exception_handler(exc, context)

        self.assertEqual(response.status_code, 401)
        mock_capture.assert_not_called()
        mock_logger.error.assert_not_called()
        mock_logger.info.assert_called_once()


class TestCaptureReportableExceptionResilience(TestCase):
    """Hlásenie do Sentry nesmie používať zastarané API ani pokaziť obsluhu chýb (nález 214).

    Pomocníka volá `GlobalErrorHandlingMiddleware.process_exception` aj obsluha výnimiek DRF, teda
    priamo pri tvorbe odpovede na chybu. Ak by hlásenie samo spadlo, klient by namiesto zamýšľanej
    JSON odpovede dostal všeobecnú chybu 500.
    """

    def setUp(self):
        """Pripraví požiadavku POST na API, z ktorej pomocník berie značky pre hlásenie."""
        self.request = RequestFactory().post("/api/auth/skills/")

    def test_uses_no_deprecated_sentry_api(self):
        """`push_scope` je v sentry-sdk 2.x zastaraný a v ďalšej hlavnej verzii zmizne."""
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            capture_reportable_exception(
                FileNotFoundError("missing.json"), self.request
            )

        deprecations = [
            str(item.message)
            for item in caught
            if issubclass(item.category, DeprecationWarning)
            and "sentry_sdk" in str(item.message)
        ]
        self.assertEqual(deprecations, [])

    def test_failure_of_the_sdk_is_not_raised_to_the_caller(self):
        """Chyba pri odoslaní do Sentry sa nepreklopí k volajúcemu."""
        with patch(
            "swaply.sentry_reporting.sentry_sdk.capture_exception",
            side_effect=RuntimeError("sdk down"),
        ):
            result = capture_reportable_exception(ValueError("boom"), self.request)

        self.assertIsNone(result)

    def test_failure_to_open_a_scope_is_not_raised_to_the_caller(self):
        """Chyba pri otvorení scope sa nepreklopí k volajúcemu."""
        with patch(
            "swaply.sentry_reporting.sentry_sdk.new_scope",
            side_effect=RuntimeError("no scope"),
        ):
            result = capture_reportable_exception(ValueError("boom"), self.request)

        self.assertIsNone(result)

    def test_failure_log_names_only_the_error_type(self):
        """Produkčné logy zámerne neobsahujú texty výnimiek ani traceback (riziko osobných údajov)."""
        with patch(
            "swaply.sentry_reporting.sentry_sdk.capture_exception",
            side_effect=RuntimeError("secret-detail"),
        ):
            with self.assertLogs(
                "swaply.sentry_reporting", level="WARNING"
            ) as captured:
                capture_reportable_exception(ValueError("boom"), self.request)

        self.assertEqual(len(captured.records), 1)
        record = captured.records[0]
        self.assertIn("RuntimeError", record.getMessage())
        self.assertNotIn("secret-detail", record.getMessage())
        self.assertFalse(record.exc_info)

    def test_event_carries_request_context_and_the_scope_does_not_leak(self):
        """Skutočné SDK: značky a používateľ idú len k hlásenej chybe, nie k nasledujúcim udalostiam.

        Klient je viazaný len na izolovaný scope tohto testu (bez `sentry_sdk.init`), takže sa globálny stav SDK
        nemení; po teste sa klient zatvorí.
        """
        events = []
        client = sentry_sdk.Client(
            dsn="https://public@example.invalid/1",
            transport=events.append,
            default_integrations=False,
            auto_enabling_integrations=False,
            send_default_pii=False,
        )
        self.addCleanup(client.close)
        self.request.user = SimpleNamespace(is_authenticated=True, id=7)

        with sentry_sdk.isolation_scope() as scope:
            scope.set_client(client)
            event_id = capture_reportable_exception(ValueError("boom"), self.request)
            sentry_sdk.capture_message("later")

        self.assertIsInstance(event_id, str)
        reported, later = events
        self.assertIn("exception", reported)
        self.assertEqual(reported["tags"]["http.method"], "POST")
        self.assertEqual(reported["tags"]["http.route"], "/api/auth/skills/")
        self.assertEqual(reported["user"], {"id": "7"})
        self.assertNotIn("http.method", later.get("tags", {}))
        self.assertNotIn("user", later)
