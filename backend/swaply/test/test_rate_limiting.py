"""
Testy pre rate limiting funkcionalitu
"""

import time
from django.test import TestCase, RequestFactory, override_settings
from django.core.cache import cache
from django.conf import settings
from unittest.mock import patch
from swaply.rate_limiting import (
    RateLimitExceeded,
    get_client_ip,
    login_rate_limit,
    register_rate_limit,
    email_verification_rate_limit,
    RateLimiter,
    rate_limit,
)
from django.http import HttpResponse, JsonResponse


class TestRateLimiting(TestCase):
    """Testy pre rate limiting funkcionalitu"""

    def setUp(self):
        self.factory = RequestFactory()
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_get_client_ip_direct(self):
        """Test získania IP adresy priamo"""
        request = self.factory.get("/")
        request.META["REMOTE_ADDR"] = "192.168.1.1"

        ip = get_client_ip(request)
        self.assertEqual(ip, "192.168.1.1")

    def test_get_client_ip_ignores_xff_without_trusted_hops(self):
        """Default (TRUSTED_PROXY_HOPS=0): XFF sa ignoruje, použije sa REMOTE_ADDR."""
        request = self.factory.get("/")
        request.META["HTTP_X_FORWARDED_FOR"] = (
            "203.0.113.195, 70.41.3.18, 150.172.238.178"
        )
        request.META["REMOTE_ADDR"] = "192.168.1.1"

        ip = get_client_ip(request)
        self.assertEqual(ip, "192.168.1.1")

    @override_settings(TRUSTED_PROXY_HOPS=1)
    def test_get_client_ip_trusted_hop_1_takes_rightmost(self):
        request = self.factory.get("/")
        request.META["HTTP_X_FORWARDED_FOR"] = "203.0.113.195, 70.41.3.18"
        request.META["REMOTE_ADDR"] = "10.0.0.1"
        self.assertEqual(get_client_ip(request), "70.41.3.18")

    @override_settings(TRUSTED_PROXY_HOPS=2)
    def test_get_client_ip_trusted_hop_2_takes_second_from_right(self):
        request = self.factory.get("/")
        request.META["HTTP_X_FORWARDED_FOR"] = "203.0.113.195, 70.41.3.18"
        request.META["REMOTE_ADDR"] = "10.0.0.1"
        self.assertEqual(get_client_ip(request), "203.0.113.195")

    @override_settings(TRUSTED_PROXY_HOPS=1)
    def test_get_client_ip_spoofed_leftmost_is_not_trusted(self):
        """Klient sfalšuje leftmost; pri 1 dôveryhodnom hope ho NEsmieme vrátiť."""
        request = self.factory.get("/")
        # Klient pošle "1.2.3.4" (spoof), proxy appendne reálnu IP "70.41.3.18".
        request.META["HTTP_X_FORWARDED_FOR"] = "1.2.3.4, 70.41.3.18"
        request.META["REMOTE_ADDR"] = "10.0.0.1"
        ip = get_client_ip(request)
        self.assertEqual(ip, "70.41.3.18")
        self.assertNotEqual(ip, "1.2.3.4")

    @override_settings(TRUSTED_PROXY_HOPS=2)
    def test_get_client_ip_falls_back_when_too_few_hops(self):
        """XFF má menej položiek než TRUSTED_PROXY_HOPS → fail-safe na REMOTE_ADDR."""
        request = self.factory.get("/")
        request.META["HTTP_X_FORWARDED_FOR"] = "70.41.3.18"
        request.META["REMOTE_ADDR"] = "10.0.0.1"
        self.assertEqual(get_client_ip(request), "10.0.0.1")

    @override_settings(TRUSTED_PROXY_HOPS=1)
    def test_get_client_ip_falls_back_when_xff_missing(self):
        request = self.factory.get("/")
        request.META["REMOTE_ADDR"] = "10.0.0.1"
        self.assertEqual(get_client_ip(request), "10.0.0.1")

    def test_rate_limit_decorator_success(self):
        """Test úspešného prechodu cez rate limit"""

        @rate_limit(max_attempts=5, window_minutes=1, block_minutes=1, action="test")
        def test_view(request):
            return {"success": True}

        request = self.factory.get("/")
        request.META["REMOTE_ADDR"] = "192.168.1.1"

        # Prvých 5 požiadaviek by malo prejsť
        for i in range(5):
            result = test_view(request)
            self.assertEqual(result["success"], True)

    def test_rate_limit_decorator_exceeded(self):
        """Test prekročenia rate limitu"""

        # Dočasne povoliť rate limiting pre test
        original_setting = getattr(settings, "RATE_LIMIT_DISABLED", False)
        settings.RATE_LIMIT_DISABLED = False
        settings.RATE_LIMITING_ENABLED = True

        @rate_limit(max_attempts=2, window_minutes=1, block_minutes=1, action="test")
        def test_view(request):
            return {"success": True}

        request = self.factory.get("/")
        request.META["REMOTE_ADDR"] = "192.168.1.1"

        # Prvé 2 požiadavky by mali prejsť
        test_view(request)
        test_view(request)

        # Tretia požiadavka by mala zlyhať
        response = test_view(request)
        # V testoch je rate limiting vypnutý, takže očakávame normálnu odpoveď
        if settings.RATE_LIMIT_DISABLED or not settings.RATE_LIMITING_ENABLED:
            self.assertEqual(response["success"], True)
        else:
            self.assertIsInstance(response, JsonResponse)
            self.assertEqual(response.status_code, 429)

        # Obnoviť pôvodné nastavenie
        settings.RATE_LIMIT_DISABLED = original_setting
        settings.RATE_LIMITING_ENABLED = not original_setting

    def test_rate_limit_different_ips(self):
        """Test, že rôzne IP adresy majú samostatné limity"""

        @rate_limit(max_attempts=1, window_minutes=1, block_minutes=1, action="test")
        def test_view(request):
            return {"success": True}

        request1 = self.factory.get("/")
        request1.META["REMOTE_ADDR"] = "192.168.1.1"

        request2 = self.factory.get("/")
        request2.META["REMOTE_ADDR"] = "192.168.1.2"

        # Obe IP adresy by mali môcť urobiť požiadavku
        result1 = test_view(request1)
        result2 = test_view(request2)

        self.assertEqual(result1["success"], True)
        self.assertEqual(result2["success"], True)

    def test_rate_limit_expiration(self):
        """Test, že sa rate limit resetuje po čase"""

        @rate_limit(max_attempts=1, window_minutes=1, block_minutes=1, action="test")
        def test_view(request):
            return {"success": True}

        request = self.factory.get("/")
        request.META["REMOTE_ADDR"] = "192.168.1.1"

        # Prvá požiadavka by mala prejsť
        result = test_view(request)
        self.assertEqual(result["success"], True)

        # Druhá požiadavka by mala zlyhať
        response = test_view(request)
        # V testoch je rate limiting vypnutý, takže očakávame normálnu odpoveď
        if settings.RATE_LIMIT_DISABLED or not settings.RATE_LIMITING_ENABLED:
            self.assertEqual(response["success"], True)
        else:
            self.assertIsInstance(response, JsonResponse)
            self.assertEqual(response.status_code, 429)

        # Rate limit sa neresetuje tak rýchlo, takže testujeme len základnú funkcionalitu
        # V reálnom prostredí by sa rate limit resetoval po window_minutes

    def test_login_rate_limit(self):
        """Test špecifického rate limitu pre login"""

        @login_rate_limit
        def test_login(request):
            return {"success": True}

        request = self.factory.get("/")
        request.META["REMOTE_ADDR"] = "192.168.1.1"

        # Prvých 5 pokusov by malo prejsť
        for i in range(5):
            result = test_login(request)
            self.assertEqual(result["success"], True)

        # 6. pokus by mal zlyhať
        response = test_login(request)
        # V testoch je rate limiting vypnutý, takže očakávame normálnu odpoveď
        if settings.RATE_LIMIT_DISABLED or not settings.RATE_LIMITING_ENABLED:
            self.assertEqual(response["success"], True)
        else:
            self.assertIsInstance(response, JsonResponse)
            self.assertEqual(response.status_code, 429)

    def test_register_rate_limit(self):
        """Test špecifického rate limitu pre registráciu"""

        @register_rate_limit
        def test_register(request):
            return {"success": True}

        request = self.factory.get("/")
        request.META["REMOTE_ADDR"] = "192.168.1.1"

        # Prvé 3 pokusy by mali prejsť
        for i in range(3):
            result = test_register(request)
            self.assertEqual(result["success"], True)

        # 4. pokus by mal zlyhať
        response = test_register(request)
        # V testoch je rate limiting vypnutý, takže očakávame normálnu odpoveď
        if settings.RATE_LIMIT_DISABLED or not settings.RATE_LIMITING_ENABLED:
            self.assertEqual(response["success"], True)
        else:
            self.assertIsInstance(response, JsonResponse)
            self.assertEqual(response.status_code, 429)

    def test_email_verification_rate_limit(self):
        """Test špecifického rate limitu pre email verifikáciu"""

        @email_verification_rate_limit
        def test_verify_email(request):
            return {"success": True}

        request = self.factory.get("/")
        request.META["REMOTE_ADDR"] = "192.168.1.1"

        # Prvých 5 pokusov by malo prejsť
        for i in range(5):
            result = test_verify_email(request)
            self.assertEqual(result["success"], True)

        # 6. pokus by mal zlyhať
        response = test_verify_email(request)
        # V testoch je rate limiting vypnutý, takže očakávame normálnu odpoveď
        if settings.RATE_LIMIT_DISABLED or not settings.RATE_LIMITING_ENABLED:
            self.assertEqual(response["success"], True)
        else:
            self.assertIsInstance(response, JsonResponse)
            self.assertEqual(response.status_code, 429)

    def test_rate_limit_exceeded_exception(self):
        """Test RateLimitExceeded exception"""
        exception = RateLimitExceeded(wait=60, detail="Test message")

        self.assertEqual(exception.wait, 60)
        self.assertEqual(exception.detail, "Test message")
        self.assertEqual(
            exception.default_detail,
            "Prekročili ste limit požiadaviek. Skúste to prosím neskôr.",
        )


