"""
Testy pre accounts serializátory
"""
import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from factory import Faker, SubFactory
from factory.django import DjangoModelFactory
from datetime import date

from accounts.serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer
)
from accounts.models import UserType

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


@pytest.mark.django_db
class TestUserRegistrationSerializer(TestCase):
    """Testy pre UserRegistrationSerializer"""
    
    def setUp(self):
        self.valid_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'user_type': 'individual',
            'birth_day': '15',
            'birth_month': '06',
            'birth_year': '1990',
            'gender': 'male',
            'captcha_token': 'test_captcha_token'
        }
    
    def test_valid_registration_data(self):
        """Test validných registračných údajov"""
        serializer = UserRegistrationSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid())
    
    def test_password_mismatch(self):
        """Test nezhody hesiel"""
        data = self.valid_data.copy()
        data['password_confirm'] = 'different_password'
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
    
    def test_invalid_email(self):
        """Test neplatného emailu"""
        data = self.valid_data.copy()
        data['email'] = 'invalid-email'
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
    
    def test_duplicate_email(self):
        """Test duplicitného emailu"""
        UserFactory(email='test@example.com')
        
        serializer = UserRegistrationSerializer(data=self.valid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
    
    def test_duplicate_username(self):
        """Test duplicitného username"""
        UserFactory(username='testuser')
        
        serializer = UserRegistrationSerializer(data=self.valid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('username', serializer.errors)
    
    def test_company_validation(self):
        """Test validácie pre firmy"""
        data = self.valid_data.copy()
        data['user_type'] = 'company'
        data['company_name'] = 'Test Company'
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertTrue(serializer.is_valid())
    
    def test_company_missing_name(self):
        """Test chýbajúceho názvu firmy"""
        data = self.valid_data.copy()
        data['user_type'] = 'company'
        # company_name chýba
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
    
    def test_age_validation(self):
        """Test validácie veku"""
        data = self.valid_data.copy()
        data['birth_year'] = '2015'  # Príliš mladý (menej ako 13 rokov)
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
    
    def test_invalid_birth_date(self):
        """Test neplatného dátumu narodenia"""
        data = self.valid_data.copy()
        data['birth_day'] = '32'  # Neplatný deň
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
    
    def test_user_creation(self):
        """Test vytvorenia používateľa"""
        serializer = UserRegistrationSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid())
        
        user = serializer.save()
        self.assertIsInstance(user, User)
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.user_type, UserType.INDIVIDUAL)


@pytest.mark.django_db
class TestUserLoginSerializer(TestCase):
    """Testy pre UserLoginSerializer"""
    
    def setUp(self):
        self.user = UserFactory(
            email='test@example.com',
            username='testuser'
        )
        self.user.set_password('testpass123')
        self.user.save()
    
    def test_valid_login(self):
        """Test validného prihlásenia"""
        # Označ používateľa ako overeného
        self.user.is_verified = True
        self.user.save()
        
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        
        serializer = UserLoginSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['user'], self.user)
    
    def test_invalid_credentials(self):
        """Test neplatných prihlasovacích údajov"""
        data = {
            'email': 'test@example.com',
            'password': 'wrong_password'
        }
        
        serializer = UserLoginSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
    
    def test_inactive_user(self):
        """Test neaktívneho používateľa"""
        self.user.is_active = False
        self.user.save()
        
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        
        serializer = UserLoginSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
    
    def test_missing_fields(self):
        """Test chýbajúcich polí"""
        data = {
            'email': 'test@example.com'
            # password chýba
        }
        
        serializer = UserLoginSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)


@pytest.mark.django_db
class TestUserProfileSerializer(TestCase):
    """Testy pre UserProfileSerializer"""
    
    def setUp(self):
        self.user = UserFactory()
    
    def test_serialization(self):
        """Test serializácie používateľa"""
        serializer = UserProfileSerializer(self.user)
        data = serializer.data
        
        self.assertIn('id', data)
        self.assertIn('username', data)
        self.assertIn('email', data)
        self.assertIn('user_type', data)
        self.assertIn('profile_completeness', data)
    
    def test_read_only_fields(self):
        """Test read-only polí"""
        serializer = UserProfileSerializer(self.user)
        
        # Tieto polia by nemali byť editovateľné
        read_only_fields = ['id', 'is_verified', 'created_at', 'updated_at', 'profile_completeness']
        
        for field in read_only_fields:
            if field in serializer.fields:
                self.assertTrue(serializer.fields[field].read_only, f"Field {field} should be read-only")
    
    def test_update_profile(self):
        """Test aktualizácie profilu"""
        data = {
            'first_name': 'Updated',
            'last_name': 'Name',
            'bio': 'Updated bio'
        }
        
        serializer = UserProfileSerializer(self.user, data=data, partial=True)
        self.assertTrue(serializer.is_valid())
        
        updated_user = serializer.save()
        self.assertEqual(updated_user.first_name, 'Updated')
        self.assertEqual(updated_user.last_name, 'Name')
        self.assertEqual(updated_user.bio, 'Updated bio')
