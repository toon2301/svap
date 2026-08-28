import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0119_offeredskill_watch_match_index'),
    ]

    operations = [
        migrations.CreateModel(
            name='OfferWatchMatchOutbox',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                ('attempt_count', models.PositiveIntegerField(default=0)),
                (
                    'claimed_at',
                    models.DateTimeField(blank=True, db_index=True, null=True),
                ),
                (
                    'last_attempt_at',
                    models.DateTimeField(blank=True, null=True),
                ),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'offer',
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='watch_match_outbox',
                        to='accounts.offeredskill',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Čakajúce párovanie sledovania',
                'verbose_name_plural': 'Čakajúce párovania sledovaní',
                'ordering': ['id'],
            },
        ),
    ]
