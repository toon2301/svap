from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import swaply.validators


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("accounts", "0072_skillrequest_help_proposal"),
    ]

    operations = [
        migrations.CreateModel(
            name="PortfolioItem",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(max_length=120, verbose_name="Nazov")),
                ("category", models.CharField(max_length=100, verbose_name="Kategoria")),
                (
                    "description",
                    models.TextField(blank=True, default="", max_length=1000, verbose_name="Popis"),
                ),
                ("sort_order", models.PositiveIntegerField(default=0, verbose_name="Poradie")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Vytvorene")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Aktualizovane")),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="portfolio_items",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Vlastnik",
                    ),
                ),
                (
                    "related_offer",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="portfolio_items",
                        to="accounts.offeredskill",
                        verbose_name="Suvisiaca ponuka",
                    ),
                ),
            ],
            options={
                "verbose_name": "Polozka portfolia",
                "verbose_name_plural": "Polozky portfolia",
                "ordering": ["sort_order", "id"],
                "indexes": [
                    models.Index(
                        fields=["owner", "sort_order", "id"],
                        name="port_item_owner_order_idx",
                    )
                ],
            },
        ),
        migrations.CreateModel(
            name="PortfolioImage",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "image",
                    models.ImageField(
                        blank=True,
                        null=True,
                        upload_to="portfolio/",
                        validators=[swaply.validators.validate_image_file],
                        verbose_name="Obrazok",
                    ),
                ),
                ("order", models.PositiveIntegerField(default=0, verbose_name="Poradie")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Caka na spracovanie"),
                            ("approved", "Schvalene"),
                            ("rejected", "Zamietnute"),
                        ],
                        default="pending",
                        help_text="PENDING/REJECTED sa pouzivaju pri neskorsom spracovani obrazkov.",
                        max_length=20,
                        verbose_name="Stav",
                    ),
                ),
                (
                    "pending_key",
                    models.CharField(
                        blank=True,
                        default="",
                        max_length=1024,
                        verbose_name="S3 kluc (pending)",
                    ),
                ),
                (
                    "approved_key",
                    models.CharField(
                        blank=True,
                        default="",
                        max_length=1024,
                        verbose_name="S3 kluc (approved)",
                    ),
                ),
                (
                    "original_filename",
                    models.CharField(
                        blank=True,
                        default="",
                        max_length=255,
                        verbose_name="Povodny nazov suboru",
                    ),
                ),
                (
                    "content_type",
                    models.CharField(
                        blank=True,
                        default="",
                        max_length=100,
                        verbose_name="Content-Type",
                    ),
                ),
                (
                    "size_bytes",
                    models.BigIntegerField(blank=True, null=True, verbose_name="Velkost (bytes)"),
                ),
                ("width", models.IntegerField(blank=True, null=True, verbose_name="Sirka")),
                ("height", models.IntegerField(blank=True, null=True, verbose_name="Vyska")),
                (
                    "rejected_reason",
                    models.CharField(
                        blank=True,
                        default="",
                        max_length=255,
                        verbose_name="Dovod zamietnutia",
                    ),
                ),
                (
                    "processed_at",
                    models.DateTimeField(blank=True, null=True, verbose_name="Spracovane o"),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Vytvorene")),
                (
                    "item",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="images",
                        to="portfolio.portfolioitem",
                        verbose_name="Polozka portfolia",
                    ),
                ),
            ],
            options={
                "verbose_name": "Obrazok portfolia",
                "verbose_name_plural": "Obrazky portfolia",
                "ordering": ["order", "id"],
                "indexes": [
                    models.Index(
                        fields=["item", "status", "order", "id"],
                        name="port_img_item_status_idx",
                    )
                ],
            },
        ),
        migrations.AddField(
            model_name="portfolioitem",
            name="cover_image",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to="portfolio.portfolioimage",
                verbose_name="Titulna fotka",
            ),
        ),
    ]
