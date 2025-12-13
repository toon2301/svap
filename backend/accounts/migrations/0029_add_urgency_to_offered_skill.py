from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0028_add_is_seeking_to_offered_skill'),
    ]

    operations = [
        migrations.AddField(
            model_name='offeredskill',
            name='urgency',
            field=models.CharField(choices=[('low', 'Nízka'), ('medium', 'Stredná'), ('high', 'Vysoká')], default='medium', help_text='Miera urgentnosti dopytu alebo ponuky', max_length=10, verbose_name='Urgentnosť'),
        ),
    ]

