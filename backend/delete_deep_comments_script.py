from board_app.models import Comment

# Find comments that have a grandparent (depth >= 2)
# depth 0: no parent
# depth 1: parent is root
# depth 2: parent has parent
deep_comments = Comment.objects.filter(parent__parent__isnull=False)

count = deep_comments.count()
print(f"Found {count} deep nested comments.")

for c in deep_comments:
    print(f"Deleting comment ID {c.id}: '{c.content}' (Parent ID: {c.parent_id})")
    c.delete()

print("Deletion complete.")
