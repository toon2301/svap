from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, UserProfile, UserType


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin rozhranie pre User model"""
    
    list_display = [
        'username', 'email', 'user_type', 'is_verified', 'is_active', 'created_at'
    ]
    list_filter = [
        'user_type', 'is_verified', 'is_active', 'is_staff', 
        'is_superuser', 'created_at'
    ]
    search_fields = ['username', 'email', 'company_name']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Osobné informácie'), {
            'fields': ('first_name', 'last_name', 'email', 'phone', 'bio', 'avatar', 'location')
        }),
        (_('Typ účtu'), {
            'fields': ('user_type', 'company_name', 'website')
        }),
        (_('Sociálne siete'), {
            'fields': ('linkedin', 'facebook', 'instagram'),
            'classes': ('collapse',)
        }),
        (_('Nastavenia'), {
            'fields': ('is_verified', 'is_public', 'is_active', 'is_staff', 'is_superuser')
        }),
        (_('Dôležité dátumy'), {
            'fields': ('last_login', 'date_joined', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        (_('Oprávnenia'), {
            'fields': ('groups', 'user_permissions'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'user_type'),
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'date_joined', 'last_login']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin rozhranie pre UserProfile model"""
    
    list_display = ['user', 'preferred_communication', 'email_notifications', 'created_at']
    list_filter = ['preferred_communication', 'email_notifications', 'push_notifications', 'created_at']
    search_fields = ['user__username', 'user__email', 'user__first_name', 'user__last_name']
    ordering = ['-created_at']
    
    fieldsets = (
        (_('Používateľ'), {
            'fields': ('user',)
        }),
        (_('Preferencie'), {
            'fields': ('preferred_communication',)
        }),
        (_('Notifikácie'), {
            'fields': ('email_notifications', 'push_notifications')
        }),
        (_('Súkromie'), {
            'fields': ('show_email', 'show_phone')
        }),
        (_('Dôležité dátumy'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']


# Vlastné nastavenia admin rozhrania
admin.site.site_header = "Swaply Admin"
admin.site.site_title = "Swaply Admin"
admin.site.index_title = "Správa Swaply"
