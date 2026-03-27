"""drop_legacy_saved_plans_table

Revision ID: c4a8b7d9e211
Revises: b1f54f6a12a3
Create Date: 2026-03-27 12:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4a8b7d9e211"
down_revision: Union[str, None] = "b1f54f6a12a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS saved_plans CASCADE")


def downgrade() -> None:
    op.create_table(
        "saved_plans",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("workout_id", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workout_id"], ["workouts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_saved_plans_id"), "saved_plans", ["id"], unique=False)
    op.create_index(op.f("ix_saved_plans_user_id"), "saved_plans", ["user_id"], unique=False)
    op.create_index(op.f("ix_saved_plans_workout_id"), "saved_plans", ["workout_id"], unique=False)
