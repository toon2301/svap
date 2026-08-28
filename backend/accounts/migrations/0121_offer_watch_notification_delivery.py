from django.db import migrations, models


def mark_existing_candidates_processed(apps, schema_editor):
    candidate_model = apps.get_model("accounts", "OfferWatchNotification")
    candidate_model.objects.filter(processed_at__isnull=True).update(
        processed_at=models.F("matched_at")
    )


def restore_existing_candidates_pending(apps, schema_editor):
    candidate_model = apps.get_model("accounts", "OfferWatchNotification")
    candidate_model.objects.update(processed_at=None)


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0120_offer_watch_match_outbox"),
    ]

    operations = [
        migrations.AddField(
            model_name="offerwatchnotification",
            name="processed_at",
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name="Doručenie spracované",
            ),
        ),
        migrations.RunPython(
            mark_existing_candidates_processed,
            restore_existing_candidates_pending,
        ),
        migrations.AddConstraint(
            model_name="offerwatchnotification",
            constraint=models.CheckConstraint(
                check=(
                    models.Q(notified_at__isnull=True)
                    | models.Q(processed_at__isnull=False)
                ),
                name="acc_watch_notif_sent_processed",
            ),
        ),
        migrations.RemoveIndex(
            model_name="offerwatchnotification",
            name="acc_watch_notif_pending_idx",
        ),
        migrations.AddIndex(
            model_name="offerwatchnotification",
            index=models.Index(
                fields=["processed_at", "matched_at"],
                name="acc_watch_notif_process_idx",
            ),
        ),
        migrations.AlterField(
            model_name="notification",
            name="type",
            field=models.CharField(
                choices=[
                    ("offer_watch_match", "Nová zhoda sledovania"),
                    ("offer_liked", "Páči sa mi ponuka"),
                    ("portfolio_liked", "Paci sa mi portfolio"),
                    ("profile_liked", "Paci sa mi profil"),
                    ("skill_request", "Nová žiadosť"),
                    ("skill_request_accepted", "Žiadosť prijatá"),
                    (
                        "skill_request_completion_requested",
                        "Výmena označená ako dokončená",
                    ),
                    ("skill_request_completed", "Dokončenie výmeny potvrdené"),
                    ("review_created", "Nová recenzia"),
                    ("review_reply_created", "Odpoveď na recenziu"),
                    ("review_liked", "Páči sa mi recenzia"),
                    ("skill_request_rejected", "Žiadosť zamietnutá"),
                    ("skill_request_cancelled", "Žiadosť zrušená"),
                    ("skill_request_terminated", "Výmena skončila"),
                    ("group_invitation", "Pozvánka do skupiny"),
                    ("feed_post_liked", "Páči sa mi príspevok"),
                    ("feed_post_commented", "Komentár k príspevku"),
                    ("feed_post_tagged", "Označenie v príspevku"),
                    ("feed_post_shared", "Zdieľanie príspevku"),
                    ("feed_post_comment_liked", "Páči sa mi komentár"),
                    ("feed_post_comment_replied", "Odpoveď na komentár"),
                ],
                max_length=50,
                verbose_name="Typ",
            ),
        ),
    ]
