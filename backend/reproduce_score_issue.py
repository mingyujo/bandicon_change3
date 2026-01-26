import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from user_app.models import User
from room_app.models import Room, Session, Evaluation
from django.db.models import Avg

def run():
    print("--- Starting Reproduction Script ---")
    
    # 1. Create Test Users
    evaluator_name = "test_evaluator"
    target_name = "test_target"
    
    evaluator, _ = User.objects.get_or_create(nickname=evaluator_name, username=evaluator_name, email=f"{evaluator_name}@example.com")
    target, _ = User.objects.get_or_create(nickname=target_name, username=target_name, email=f"{target_name}@example.com")
    
    # Reset Target Score
    target.score = 100
    target.save()
    Evaluation.objects.filter(target=target).delete()
    print(f"Reset {target_name} score to: {target.score}")

    # 2. Creating Dummy Room
    room, _ = Room.objects.get_or_create(title="Test Room", manager_nickname=evaluator_name, song="Song", artist="Artist")
    room.ended = True # Must be ended to evaluate
    room.save()

    # 3. Simulate Evaluation Logic (mimicking MannerEvaluationAPIView)
    score_value = 10
    print(f"Giving score {score_value} to {target_name}...")
    
    # Create Evaluation
    Evaluation.objects.create(
        room=room,
        evaluator=evaluator,
        target=target,
        score=score_value
    )
    
    # Calculate Average
    print("Calculating average manually in script...")
    result = Evaluation.objects.filter(target=target).aggregate(Avg('score'))
    avg_score = result['score__avg']
    print(f"Avg Score from DB: {avg_score}")
    
    if avg_score is not None:
        new_score = int(round(avg_score))
        target.score = new_score
        target.save(update_fields=['score'])
        print(f"Updated {target_name} score to: {target.score}")
    
    # 4. Verify
    refreshed_target = User.objects.get(id=target.id)
    print(f"Final Score in DB: {refreshed_target.score}")
    
    if refreshed_target.score == 10:
        print("SUCCESS: Score updated correctly.")
    else:
        print("FAILURE: Score did not update correctly.")

if __name__ == "__main__":
    run()
