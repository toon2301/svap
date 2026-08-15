from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0110_add_offer_watches"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="offeredskill",
            name="unique_user_skill_category",
        ),
        migrations.AddConstraint(
            model_name="offeredskill",
            constraint=models.UniqueConstraint(
                fields=("user", "category", "subcategory", "is_seeking"),
                name="unique_user_skill_category_type",
            ),
        ),
    ]
