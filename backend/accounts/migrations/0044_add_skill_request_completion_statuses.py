# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0043_add_owner_response_to_review'),
    ]

    operations = [
        migrations.AlterField(
            model_name='skillrequest',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Čaká na odpoveď'),
                    ('accepted', 'Prijaté'),
                    ('rejected', 'Zamietnuté'),
                    ('cancelled', 'Zrušené'),
                    ('completion_requested', 'Completion requested'),
                    ('completed', 'Completed'),
                ],
                default='pending',
                max_length=25,
                verbose_name='Stav',
            ),
        ),
    ]
