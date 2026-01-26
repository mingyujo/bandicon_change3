from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Creates a test admin user (ID: test, PW: test)'

    def handle(self, *args, **options):
        User = get_user_model()
        username = 'test'
        password = 'test'
        nickname = '관리자 test'
        email = 'test@example.com'

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'User "{username}" already exists.'))
            user = User.objects.get(username=username)
            # Ensure it is a superuser and has correct password/nickname
            user.set_password(password)
            user.nickname = nickname
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Updated user "{username}" to be superuser with password "{password}".'))
        else:
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                nickname=nickname
            )
            self.stdout.write(self.style.SUCCESS(f'Successfully created superuser "{username}" with password "{password}".'))
