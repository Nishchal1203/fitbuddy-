"""add_exercises_to_workouts

Revision ID: 4c2f6d9a1b11
Revises: e5610fbce374
Create Date: 2026-03-15 23:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c2f6d9a1b11'
down_revision: Union[str, None] = 'e5610fbce374'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('workouts', sa.Column('exercises', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('workouts', 'exercises')
