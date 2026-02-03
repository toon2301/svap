from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0040_skillrequest_notification_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='skillrequest',
            name='hidden_by_requester',
            field=models.BooleanField(default=False, verbose_name='Skryté pre odosielateľa'),
        ),
        migrations.AddField(
            model_name='skillrequest',
            name='hidden_by_recipient',
            field=models.BooleanField(default=False, verbose_name='Skryté pre príjemcu'),
        ),
    ]

