# Generated by Django 5.1.7 on 2025-03-31 16:02

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("citizens", "0038_alter_crimereport_tracking_number"),
    ]

    operations = [
        migrations.AlterField(
            model_name="crimereport",
            name="tracking_number",
            field=models.CharField(
                default="68c430fe23", editable=False, max_length=20, unique=True
            ),
        ),
        migrations.AlterField(
            model_name="policeuser",
            name="phone_number",
            field=models.CharField(blank=True, max_length=16, null=True),
        ),
    ]