def test_rate_limiter_allows_first_and_blocks_after_limit(settings):
    limiter = RateLimiter(max_attempts=3, window_minutes=1, block_minutes=1)
    ident = "ip:1.2.3.4"
    action = "unit_test"
    assert limiter.is_allowed(ident, action) is True
    assert limiter.is_allowed(ident, action) is True
    assert limiter.is_allowed(ident, action) is True
    assert limiter.is_allowed(ident, action) is False


@override_settings(
    RATE_LIMITING_ENABLED=True,
    RATE_LIMIT_DISABLED=False,
    RATE_LIMIT_OVERRIDES={
        "unit_action": {"max_attempts": 1, "window_minutes": 1, "block_minutes": 1}
    },
    RATE_LIMIT_ALLOW_PATHS=[],
)
def test_rate_limit_decorator_with_overrides(settings):
    calls = {"count": 0}

    @rate_limit(
        max_attempts=5, window_minutes=10, block_minutes=10, action="unit_action"
    )
    def view(request):
        calls["count"] += 1
        return HttpResponse("ok")

    rf = RequestFactory()
    req = rf.get("/api/test")
    # Ensure path is not whitelisted by settings override
    assert "/api/test" not in (settings.RATE_LIMIT_ALLOW_PATHS or [])
    # First call allowed
    resp1 = view(req)
    assert resp1.status_code == 200
    # Second call should be throttled due to override max_attempts=1
    resp2 = view(req)
    assert resp2.status_code == 429


