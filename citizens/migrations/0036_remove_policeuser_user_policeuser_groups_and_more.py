# Generated by Django 5.1.3 on 2025-03-30 12:14

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('citizens', '0035_alter_crimereport_tracking_number'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='policeuser',
            name='user',
        ),
        migrations.AddField(
            model_name='policeuser',
            name='groups',
            field=models.ManyToManyField(blank=True, help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups'),
        ),
        migrations.AddField(
            model_name='policeuser',
            name='last_login',
            field=models.DateTimeField(blank=True, null=True, verbose_name='last login'),
        ),
        migrations.AddField(
            model_name='policeuser',
            name='password',
            field=models.CharField(blank=True, max_length=128, null=True),
        ),
        migrations.AddField(
            model_name='policeuser',
            name='user_permissions',
            field=models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions'),
        ),
        migrations.AlterField(
            model_name='crimereport',
            name='tracking_number',
            field=models.CharField(default='0c4ed58c72', editable=False, max_length=20, unique=True),
        ),
    ]
