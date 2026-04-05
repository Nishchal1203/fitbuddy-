"""add body_measurements and user_achievements

Revision ID: f8a3c1d2e4b5
Revises: ee12f4a901b2
Create Date: 2026-03-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f8a3c1d2e4b5"
down_revision: Union[str, None] = "ee12f4a901b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "body_measurements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=True),
        sa.Column("body_fat_percentage", sa.Float(), nullable=True),
        sa.Column("chest", sa.Float(), nullable=True),
        sa.Column("waist", sa.Float(), nullable=True),
        sa.Column("arms", sa.Float(), nullable=True),
        sa.Column("legs", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("owner_id", "date", name="uq_body_measurements_owner_date"),
    )
    op.create_index(op.f("ix_body_measurements_id"), "body_measurements", ["id"], unique=False)
    op.create_index(
        op.f("ix_body_measurements_owner_id"), "body_measurements", ["owner_id"], unique=False
    )

    op.create_table(
        "user_achievements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("badge_type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column(
            "unlocked_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_achievements_id"), "user_achievements", ["id"], unique=False)
    op.create_index(
        op.f("ix_user_achievements_badge_type"), "user_achievements", ["badge_type"], unique=False
    )
    op.create_index(
        op.f("ix_user_achievements_user_id"), "user_achievements", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_user_achievements_user_id"), table_name="user_achievements")
    op.drop_index(op.f("ix_user_achievements_badge_type"), table_name="user_achievements")
    op.drop_index(op.f("ix_user_achievements_id"), table_name="user_achievements")
    op.drop_table("user_achievements")
    op.drop_index(op.f("ix_body_measurements_owner_id"), table_name="body_measurements")
    op.drop_index(op.f("ix_body_measurements_id"), table_name="body_measurements")
    op.drop_table("body_measurements")
