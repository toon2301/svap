"""Signály pre portfolio – best-effort upratanie storage po zmazaní obrázka."""

from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .image_storage import delete_storage_keys, image_storage_keys
from .models import PortfolioImage


@receiver(post_delete, sender=PortfolioImage)
def delete_portfolio_image_files_after_delete(sender, instance, **kwargs):
    """
    Po zmazaní PortfolioImage (vrátane CASCADE pri zmazaní PortfolioItem alebo
    účtu) zmaž jeho súbory zo storage, aby v S3/úložisku nezostávali "orphaned"
    súbory (náklady + GDPR). Spúšťa sa až po commite transakcie.
    """
    keys = image_storage_keys(instance)
    transaction.on_commit(lambda: delete_storage_keys(keys))
