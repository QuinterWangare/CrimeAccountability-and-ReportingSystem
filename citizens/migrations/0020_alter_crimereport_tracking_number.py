# Generated by Django 5.1.7 on 2025-03-22 12:24

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("citizens", "0019_alter_crimereport_tracking_number"),
    ]

    operations = [
        migrations.AlterField(
            model_name="crimereport",
            name="tracking_number",
            field=models.CharField(
                default="c26b775585", editable=False, max_length=20, unique=True
            ),
        ),
    ]
