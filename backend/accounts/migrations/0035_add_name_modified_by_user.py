# Generated manually for name_modified_by_user field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0034_user_slug'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='name_modified_by_user',
            field=models.BooleanField(default=False, verbose_name='Meno upravené používateľom'),
        ),
    ]

