from django.db import migrations


def _columns(schema_editor, table: str) -> set[str]:
    with schema_editor.connection.cursor() as cursor:
        desc = schema_editor.connection.introspection.get_table_description(cursor, table)
    return {c.name for c in desc}


def forwards(apps, schema_editor):
    Conversation = apps.get_model("messaging", "Conversation")
    ConversationParticipant = apps.get_model("messaging", "ConversationParticipant")
    Message = apps.get_model("messaging", "Message")

    conv_table = Conversation._meta.db_table
    msg_table = Message._meta.db_table
    part_table = ConversationParticipant._meta.db_table

    existing_tables = set(schema_editor.connection.introspection.table_names())
    if conv_table not in existing_tables or msg_table not in existing_tables:
        return

    conv_cols = _columns(schema_editor, conv_table)
    msg_cols = _columns(schema_editor, msg_table)

    # Legacy schema detection (tables existed before this MVP messaging)
    legacy = ("title" in conv_cols) or ("content" in msg_cols) or ("message_type" in msg_cols)
    if not legacy:
        return

    conv_count = Conversation.objects.count()
    part_count = ConversationParticipant.objects.count() if part_table in existing_tables else 0
    msg_count = Message.objects.count()

    # Safety: do not drop if there's any data to preserve.
    if conv_count or part_count or msg_count:
        raise RuntimeError(
            "Legacy messaging tables detected with existing data; refusing to reset tables automatically."
        )

    # Drop legacy tables and recreate with current models.
    # Order matters because of FKs.
    if part_table in existing_tables:
        schema_editor.delete_model(ConversationParticipant)
    schema_editor.delete_model(Message)
    schema_editor.delete_model(Conversation)

    schema_editor.create_model(Conversation)
    schema_editor.create_model(ConversationParticipant)
    schema_editor.create_model(Message)


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0002_repair_conversationparticipant_table"),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]

