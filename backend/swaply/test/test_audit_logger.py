"""
Testy pre audit logger funkcionalitu
"""
import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
from swaply.audit_logger import (
    log_login_success,
    log_login_failed,
    log_registration_success,
    log_email_verification_success,
    log_email_verification_failed,
    log_profile_update
)
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from swaply.audit_logger import AuditLog, log_login_success, log_login_failed, log_registration_success, log_email_verification_success, log_email_verification_failed

User = get_user_model()


class TestAuditLogger(TestCase):
    """Testy pre audit logger funkcionalitu"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.ip_address = '192.168.1.1'
        self.user_agent = 'Mozilla/5.0 (Test Browser)'
    
    @patch('swaply.audit_logger.audit_logger')
    @patch('swaply.audit_logger.settings')
    def test_log_login_success(self, mock_settings, mock_audit_logger):
        """Test logovania úspešného prihlásenia"""
        # Povoliť audit logging pre test
        mock_settings.AUDIT_LOGGING_ENABLED = True
        
        log_login_success(self.user, self.ip_address, self.user_agent)
        
        # Kontrola, že sa zavolal audit_logger.info
        mock_audit_logger.info.assert_called_once()
        
        # Kontrola obsahu logu
        call_args = mock_audit_logger.info.call_args
        extra_data = call_args[1]['extra']
        
        self.assertEqual(extra_data['action'], 'login_success')
        self.assertEqual(extra_data['user_id'], self.user.id)
        self.assertEqual(extra_data['user_email'], self.user.email)
        self.assertEqual(extra_data['ip_address'], self.ip_address)
        self.assertEqual(extra_data['user_agent'], self.user_agent)
        self.assertIn('timestamp', extra_data)
    
    @patch('swaply.audit_logger.audit_logger')
    def test_log_login_failed(self, mock_audit_logger):
        """Test logovania neúspešného prihlásenia"""
        email = 'test@example.com'
        reason = 'invalid_credentials'
        
        log_login_failed(email, self.ip_address, self.user_agent, reason)
        
        # Kontrola, že sa zavolal audit_logger.warning
        mock_audit_logger.warning.assert_called_once()
        
        # Kontrola obsahu logu
        call_args = mock_audit_logger.warning.call_args
        extra_data = call_args[1]['extra']
        
        self.assertEqual(extra_data['event_type'], 'login_failed')
        self.assertIsNone(extra_data['user_id'])
        self.assertIsNone(extra_data['user_email'])
        self.assertEqual(extra_data['ip_address'], self.ip_address)
        self.assertEqual(extra_data['user_agent'], self.user_agent)
        self.assertEqual(extra_data['details']['reason'], reason)
    
    @patch('swaply.audit_logger.audit_logger')
    @patch('swaply.audit_logger.settings')
    def test_log_registration_success(self, mock_settings, mock_audit_logger):
        """Test logovania úspešnej registrácie"""
        # Povoliť audit logging pre test
        mock_settings.AUDIT_LOGGING_ENABLED = True
        log_registration_success(self.user, self.ip_address, self.user_agent)
        
        # Kontrola, že sa zavolal audit_logger.info
        mock_audit_logger.info.assert_called_once()
        
        # Kontrola obsahu logu
        call_args = mock_audit_logger.info.call_args
        extra_data = call_args[1]['extra']
        
        self.assertEqual(extra_data['action'], 'registration_success')
        self.assertEqual(extra_data['user_id'], self.user.id)
        self.assertEqual(extra_data['user_email'], self.user.email)
        self.assertEqual(extra_data['ip_address'], self.ip_address)
        self.assertEqual(extra_data['user_agent'], self.user_agent)
    
    @patch('swaply.audit_logger.audit_logger')
    @patch('swaply.audit_logger.settings')
    def test_log_email_verification_success(self, mock_settings, mock_audit_logger):
        # Povoliť audit logging pre test
        mock_settings.AUDIT_LOGGING_ENABLED = True
        """Test logovania úspešnej email verifikácie"""
        log_email_verification_success(self.user, self.ip_address, self.user_agent)
        
        # Kontrola, že sa zavolal audit_logger.info
        mock_audit_logger.info.assert_called_once()
        
        # Kontrola obsahu logu
        call_args = mock_audit_logger.info.call_args
        extra_data = call_args[1]['extra']
        
        self.assertEqual(extra_data['action'], 'email_verification_success')
        self.assertEqual(extra_data['user_id'], self.user.id)
        self.assertEqual(extra_data['user_email'], self.user.email)
        self.assertEqual(extra_data['ip_address'], self.ip_address)
        self.assertEqual(extra_data['user_agent'], self.user_agent)
    
    @patch('swaply.audit_logger.audit_logger')
    def test_log_email_verification_failed(self, mock_audit_logger):
        """Test logovania neúspešnej email verifikácie"""
        token = 'test-token-123'
        reason = 'invalid_or_expired'
        
        log_email_verification_failed(token, self.ip_address, self.user_agent, reason)
        
        # Kontrola, že sa zavolal audit_logger.warning
        mock_audit_logger.warning.assert_called_once()
        
        # Kontrola obsahu logu
        call_args = mock_audit_logger.warning.call_args
        extra_data = call_args[1]['extra']
        
        self.assertEqual(extra_data['event_type'], 'email_verification_failed')
        self.assertIsNone(extra_data['user_id'])
        self.assertIsNone(extra_data['user_email'])
        self.assertEqual(extra_data['ip_address'], self.ip_address)
        self.assertEqual(extra_data['user_agent'], self.user_agent)
        self.assertIn('token', extra_data['details'])
        self.assertEqual(extra_data['details']['reason'], reason)
    
    @patch('swaply.audit_logger.audit_logger')
    @patch('swaply.audit_logger.settings')
    def test_log_profile_update(self, mock_settings, mock_audit_logger):
        # Povoliť audit logging pre test
        mock_settings.AUDIT_LOGGING_ENABLED = True
        """Test logovania aktualizácie profilu"""
        changes = {
            'first_name': {'old': 'John', 'new': 'Jane'},
            'bio': {'old': 'Old bio', 'new': 'New bio'}
        }
        
        log_profile_update(self.user, changes, self.ip_address, self.user_agent)
        
        # Kontrola, že sa zavolal audit_logger.info (2x - pre data_change a user_action)
        self.assertEqual(mock_audit_logger.info.call_count, 2)
        
        # Kontrola obsahu logu
        calls = mock_audit_logger.info.call_args_list
        
        # Prvý call - data_change
        first_call_extra = calls[0][1]['extra']
        self.assertEqual(first_call_extra['action'], 'update')
        self.assertEqual(first_call_extra['model_name'], 'UserProfile')
        
        # Druhý call - user_action
        second_call_extra = calls[1][1]['extra']
        self.assertEqual(second_call_extra['action'], 'profile_update')
        self.assertEqual(second_call_extra['user_id'], self.user.id)
        self.assertEqual(second_call_extra['user_email'], self.user.email)
    
    @patch('swaply.audit_logger.audit_logger')
    @patch('swaply.audit_logger.settings')
    def test_log_entry_structure(self, mock_settings, mock_audit_logger):
        # Povoliť audit logging pre test
        mock_settings.AUDIT_LOGGING_ENABLED = True
        """Test štruktúry log záznamu"""
        log_login_success(self.user, self.ip_address, self.user_agent)
        
        call_args = mock_audit_logger.info.call_args
        extra_data = call_args[1]['extra']
        
        # Kontrola povinných polí
        required_fields = ['timestamp', 'action', 'user_id', 'user_email', 'ip_address', 'user_agent', 'details']
        for field in required_fields:
            self.assertIn(field, extra_data)
        
        # Kontrola formátu timestamp
        from datetime import datetime
        try:
            datetime.fromisoformat(extra_data['timestamp'].replace('Z', '+00:00'))
        except ValueError:
            self.fail("Timestamp is not in valid ISO format")


def test_audit_log_user_and_security_events(db):
    user = User.objects.create_user(username='u', email='u@example.com', password='StrongPass123', is_verified=True)
    # Should not raise exceptions
    AuditLog.log_user_action(user, 'action', details={'k': 'v'}, ip_address='127.0.0.1', user_agent='ua')
    AuditLog.log_security_event('evt', details={'x': 1}, ip_address='127.0.0.1', user_agent='ua', user=user)


def test_audit_convenience_functions(db):
    user = User.objects.create_user(username='u2', email='u2@example.com', password='StrongPass123', is_verified=True)
    log_login_success(user, '127.0.0.1', 'ua')
    log_login_failed('u2@example.com', '127.0.0.1', 'ua')
    log_registration_success(user, '127.0.0.1', 'ua')
    log_email_verification_success(user, '127.0.0.1', 'ua')
    log_email_verification_failed('token', '127.0.0.1', 'ua', reason='invalid')
