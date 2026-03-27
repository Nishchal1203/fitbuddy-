"""add_workout_plan_follows_table

Revision ID: d9e8f1c2a441
Revises: c4a8b7d9e211
Create Date: 2026-03-27 14:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d9e8f1c2a441"
down_revision: Union[str, None] = "c4a8b7d9e211"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workout_plan_follows",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("workout_id", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workout_id"], ["workouts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "workout_id", name="uq_workout_plan_follows_user_workout"),
    )
    op.create_index(op.f("ix_workout_plan_follows_id"), "workout_plan_follows", ["id"], unique=False)
    op.create_index(op.f("ix_workout_plan_follows_user_id"), "workout_plan_follows", ["user_id"], unique=False)
    op.create_index(op.f("ix_workout_plan_follows_workout_id"), "workout_plan_follows", ["workout_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_workout_plan_follows_workout_id"), table_name="workout_plan_follows")
    op.drop_index(op.f("ix_workout_plan_follows_user_id"), table_name="workout_plan_follows")
    op.drop_index(op.f("ix_workout_plan_follows_id"), table_name="workout_plan_follows")
    op.drop_table("workout_plan_follows")
