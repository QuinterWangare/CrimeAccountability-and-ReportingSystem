# Generated by Django 5.1.3 on 2025-03-21 18:20

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('citizens', '0016_crimereport_status_alter_crimereport_tracking_number'),
    ]

    operations = [
        migrations.AlterField(
            model_name='crimereport',
            name='tracking_number',
            field=models.CharField(default='70da4811d6', editable=False, max_length=20, unique=True),
        ),
    ]
