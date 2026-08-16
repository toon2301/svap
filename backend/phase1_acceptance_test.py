from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from accounts.models import OfferedSkill

User = get_user_model()
USERNAME = "__svaply_phase1_offer_acceptance__"

User.objects.filter(username=USERNAME).delete()
user = User.objects.create_user(
    username=USERNAME,
    email="__svaply_phase1_offer_acceptance__@example.com",
    password="StrongPass123",
    is_verified=True,
)

client = APIClient()
client.force_authenticate(user)
url = reverse("accounts:skills_list")


def payload(subcategory, description="Testovací opis", is_seeking=False):
    return {
        "category": "Remeslá",
        "subcategory": subcategory,
        "description": description,
        "country_code": "SK",
        "district_code": "nitra",
        "is_seeking": is_seeking,
    }


try:
    accepted = client.post(url, payload("Maliar", "a" * 150), format="json")
    assert accepted.status_code == 201, accepted.data
    offer_id = accepted.data["id"]

    rejected = client.post(url, payload("Stolár", "a" * 151), format="json")
    assert rejected.status_code == 400, rejected.data
    assert rejected.data["code"] == "offer_description_too_long"
    assert not OfferedSkill.objects.filter(user=user, subcategory="Stolár").exists()

    patched = client.patch(
        f"/api/auth/skills/{offer_id}/",
        {"description": "b" * 151},
        format="json",
    )
    assert patched.status_code == 400, patched.data
    assert patched.data["code"] == "offer_description_too_long"

    duplicate = client.post(url, payload("Maliar"), format="json")
    assert duplicate.status_code == 400, duplicate.data
    assert duplicate.data["code"] == "duplicate_offer"

    cross_type_duplicate = client.post(
        url,
        payload("Maliar", is_seeking=True),
        format="json",
    )
    assert cross_type_duplicate.status_code == 400, cross_type_duplicate.data
    assert cross_type_duplicate.data["code"] == "duplicate_offer"

    invalid_district = client.post(
        url,
        {
            **payload("Elektrikár"),
            "district_code": "brno-mesto",
        },
        format="json",
    )
    assert invalid_district.status_code == 400, invalid_district.data
    assert invalid_district.data["code"] == "offer_validation_failed"

    assert client.post(url, payload("Murár"), format="json").status_code == 201
    assert client.post(url, payload("Tesár"), format="json").status_code == 201

    fourth_offer = client.post(url, payload("Štvrtá ponuka"), format="json")
    assert fourth_offer.status_code == 400, fourth_offer.data
    assert fourth_offer.data["code"] == "offer_limit_reached"

    for name in ["Dopyt 1", "Dopyt 2", "Dopyt 3"]:
        response = client.post(url, payload(name, is_seeking=True), format="json")
        assert response.status_code == 201, response.data

    fourth_request = client.post(
        url,
        payload("Dopyt 4", is_seeking=True),
        format="json",
    )
    assert fourth_request.status_code == 400, fourth_request.data
    assert fourth_request.data["code"] == "offer_limit_reached"

    assert OfferedSkill.objects.filter(user=user, is_seeking=False).count() == 3
    assert OfferedSkill.objects.filter(user=user, is_seeking=True).count() == 3

    print("PASS: API validácia ponúk a dopytov")
finally:
    User.objects.filter(username=USERNAME).delete()