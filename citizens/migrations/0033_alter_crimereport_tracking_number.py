# Generated by Django 5.1.3 on 2025-03-30 11:27

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('citizens', '0032_alter_policeuser_managers_policeuser_user_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='crimereport',
            name='tracking_number',
            field=models.CharField(default='8bf1fdee07', editable=False, max_length=20, unique=True),
        ),
    ]
