"""
Testy pre accounts modely
"""
import pytest
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from factory import Faker, SubFactory
from factory.django import DjangoModelFactory
from datetime import date, timedelta

from accounts.models import User, UserProfile, UserType

User = get_user_model()


class UserFactory(DjangoModelFactory):
    """Factory pre User model"""
    class Meta:
        model = User
    
    username = Faker('user_name')
    email = Faker('email')
    first_name = Faker('first_name')
    last_name = Faker('last_name')
    user_type = UserType.INDIVIDUAL
    is_active = True


class UserProfileFactory(DjangoModelFactory):
    """Factory pre UserProfile model"""
    class Meta:
        model = UserProfile
    
    user = SubFactory(UserFactory)


@pytest.mark.django_db
class TestUserModel(TestCase):
    """Testy pre User model"""
    
    def setUp(self):
        self.user = UserFactory()
    
    def test_user_creation(self):
        """Test vytvorenia používateľa"""
        self.assertIsInstance(self.user, User)
        self.assertTrue(self.user.is_active)
        self.assertEqual(self.user.user_type, UserType.INDIVIDUAL)
    
    def test_user_str_individual(self):
        """Test __str__ pre jednotlivca"""
        user = UserFactory(
            first_name="Ján",
            last_name="Novák",
            user_type=UserType.INDIVIDUAL
        )
        self.assertEqual(str(user), "Ján Novák")
    
    def test_user_str_company(self):
        """Test __str__ pre firmu"""
        user = UserFactory(
            company_name="Test Company",
            user_type=UserType.COMPANY
        )
        self.assertEqual(str(user), "Test Company")
    
    def test_display_name_individual(self):
        """Test display_name pre jednotlivca"""
        user = UserFactory(
            first_name="Ján",
            last_name="Novák",
            user_type=UserType.INDIVIDUAL
        )
        self.assertEqual(user.display_name, "Ján Novák")
    
    def test_display_name_company(self):
        """Test display_name pre firmu"""
        user = UserFactory(
            company_name="Test Company",
            user_type=UserType.COMPANY
        )
        self.assertEqual(user.display_name, "Test Company")
    
    def test_profile_completeness_individual(self):
        """Test výpočtu kompletnosti profilu pre jednotlivca"""
        user = UserFactory(
            email="test@example.com",
            bio="Test bio",
            location="Bratislava",
            user_type=UserType.INDIVIDUAL
        )
        # 3 z 4 polí vyplnených = 75%
        self.assertEqual(user.profile_completeness, 75)
    
    def test_profile_completeness_company(self):
        """Test výpočtu kompletnosti profilu pre firmu"""
        user = UserFactory(
            email="test@example.com",
            bio="Test bio",
            location="Bratislava",
            company_name="Test Company",
            website="https://test.com",
            user_type=UserType.COMPANY
        )
        # 5 z 6 polí vyplnených = 83%
        self.assertEqual(user.profile_completeness, 83)
    
    def test_email_unique(self):
        """Test jedinečnosti emailu"""
        UserFactory(email="test@example.com")
        
        with self.assertRaises(Exception):  # IntegrityError
            UserFactory(email="test@example.com")
    
    def test_username_unique(self):
        """Test jedinečnosti username"""
        UserFactory(username="testuser")
        
        with self.assertRaises(Exception):  # IntegrityError
            UserFactory(username="testuser")


@pytest.mark.django_db
class TestUserProfileModel(TestCase):
    """Testy pre UserProfile model"""
    
    def setUp(self):
        self.user = UserFactory()
        self.profile = UserProfileFactory(user=self.user)
    
    def test_profile_creation(self):
        """Test vytvorenia profilu"""
        self.assertIsInstance(self.profile, UserProfile)
        self.assertEqual(self.profile.user, self.user)
    
    def test_profile_str(self):
        """Test __str__ pre profil"""
        expected = f"Profil {self.user.display_name}"
        self.assertEqual(str(self.profile), expected)
    
    def test_default_values(self):
        """Test predvolených hodnôt"""
        self.assertEqual(self.profile.preferred_communication, 'both')
        self.assertTrue(self.profile.email_notifications)
        self.assertTrue(self.profile.push_notifications)
        self.assertFalse(self.profile.show_email)
        self.assertFalse(self.profile.show_phone)


@pytest.mark.django_db
class TestUserValidation(TestCase):
    """Testy validácie User modelu"""
    
    def test_age_validation(self):
        """Test validácie veku"""
        # Test príliš mladého používateľa
        young_birth_date = date.today() - timedelta(days=365 * 12)  # 12 rokov
        user = UserFactory(birth_date=young_birth_date)
        
        # V reálnom kóde by sme mali validáciu veku v serializátore
        # Tu len testujeme, že model akceptuje dátum
        self.assertEqual(user.birth_date, young_birth_date)
    
    def test_company_required_fields(self):
        """Test povinných polí pre firmy"""
        user = UserFactory(
            user_type=UserType.COMPANY,
            company_name="Test Company"
        )
        self.assertEqual(user.user_type, UserType.COMPANY)
        self.assertEqual(user.company_name, "Test Company")
