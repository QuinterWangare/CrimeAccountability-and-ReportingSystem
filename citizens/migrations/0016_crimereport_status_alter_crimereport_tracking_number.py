# Generated by Django 5.1.3 on 2025-03-21 14:47

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('citizens', '0015_alter_crimereport_tracking_number'),
    ]

    operations = [
        migrations.AddField(
            model_name='crimereport',
            name='status',
            field=models.CharField(choices=[('Pending', 'Pending'), ('Active', 'Active'), ('Resolved', 'Resolved')], default='Pending', max_length=10),
        ),
        migrations.AlterField(
            model_name='crimereport',
            name='tracking_number',
            field=models.CharField(default='07de536f63', editable=False, max_length=20, unique=True),
        ),
    ]
