"""Normalize zero watch bounds without deleting watches or notification history."""

from django.db import migrations, models


def normalize_zero_watch_prices(apps, schema_editor):
    """Preflight normalized uniqueness before updating any historical watch rows."""
    OfferWatch = apps.get_model("accounts", "OfferWatch")
    watches = OfferWatch.objects.using(schema_editor.connection.alias)
    price_field = models.DecimalField(max_digits=10, decimal_places=2)
    empty_min = models.Q(price_min__isnull=True) | models.Q(price_min=0)
    empty_max = models.Q(price_max__isnull=True) | models.Q(price_max=0)
    normalized_min = models.Case(
        models.When(price_min=0, then=models.Value(None)),
        default=models.F("price_min"), output_field=price_field,
    )
    normalized_max = models.Case(
        models.When(price_max=0, then=models.Value(None)),
        default=models.F("price_max"), output_field=price_field,
    )
    normalized_currency = models.Case(
        models.When(empty_min & empty_max, then=models.Value("")),
        default=models.F("price_currency"), output_field=models.CharField(max_length=8),
    )
    collisions = (
        watches.order_by()
        .annotate(
            normalized_min=normalized_min,
            normalized_max=normalized_max,
            normalized_currency=normalized_currency,
        )
        .values(
            "user_id", "category", "subcategory", "is_seeking",
            "country_code", "district_code", "normalized_min", "normalized_max",
            "normalized_currency",
        )
        .annotate(row_count=models.Count("pk"), first_id=models.Min("pk"))
        .filter(row_count__gt=1)
    )
    collision_ids = list(collisions.values_list("first_id", flat=True)[:10])
    if collision_ids:
        raise RuntimeError(
            "Zero-price normalization would create duplicate OfferWatch filters. "
            f"Conflicting groups include watch IDs {collision_ids}. "
            "Resolve these groups explicitly before rerunning; no watches were changed."
        )

    # Update currency and both bounds in one statement; bypass signals and auto_now.
    watches.filter(models.Q(price_min=0) | models.Q(price_max=0)).update(
        price_min=normalized_min,
        price_max=normalized_max,
        price_currency=normalized_currency,
    )


class Migration(migrations.Migration):
    """Apply normalization atomically, then enforce positive-or-null watch bounds."""

    dependencies = [("accounts", "0122_alter_user_avatar_upload_to")]

    operations = [
        # Null bounds cannot be distinguished from former zeros on reversal.
        migrations.RunPython(normalize_zero_watch_prices, migrations.RunPython.noop),
        migrations.RemoveConstraint(model_name="offerwatch", name="acc_watch_price_min_nonneg"),
        migrations.RemoveConstraint(model_name="offerwatch", name="acc_watch_price_max_nonneg"),
        migrations.AddConstraint(
            model_name="offerwatch",
            constraint=models.CheckConstraint(
                check=models.Q(price_min__isnull=True) | models.Q(price_min__gt=0),
                name="acc_watch_price_min_positive",
            ),
        ),
        migrations.AddConstraint(
            model_name="offerwatch",
            constraint=models.CheckConstraint(
                check=models.Q(price_max__isnull=True) | models.Q(price_max__gt=0),
                name="acc_watch_price_max_positive",
            ),
        ),
    ]
