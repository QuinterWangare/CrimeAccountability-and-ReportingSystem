# Generated by Django 5.1.3 on 2025-03-17 11:47

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('citizens', '0005_rename_full_name_crimereport_contact_name_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Evidence',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to='evidence/')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('crime_report', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='evidences', to='citizens.crimereport')),
            ],
        ),
    ]
