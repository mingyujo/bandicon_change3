from django.core.management.base import BaseCommand
from django.db.models import Avg
from user_app.models import User
from room_app.models import Evaluation

class Command(BaseCommand):
    help = 'Recalculate manner scores for all users based on evaluations'

    def handle(self, *args, **kwargs):
        users = User.objects.all()
        count = 0
        for user in users:
            # Get average score from evaluations
            result = Evaluation.objects.filter(target=user).aggregate(Avg('score'))
            avg_score = result['score__avg']

            if avg_score is not None:
                new_score = int(round(avg_score))
                if user.score != new_score:
                    old_score = user.score
                    user.score = new_score
                    user.save(update_fields=['score'])
                    self.stdout.write(self.style.SUCCESS(f'Updated {user.nickname}: {old_score} -> {new_score}'))
                    count += 1
            else:
                # OPTIONAL: Reset to default if no evaluations?
                # For now, let's leave it as is, or reset to 100?
                # If they have NO evaluations, maybe they should be 100.
                if user.score != 100:
                    # Check if they really have no evaluations (double check)
                    # The aggregate returns None if empty.
                    user.score = 100
                    user.save(update_fields=['score'])
                    self.stdout.write(self.style.WARNING(f'Reset {user.nickname} to default 100'))
                    count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Successfully recalculated scores for {count} users'))
