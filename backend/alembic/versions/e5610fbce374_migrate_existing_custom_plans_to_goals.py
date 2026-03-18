"""migrate_existing_custom_plans_to_goals

Revision ID: e5610fbce374
Revises: 67bf07430eac
Create Date: 2025-10-15 10:54:29.124276

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5610fbce374'
down_revision: Union[str, None] = '67bf07430eac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create a connection to perform data migration
    connection = op.get_bind()
    
    # Migrate existing custom plans to associate them with goals
    # This uses a heuristic: find the most recent goal for each user
    # Since goals table doesn't have created_at, we use id as a proxy for creation order
    connection.execute(sa.text("""
        UPDATE workouts 
        SET goal_id = (
            SELECT g.id 
            FROM goals g 
            WHERE g.owner_id = workouts.owner_id 
            AND g.is_completed = false
            ORDER BY g.id DESC 
            LIMIT 1
        )
        WHERE workouts.owner_id IS NOT NULL 
        AND workouts.goal_id IS NULL
    """))
    
    # Log the migration results
    result = connection.execute(sa.text("""
        SELECT COUNT(*) as migrated_count 
        FROM workouts 
        WHERE owner_id IS NOT NULL AND goal_id IS NOT NULL
    """)).fetchone()
    
    print(f"Data migration completed: {result[0]} custom plans associated with goals")


def downgrade() -> None:
    # Remove goal_id associations for custom plans
    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE workouts 
        SET goal_id = NULL 
        WHERE owner_id IS NOT NULL AND goal_id IS NOT NULL
    """))
