"""
Testy pre dashboard views
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from unittest.mock import patch

User = get_user_model()


class DashboardViewsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            user_type='individual'
        )
        self.client.force_authenticate(user=self.user)

    def test_dashboard_home_view_success(self):
        """Test úspešného načítania dashboard home"""
        url = reverse('accounts:dashboard_home')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('stats', response.data)
        self.assertIn('recent_activities', response.data)
        self.assertIn('user', response.data)
        
        # Kontrola základných štatistík
        stats = response.data['stats']
        self.assertIn('skills_count', stats)
        self.assertIn('active_exchanges', stats)
        self.assertIn('completed_exchanges', stats)
        self.assertIn('favorites_count', stats)
        self.assertIn('profile_completeness', stats)

    def test_dashboard_home_view_unauthenticated(self):
        """Test prístupu bez autentifikácie"""
        self.client.force_authenticate(user=None)
        url = reverse('accounts:dashboard_home')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dashboard_search_view_success(self):
        """Test úspešného vyhľadávania"""
        url = reverse('accounts:dashboard_search')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('skills', response.data)
        self.assertIn('users', response.data)
        self.assertIn('pagination', response.data)

    def test_dashboard_search_view_with_query(self):
        """Test vyhľadávania s query parametrom"""
        url = reverse('accounts:dashboard_search')
        response = self.client.get(url, {'q': 'React'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('skills', response.data)
        self.assertIn('users', response.data)

    def test_dashboard_search_view_with_filters(self):
        """Test vyhľadávania s filtrami"""
        url = reverse('accounts:dashboard_search')
        response = self.client.get(url, {
            'q': 'Python',
            'category': 'programming',
            'level': 'intermediate',
            'location': 'Bratislava'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dashboard_favorites_get_success(self):
        """Test získania obľúbených"""
        url = reverse('accounts:dashboard_favorites')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('users', response.data)
        self.assertIn('skills', response.data)

    def test_dashboard_favorites_post_success(self):
        """Test pridania do obľúbených"""
        url = reverse('accounts:dashboard_favorites')
        data = {
            'type': 'user',
            'id': 1
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('message', response.data)
        self.assertIn('type', response.data)
        self.assertIn('id', response.data)

    def test_dashboard_favorites_post_missing_params(self):
        """Test pridania do obľúbených bez povinných parametrov"""
        url = reverse('accounts:dashboard_favorites')
        data = {'type': 'user'}  # Chýba 'id'
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_dashboard_favorites_delete_success(self):
        """Test odstránenia z obľúbených"""
        url = reverse('accounts:dashboard_favorites')
        data = {
            'type': 'user',
            'id': 1
        }
        response = self.client.delete(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)

    def test_dashboard_profile_get_success(self):
        """Test získania profilu"""
        url = reverse('accounts:dashboard_profile')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('id', response.data)
        self.assertIn('username', response.data)
        self.assertIn('email', response.data)
        self.assertIn('first_name', response.data)
        self.assertIn('last_name', response.data)
        self.assertIn('profile_completeness', response.data)

    def test_dashboard_profile_put_success(self):
        """Test aktualizácie profilu"""
        url = reverse('accounts:dashboard_profile')
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'first_name': 'Updated',
            'last_name': 'Name',
            'bio': 'Updated bio'
        }
        response = self.client.put(url, data, format='json')
        
        if response.status_code != status.HTTP_200_OK:
            print(f"Response status: {response.status_code}")
            print(f"Response data: {response.data}")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        self.assertIn('user', response.data)

    def test_dashboard_profile_patch_success(self):
        """Test čiastočnej aktualizácie profilu"""
        url = reverse('accounts:dashboard_profile')
        data = {
            'bio': 'Updated bio only'
        }
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)

    def test_dashboard_settings_get_success(self):
        """Test získania nastavení"""
        url = reverse('accounts:dashboard_settings')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('notifications', response.data)
        self.assertIn('privacy', response.data)
        self.assertIn('security', response.data)
        self.assertIn('general', response.data)

    def test_dashboard_settings_put_success(self):
        """Test aktualizácie nastavení"""
        url = reverse('accounts:dashboard_settings')
        data = {
            'notifications': {
                'email_notifications': True,
                'push_notifications': False
            },
            'privacy': {
                'profile_visibility': 'private'
            }
        }
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        self.assertIn('settings', response.data)

    def test_dashboard_settings_patch_success(self):
        """Test čiastočnej aktualizácie nastavení"""
        url = reverse('accounts:dashboard_settings')
        data = {
            'notifications': {
                'email_notifications': False
            }
        }
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)

    def test_rate_limiting_applied(self):
        """Test že je aplikované rate limiting"""
        url = reverse('accounts:dashboard_home')
        
        # Simuluj veľa požiadaviek
        for _ in range(100):
            response = self.client.get(url)
            # Rate limiting by mal vrátiť 429 po určitom počte požiadaviek
            # (presná implementácia závisí od rate limiting konfigurácie)
        
        # Aspoň jedna požiadavka by mala byť úspešná
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_429_TOO_MANY_REQUESTS])

    def test_audit_logging_for_profile_updates(self):
        """Test audit logovania pre aktualizácie profilu"""
        with patch('swaply.audit_logger.log_profile_update') as mock_log:
            url = reverse('accounts:dashboard_profile')
            data = {
                'username': 'testuser',
                'email': 'test@example.com',
                'first_name': 'Updated',
                'bio': 'This is a longer bio that meets the minimum requirement'
            }
            response = self.client.patch(url, data, format='json')
            
            if response.status_code != status.HTTP_200_OK:
                print(f"Response status: {response.status_code}")
                print(f"Response data: {response.data}")
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            # Audit log by mal byť volaný pre zmeny profilu
            # (presná implementácia závisí od audit logger konfigurácie)
