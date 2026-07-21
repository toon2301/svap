"""Regression tests for collision-proof cache version tokens.

The dashboard user-skills and recommendations caches version their entries with
a token. Previously the token was ``str(time_ns())``, which repeats when two
invalidations share a clock tick — the second bump then no-ops and a stale
entry stays reachable. These tests pin the tokens to a fixed ``time_ns`` value
(the worst case) and assert the version still advances.
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase

from accounts import cache_versioning
from accounts.views.dashboard_views import public_profiles, recommendations

User = get_user_model()


class CacheVersionTokenTests(TestCase):
    def test_tokens_are_unique_under_rapid_successive_calls(self):
        tokens = [cache_versioning.next_cache_version_token() for _ in range(10000)]
        self.assertEqual(len(set(tokens)), len(tokens))

    def test_tokens_are_unique_even_when_time_ns_collides(self):
        # Same nanosecond for every call: the old str(time_ns()) token would
        # repeat here; the counter component keeps them distinct.
        with patch.object(cache_versioning, "time_ns", return_value=123):
            first = cache_versioning.next_cache_version_token()
            second = cache_versioning.next_cache_version_token()
        self.assertNotEqual(first, second)


class DashboardCacheVersionInvalidationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="cache-version-user",
            email="cache-version-user@example.com",
            password="StrongPass123",
        )

    def tearDown(self):
        cache.clear()

    def test_user_skills_version_changes_on_time_ns_collision(self):
        key = public_profiles._dashboard_user_skills_cache_version_key(self.user.id)
        with patch.object(cache_versioning, "time_ns", return_value=999):
            public_profiles.invalidate_dashboard_user_skills_cache(self.user.id)
            first = cache.get(key)
            public_profiles.invalidate_dashboard_user_skills_cache(self.user.id)
            second = cache.get(key)
        self.assertIsNotNone(first)
        self.assertNotEqual(first, second)

    def test_recommendations_version_changes_on_time_ns_collision(self):
        key = recommendations._recommendations_cache_version_key(self.user.id)
        with patch.object(cache_versioning, "time_ns", return_value=999):
            recommendations.invalidate_dashboard_recommendations_cache(self.user.id)
            first = cache.get(key)
            recommendations.invalidate_dashboard_recommendations_cache(self.user.id)
            second = cache.get(key)
        self.assertIsNotNone(first)
        self.assertNotEqual(first, second)
