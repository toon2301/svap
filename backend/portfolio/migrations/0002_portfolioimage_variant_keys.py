from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("portfolio", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="portfolioimage",
            name="thumbnail_key",
            field=models.CharField(
                blank=True,
                default="",
                max_length=1024,
                verbose_name="S3 kluc (thumbnail)",
            ),
        ),
        migrations.AddField(
            model_name="portfolioimage",
            name="medium_key",
            field=models.CharField(
                blank=True,
                default="",
                max_length=1024,
                verbose_name="S3 kluc (medium)",
            ),
        ),
        migrations.AddField(
            model_name="portfolioimage",
            name="large_key",
            field=models.CharField(
                blank=True,
                default="",
                max_length=1024,
                verbose_name="S3 kluc (large)",
            ),
        ),
    ]
