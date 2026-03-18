"""add_goal_id_to_workouts

Revision ID: 67bf07430eac
Revises: 8e506b62392c
Create Date: 2025-10-15 10:52:26.620298

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '67bf07430eac'
down_revision: Union[str, None] = '8e506b62392c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add goal_id column to workouts table
    op.add_column('workouts', sa.Column('goal_id', sa.Integer(), nullable=True))
    
    # Create foreign key constraint
    op.create_foreign_key('fk_workouts_goal_id', 'workouts', 'goals', ['goal_id'], ['id'], ondelete='CASCADE')
    
    # Create index for better performance
    op.create_index('ix_workouts_goal_id', 'workouts', ['goal_id'])


def downgrade() -> None:
    # Drop index
    op.drop_index('ix_workouts_goal_id', table_name='workouts')
    
    # Drop foreign key constraint
    op.drop_constraint('fk_workouts_goal_id', 'workouts', type_='foreignkey')
    
    # Drop goal_id column
    op.drop_column('workouts', 'goal_id')
