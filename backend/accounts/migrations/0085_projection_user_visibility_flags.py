from django.db import migrations, models


def backfill_user_visibility_flags(apps, schema_editor):
    """
    Denormalizuj is_active/is_staff/is_superuser z User do projekcie.

    Defaulty polí (is_active=True, is_staff=False, is_superuser=False) platia pre
    drvivú väčšinu používateľov, takže prepisujeme len riadky používateľov, ktorí
    sa od defaultov líšia (neaktívni / staff / superuser).
    """
    Projection = apps.get_model("accounts", "DashboardSkillSearchProjection")
    User = apps.get_model("accounts", "User")

    flagged_users = (
        User.objects.filter(
            models.Q(is_active=False)
            | models.Q(is_staff=True)
            | models.Q(is_superuser=True)
        )
        .values("pk", "is_active", "is_staff", "is_superuser")
        .iterator(chunk_size=500)
    )

    for user in flagged_users:
        Projection.objects.filter(user_id=user["pk"]).update(
            user_is_active=user["is_active"],
            user_is_staff=user["is_staff"],
            user_is_superuser=user["is_superuser"],
        )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0084_accountdeletionrequest"),
    ]

    operations = [
        migrations.AddField(
            model_name="dashboardskillsearchprojection",
            name="user_is_active",
            field=models.BooleanField(default=True, verbose_name="Aktívny používateľ"),
        ),
        migrations.AddField(
            model_name="dashboardskillsearchprojection",
            name="user_is_staff",
            field=models.BooleanField(default=False, verbose_name="Staff používateľ"),
        ),
        migrations.AddField(
            model_name="dashboardskillsearchprojection",
            name="user_is_superuser",
            field=models.BooleanField(default=False, verbose_name="Superuser"),
        ),
        migrations.RunPython(
            backfill_user_visibility_flags,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
