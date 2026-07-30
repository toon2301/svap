from django.db import migrations


def ensure_claimed_at_column(apps, schema_editor):
    """Repair databases that applied 0098 before its lease field was added."""

    Outbox = apps.get_model("accounts", "BugReportNotificationOutbox")
    table_name = Outbox._meta.db_table
    with schema_editor.connection.cursor() as cursor:
        table_description = (
            schema_editor.connection.introspection.get_table_description(
                cursor,
                table_name,
            )
        )
    column_names = {column.name for column in table_description}
    field = Outbox._meta.get_field("claimed_at")
    if field.column not in column_names:
        schema_editor.add_field(Outbox, field)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0098_bugreport_notification_outbox"),
    ]

    operations = [
        migrations.RunPython(
            ensure_claimed_at_column,
            migrations.RunPython.noop,
        ),
    ]
