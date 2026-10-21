"""Focused contracts for shared search builders and their pagination hot path."""

from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.test import TestCase

from accounts.models import DashboardSkillSearchProjection, OfferedSkill
from accounts.views import search_query_builders as builders

User = get_user_model()


class SearchQueryBuilderTests(TestCase):
    """Keep projection and legacy filters equivalent as description recall expands."""

    def setUp(self):
        """Create two public owners so self-exclusion can be checked explicitly."""
        self.owner = User.objects.create_user(
            username="builder_owner",
            email="builder-owner@example.com",
            password=None,
            is_public=True,
            location="OwnerTown",
            district="OwnerDistrict",
        )
        self.viewer = User.objects.create_user(
            username="builder_viewer",
            email="builder-viewer@example.com",
            password=None,
            is_public=True,
        )
        self.sequence = 0

    def _skill(self, **overrides):
        """Create uniquely categorized cards with predictable filters and descriptions."""
        self.sequence += 1
        return OfferedSkill.objects.create(
            **{
                "user": self.owner,
                "category": "Craft",
                "subcategory": f"Builder {self.sequence}",
                "description": "needletoken",
                "detailed_description": "longneedletoken",
                "country_code": "SK",
                "district_code": "nitra",
                "location": "CardTown",
                "district": "CardDistrict",
                "price_from": Decimal("10.50"),
                **overrides,
            }
        )

    def _query(self, *, projection, **overrides):
        """Call either builder through the same public filter contract."""
        params = {
            "raw_query": "needletoken",
            "skill_terms": {"needletoken"},
            "country_filter": "",
            "district_filter": "",
            "offer_type": "",
            "price_min": None,
            "price_max": None,
            "only_my_location": False,
            **overrides,
        }
        if projection:
            return builders._build_projection_skills_page_qs(
                viewer_user_id=self.viewer.pk,
                projection_skill_loc_q=params.pop("location_q", Q()),
                **params,
            )
        return builders._build_legacy_skills_page_qs(
            viewer_user=self.viewer,
            skill_loc_q=params.pop("location_q", Q()),
            **params,
        )

    def _ids(self, *, projection, **overrides):
        """Compare canonical card IDs rather than projection primary keys."""
        field = "skill_id" if projection else "id"
        return list(
            self._query(projection=projection, **overrides).values_list(
                field, flat=True
            )
        )

    def test_location_filter_builders_cover_empty_and_either_profile_or_card_field(
        self,
    ):
        """Each location snapshot component independently selects the intended rows."""
        card = self._skill()
        for projection in (False, True):
            for snapshot, expected in (
                (("", ""), True),
                (("CardTown", ""), True),
                (("", "CardDistrict"), True),
                (("OwnerTown", "OwnerDistrict"), True),
                (("MissingTown", "MissingDistrict"), False),
            ):
                with self.subTest(projection=projection, snapshot=snapshot):
                    user_q, legacy_q = builders._build_only_my_location_filters(
                        snapshot
                    )
                    location_q = (
                        builders._build_projection_only_my_location_filters(snapshot)
                        if projection
                        else legacy_q
                    )
                    ids = self._ids(
                        projection=projection,
                        location_q=location_q,
                        only_my_location=True,
                    )
                    self.assertEqual(ids, [card.id] if expected else [])
                    if any(snapshot):
                        self.assertEqual(
                            User.objects.filter(user_q, pk=self.owner.pk).exists(),
                            "OwnerTown" in snapshot,
                        )
                    else:
                        self.assertFalse(bool(user_q))

    def test_scalar_filter_helpers_apply_type_and_inclusive_prices(self):
        """Offer/demand and decimal boundaries are unchanged for either queryset."""
        offer = self._skill()
        demand = self._skill(is_seeking=True)
        cheap = self._skill(price_from=Decimal("9.00"))
        costly = self._skill(price_from=Decimal("11.00"))
        for projection in (False, True):
            with self.subTest(projection=projection):
                self.assertCountEqual(
                    self._ids(projection=projection),
                    [offer.id, demand.id, cheap.id, costly.id],
                )
                self.assertEqual(
                    self._ids(projection=projection, offer_type="seeking"), [demand.id]
                )
                self.assertCountEqual(
                    self._ids(projection=projection, offer_type="offer"),
                    [offer.id, cheap.id, costly.id],
                )
                self.assertCountEqual(
                    self._ids(
                        projection=projection,
                        offer_type="all",
                        price_min=Decimal("10.50"),
                        price_max=Decimal("10.50"),
                    ),
                    [offer.id, demand.id],
                )
                self.assertEqual(
                    self._ids(projection=projection, price_min=Decimal("12")), []
                )
                self.assertEqual(
                    self._ids(projection=projection, price_max=Decimal("8")), []
                )

    def test_geography_filters_never_substitute_owner_free_text(self):
        """Canonical card geography remains independent of textual owner locations."""
        sk = self._skill()
        cz = self._skill(country_code="CZ", district_code="brno-mesto")
        other_sk = self._skill(district_code="zilina")
        for projection in (False, True):
            with self.subTest(projection=projection):
                self.assertCountEqual(
                    self._ids(projection=projection, country_filter="SK"),
                    [sk.id, other_sk.id],
                )
                self.assertEqual(
                    self._ids(
                        projection=projection,
                        country_filter="CZ",
                        district_filter="brno-mesto",
                    ),
                    [cz.id],
                )
                self.assertEqual(
                    self._ids(projection=projection, district_filter="nitra"), [sk.id]
                )

    def test_empty_query_terms_keep_browse_order_and_do_not_apply_empty_location_q(
        self,
    ):
        """No-query browsing and an empty location snapshot preserve the base queryset."""
        first = self._skill()
        second = self._skill(description="Unrelated", detailed_description="")
        self._skill(user=self.viewer)
        self._skill(is_hidden=True)
        for projection in (False, True):
            with self.subTest(projection=projection):
                result = self._ids(
                    projection=projection,
                    raw_query="",
                    skill_terms=set(),
                    only_my_location=True,
                )
                self.assertEqual(result, [second.id, first.id])

    def test_subcategory_and_district_relevance_preserve_existing_priorities(self):
        """Each existing relevance branch stays ahead of description-only recall."""
        plain = self._skill()
        district = self._skill(district="needletoken")
        location = self._skill(location="needletoken")
        tag = self._skill(tags=["needletoken"])
        subcategory = self._skill(subcategory="needletoken")
        category = self._skill(category="needletoken")
        expected = [
            category.id,
            subcategory.id,
            tag.id,
            location.id,
            district.id,
            plain.id,
        ]
        for projection in (False, True):
            with self.subTest(projection=projection):
                self.assertEqual(self._ids(projection=projection), expected)

    def test_verification_breaks_relevance_ties_before_creation_date(self):
        """A verified owner retains priority even when an unverified card is newer."""
        verified_owner = User.objects.create_user(
            username="builder_verified",
            email="builder-verified@example.com",
            password=None,
            is_public=True,
            is_verified=True,
        )
        first = self._skill(user=verified_owner)
        second = self._skill()
        for projection in (False, True):
            self.assertEqual(self._ids(projection=projection), [first.id, second.id])
            self.assertEqual(
                self._ids(projection=projection, raw_query="", skill_terms=set()),
                [first.id, second.id],
            )

    def test_projection_page_reads_only_ids_with_one_query_and_no_owner_join(self):
        """Description recall keeps the projection ID hot path bounded and join-free."""
        first = self._skill()
        second = self._skill()
        query = self._query(projection=True)
        self.assertNotIn(" JOIN ", str(query.query).upper())
        with self.assertNumQueries(1):
            ids, has_next = builders._slice_page_ids(
                query, page=1, per_page=1, id_field="skill_id"
            )
        self.assertEqual(ids, [second.id])
        self.assertTrue(has_next)
        ids, has_next = builders._slice_page_ids(
            query, page=2, per_page=1, id_field="skill_id"
        )
        self.assertEqual(ids, [first.id])
        self.assertFalse(has_next)

    def test_page_slice_handles_empty_and_clamps_nonpositive_values(self):
        """The sentinel helper stays safe for missing, zero and negative bounds."""
        card = self._skill()
        query = OfferedSkill.objects.order_by("pk")
        for page, per_page in ((None, None), (0, 0), (-1, -1), (1, 10)):
            with self.subTest(page=page, per_page=per_page):
                self.assertEqual(
                    builders._slice_page_ids(query, page=page, per_page=per_page),
                    ([card.id], False),
                )
        self.assertEqual(
            builders._slice_page_ids(query, page=2, per_page=1), ([], False)
        )
        self.assertEqual(
            builders._slice_page_ids(query.none(), page=1, per_page=1), ([], False)
        )

    def test_count_cap_reports_exact_boundary_and_overflow_separately(self):
        """Capped count distinguishes CAP from CAP+1 without unbounded counting."""
        self._skill()
        query = OfferedSkill.objects.order_by("pk")
        with patch.object(builders, "SEARCH_COUNT_CAP", 1):
            self.assertEqual(builders.capped_count(query), (1, False))
            self._skill()
            self.assertEqual(builders.capped_count(query), (1, True))
            self.assertEqual(builders.capped_count(query.none()), (0, False))

    def test_e2e_description_sentence_tokens_cannot_expand_smart_synonyms(self):
        """Protect read-only E2E fixture isolation from alternate-field synonym hits."""
        endings = (".", "!", "?", ":", ";", ")")
        self.assertFalse(
            any(keyword.endswith(endings) for keyword in builders.SMART_KEYWORD_INDEX)
        )
        for ending in endings:
            query = f"upratovanie{ending}"
            terms = query.replace(",", " ").split()
            self.assertEqual(terms, [query])
            self.assertNotIn(terms[0].lower(), builders.SMART_KEYWORD_INDEX)
