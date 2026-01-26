
import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from user_app.models import User
from room_app.models import Evaluation

def run():
    print(f"Total Users: {User.objects.count()}")
    print(f"Total Evaluations: {Evaluation.objects.count()}")
    for u in User.objects.all():
        eval_count = Evaluation.objects.filter(target=u).count()
        print(f"User: {u.nickname}, Score: {u.score}, Eval Count: {eval_count}")

if __name__ == "__main__":
    run()
