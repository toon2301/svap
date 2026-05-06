from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0009_upload_to_model_functions"),
        ("accounts", "0058_favoriteuser"),
    ]

    operations = [
        migrations.AlterField(
            model_name="notification",
            name="type",
            field=models.CharField(
                choices=[
                    ("skill_request", "Nová žiadosť"),
                    ("skill_request_accepted", "Žiadosť prijatá"),
                    ("skill_request_rejected", "Žiadosť zamietnutá"),
                    ("skill_request_cancelled", "Žiadosť zrušená"),
                    ("group_invitation", "Pozvánka do skupiny"),
                ],
                max_length=50,
                verbose_name="Typ",
            ),
        ),
        migrations.AddField(
            model_name="notification",
            name="actor",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Aktér",
            ),
        ),
        migrations.AddField(
            model_name="notification",
            name="conversation",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="notifications",
                to="messaging.conversation",
                verbose_name="Konverzácia",
            ),
        ),
        migrations.AddField(
            model_name="notification",
            name="group_invitation",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="notifications",
                to="messaging.groupinvitation",
                verbose_name="Skupinová pozvánka",
            ),
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(
                fields=["user", "created_at"],
                name="accounts_no_user_id_501ff2_idx",
            ),
        ),
    ]
