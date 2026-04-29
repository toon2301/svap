import uuid
from pathlib import Path

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import swaply.validators


def conversation_avatar_upload_to(instance, filename):
    suffix = Path(filename or "").suffix.lower()
    safe_suffix = suffix if suffix else ".jpg"
    conversation_id = instance.pk or "pending"
    return f"conversation-avatars/{conversation_id}/{uuid.uuid4().hex}{safe_suffix}"


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0007_conversationparticipant_pinned_at"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="conversation",
            name="avatar",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to=conversation_avatar_upload_to,
                validators=[swaply.validators.validate_image_file],
            ),
        ),
        migrations.AddField(
            model_name="conversation",
            name="is_group",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="conversation",
            name="name",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="conversationparticipant",
            name="left_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="conversationparticipant",
            name="role",
            field=models.CharField(
                choices=[("owner", "Owner"), ("member", "Member")],
                default="member",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="conversationparticipant",
            name="status",
            field=models.CharField(
                choices=[
                    ("invited", "Invited"),
                    ("active", "Active"),
                    ("left", "Left"),
                    ("removed", "Removed"),
                ],
                default="active",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="message",
            name="message_type",
            field=models.CharField(
                choices=[
                    ("user", "User"),
                    ("system", "System"),
                    ("group_invitation", "Group invitation"),
                ],
                default="user",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="message",
            name="metadata",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.CreateModel(
            name="GroupInvitation",
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
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("accepted", "Accepted"),
                            ("declined", "Declined"),
                            ("cancelled", "Cancelled"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("responded_at", models.DateTimeField(blank=True, null=True)),
                (
                    "conversation",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="group_invitations",
                        to="messaging.conversation",
                    ),
                ),
                (
                    "invited_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="sent_group_invitations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "invited_user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="received_group_invitations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "message",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="group_invitation",
                        to="messaging.message",
                    ),
                ),
            ],
        ),
        migrations.AddIndex(
            model_name="conversationparticipant",
            index=models.Index(
                fields=["conversation", "status"],
                name="conv_part_conv_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="conversationparticipant",
            index=models.Index(
                fields=["user", "status"],
                name="conv_part_user_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="groupinvitation",
            index=models.Index(
                fields=["invited_user", "status", "created_at"],
                name="grp_inv_user_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="groupinvitation",
            index=models.Index(
                fields=["conversation", "status"],
                name="grp_inv_conv_status_idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="groupinvitation",
            constraint=models.UniqueConstraint(
                condition=models.Q(status="pending"),
                fields=("conversation", "invited_user"),
                name="uniq_pending_group_invitation_user",
            ),
        ),
    ]
