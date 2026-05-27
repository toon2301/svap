from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0071_offeredskill_price_negotiable"),
    ]

    operations = [
        migrations.AddField(
            model_name="skillrequest",
            name="proposal_description",
            field=models.TextField(blank=True, default="", max_length=200, verbose_name="Opis pomoci"),
        ),
        migrations.AddField(
            model_name="skillrequest",
            name="proposal_experience_unit",
            field=models.CharField(
                blank=True,
                choices=[("years", "Roky"), ("months", "Mesiace")],
                default="",
                max_length=10,
                verbose_name="Jednotka navrhovanej praxe",
            ),
        ),
        migrations.AddField(
            model_name="skillrequest",
            name="proposal_experience_value",
            field=models.FloatField(blank=True, null=True, verbose_name="Navrhovaná dĺžka praxe"),
        ),
        migrations.AddField(
            model_name="skillrequest",
            name="proposal_price_currency",
            field=models.CharField(blank=True, default="", max_length=8, verbose_name="Navrhovaná mena"),
        ),
        migrations.AddField(
            model_name="skillrequest",
            name="proposal_price_from",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=10,
                null=True,
                verbose_name="Navrhovaná cena od",
            ),
        ),
        migrations.AddField(
            model_name="skillrequest",
            name="proposal_price_negotiable",
            field=models.BooleanField(default=False, verbose_name="Navrhovaná cena dohodou"),
        ),
        migrations.AddField(
            model_name="skillrequest",
            name="proposed_offer",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="proposed_skill_requests",
                to="accounts.offeredskill",
                verbose_name="Navrhovaná karta",
            ),
        ),
    ]