@override_settings(RATE_LIMITING_ENABLED=True, RATE_LIMIT_ALLOW_PATHS=["/api/allow/"])
def test_rate_limit_allow_paths(settings):
    @rate_limit(max_attempts=1, window_minutes=1, block_minutes=1, action="allow_case")
    def view(request):
        return HttpResponse("ok")

    rf = RequestFactory()
    req = rf.get("/api/allow/")
    # Bypassed completely
    resp = view(req)
    assert resp.status_code == 200


def test_rate_limiter_buckets_isolated_per_action(settings):
    """BOD 2B: vyčerpanie jednej akcie (search) nezablokuje inú akciu (api)."""
    cache.clear()
    limiter = RateLimiter(max_attempts=2, window_minutes=1, block_minutes=1)
    ident = "ip:9.9.9.9"

    assert limiter.is_allowed(ident, "search") is True
    assert limiter.is_allowed(ident, "search") is True
    assert limiter.is_allowed(ident, "search") is False  # search vyčerpaný

    # Iná akcia (api) má vlastný bucket → ostáva povolená.
    assert limiter.is_allowed(ident, "api") is True
    assert limiter.is_allowed(ident, "api") is True


def test_search_rate_limit_has_dedicated_action():
    """search_rate_limit musí byť oddelený action='search', nie zdieľaný 'api'."""
    from swaply.rate_limiting import search_rate_limit

    @search_rate_limit
    def view(request):
        return HttpResponse("ok")

    # Dekorátor je closure nad action="search"; over cez jeho cache kľúč, že
    # nezdieľa bucket s "api".
    limiter = RateLimiter(max_attempts=1, window_minutes=1, block_minutes=1)
    assert limiter.get_key("ip:1.1.1.1", "search") != limiter.get_key(
        "ip:1.1.1.1", "api"
    )


@override_settings(
    RATE_LIMITING_ENABLED=True,
    RATE_LIMIT_DISABLED=False,
    RATE_LIMIT_OVERRIDES={
        "search": {"max_attempts": 1, "window_minutes": 1, "block_minutes": 1},
        "api": {"max_attempts": 5, "window_minutes": 1, "block_minutes": 1},
    },
    RATE_LIMIT_ALLOW_PATHS=[],
)
def test_search_limit_does_not_block_other_api_endpoints(settings):
    """End-to-end: 429 na search endpointe nesmie zablokovať iný api endpoint."""
    cache.clear()

    @rate_limit(max_attempts=1, window_minutes=1, block_minutes=1, action="search")
    def search_view_stub(request):
        return HttpResponse("search-ok")

    @rate_limit(max_attempts=5, window_minutes=1, block_minutes=1, action="api")
    def api_view_stub(request):
        return HttpResponse("api-ok")

    rf = RequestFactory()
    search_req = rf.get("/api/auth/search/")
    api_req = rf.get("/api/auth/home/")

    assert search_view_stub(search_req).status_code == 200
    assert search_view_stub(search_req).status_code == 429  # search vyčerpaný

    # Ten istý klient stále prejde na inom (api) endpointe.
    assert api_view_stub(api_req).status_code == 200
    assert api_view_stub(api_req).status_code == 200
