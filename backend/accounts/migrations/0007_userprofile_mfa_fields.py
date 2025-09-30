from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_emailverification'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='mfa_enabled',
            field=models.BooleanField(default=False, verbose_name='Zapnuté 2FA'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='mfa_secret',
            field=models.CharField(default='', blank=True, max_length=64, verbose_name='2FA TOTP secret'),
        ),
    ]


