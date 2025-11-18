from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0019_offeredskill_price_currency_offeredskill_price_from'),
    ]

    operations = [
        migrations.AddField(
            model_name='offeredskill',
            name='location',
            field=models.CharField(blank=True, max_length=25, verbose_name='Miesto'),
        ),
    ]

