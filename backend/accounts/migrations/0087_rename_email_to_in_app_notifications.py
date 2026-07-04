from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Premenovanie preferencie email_notifications -> in_app_notifications.

    Email notifikácie (mimo verifikácie/resetu) nikdy neexistovali, toggle nič
    nerobil. Pole sa mení na skutočný in-app notifikačný prepínač. RenameField
    zachová existujúce hodnoty (True/False) používateľov – žiadna strata dát.
    """

    dependencies = [
        ("accounts", "0086_search_unaccent_indexes"),
    ]

    operations = [
        migrations.RenameField(
            model_name="userprofile",
            old_name="email_notifications",
            new_name="in_app_notifications",
        ),
        migrations.AlterField(
            model_name="userprofile",
            name="in_app_notifications",
            field=models.BooleanField(
                default=True, verbose_name="In-app notifikácie"
            ),
        ),
    ]
