"""add_nutrition_tracking_tables

Revision ID: b1f54f6a12a3
Revises: 4c2f6d9a1b11
Create Date: 2026-03-27 11:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b1f54f6a12a3"
down_revision: Union[str, None] = "4c2f6d9a1b11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "food_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=True),
        sa.Column("food_type", sa.String(length=20), nullable=True),
        sa.Column("emoji", sa.String(length=12), nullable=True),
        sa.Column("kcal_per_100g", sa.Float(), nullable=False),
        sa.Column("protein_per_100g", sa.Float(), nullable=False),
        sa.Column("carbs_per_100g", sa.Float(), nullable=False),
        sa.Column("fat_per_100g", sa.Float(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_food_items_id"), "food_items", ["id"], unique=False)
    op.create_index(op.f("ix_food_items_name"), "food_items", ["name"], unique=False)
    op.create_index(op.f("ix_food_items_category"), "food_items", ["category"], unique=False)
    op.create_index(op.f("ix_food_items_food_type"), "food_items", ["food_type"], unique=False)
    op.create_index(op.f("ix_food_items_owner_id"), "food_items", ["owner_id"], unique=False)

    op.create_table(
        "meal_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("section", sa.String(length=30), nullable=False),
        sa.Column("logged_at", sa.DateTime(), nullable=False),
        sa.Column("food_item_id", sa.Integer(), nullable=True),
        sa.Column("food_name", sa.String(length=255), nullable=False),
        sa.Column("grams", sa.Float(), nullable=False),
        sa.Column("kcal", sa.Float(), nullable=False),
        sa.Column("protein_g", sa.Float(), nullable=False),
        sa.Column("carbs_g", sa.Float(), nullable=False),
        sa.Column("fat_g", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["food_item_id"], ["food_items.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_meal_logs_id"), "meal_logs", ["id"], unique=False)
    op.create_index(op.f("ix_meal_logs_date"), "meal_logs", ["date"], unique=False)
    op.create_index(op.f("ix_meal_logs_section"), "meal_logs", ["section"], unique=False)
    op.create_index(op.f("ix_meal_logs_logged_at"), "meal_logs", ["logged_at"], unique=False)
    op.create_index(op.f("ix_meal_logs_food_item_id"), "meal_logs", ["food_item_id"], unique=False)
    op.create_index(op.f("ix_meal_logs_owner_id"), "meal_logs", ["owner_id"], unique=False)

    op.create_table(
        "hydration_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("amount_ml", sa.Integer(), nullable=False),
        sa.Column("logged_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_hydration_logs_id"), "hydration_logs", ["id"], unique=False)
    op.create_index(op.f("ix_hydration_logs_date"), "hydration_logs", ["date"], unique=False)
    op.create_index(op.f("ix_hydration_logs_logged_at"), "hydration_logs", ["logged_at"], unique=False)
    op.create_index(op.f("ix_hydration_logs_owner_id"), "hydration_logs", ["owner_id"], unique=False)

    op.create_table(
        "nutrition_goals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("daily_calories", sa.Integer(), nullable=False),
        sa.Column("protein_g", sa.Float(), nullable=False),
        sa.Column("carbs_g", sa.Float(), nullable=False),
        sa.Column("fat_g", sa.Float(), nullable=False),
        sa.Column("hydration_ml", sa.Integer(), nullable=False),
        sa.Column("diet_type", sa.String(length=100), nullable=True),
        sa.Column("restrictions", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("owner_id"),
    )
    op.create_index(op.f("ix_nutrition_goals_id"), "nutrition_goals", ["id"], unique=False)
    op.create_index(op.f("ix_nutrition_goals_owner_id"), "nutrition_goals", ["owner_id"], unique=False)

    op.create_table(
        "ai_coach_insights",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("verdict", sa.String(length=255), nullable=False),
        sa.Column("actions", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_coach_insights_id"), "ai_coach_insights", ["id"], unique=False)
    op.create_index(op.f("ix_ai_coach_insights_date"), "ai_coach_insights", ["date"], unique=False)
    op.create_index(op.f("ix_ai_coach_insights_owner_id"), "ai_coach_insights", ["owner_id"], unique=False)

    op.create_table(
        "ai_diet_plans",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("suggestions", sa.JSON(), nullable=False),
        sa.Column("action_data", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_diet_plans_id"), "ai_diet_plans", ["id"], unique=False)
    op.create_index(op.f("ix_ai_diet_plans_owner_id"), "ai_diet_plans", ["owner_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_ai_diet_plans_owner_id"), table_name="ai_diet_plans")
    op.drop_index(op.f("ix_ai_diet_plans_id"), table_name="ai_diet_plans")
    op.drop_table("ai_diet_plans")

    op.drop_index(op.f("ix_ai_coach_insights_owner_id"), table_name="ai_coach_insights")
    op.drop_index(op.f("ix_ai_coach_insights_date"), table_name="ai_coach_insights")
    op.drop_index(op.f("ix_ai_coach_insights_id"), table_name="ai_coach_insights")
    op.drop_table("ai_coach_insights")

    op.drop_index(op.f("ix_nutrition_goals_owner_id"), table_name="nutrition_goals")
    op.drop_index(op.f("ix_nutrition_goals_id"), table_name="nutrition_goals")
    op.drop_table("nutrition_goals")

    op.drop_index(op.f("ix_hydration_logs_owner_id"), table_name="hydration_logs")
    op.drop_index(op.f("ix_hydration_logs_logged_at"), table_name="hydration_logs")
    op.drop_index(op.f("ix_hydration_logs_date"), table_name="hydration_logs")
    op.drop_index(op.f("ix_hydration_logs_id"), table_name="hydration_logs")
    op.drop_table("hydration_logs")

    op.drop_index(op.f("ix_meal_logs_owner_id"), table_name="meal_logs")
    op.drop_index(op.f("ix_meal_logs_food_item_id"), table_name="meal_logs")
    op.drop_index(op.f("ix_meal_logs_logged_at"), table_name="meal_logs")
    op.drop_index(op.f("ix_meal_logs_section"), table_name="meal_logs")
    op.drop_index(op.f("ix_meal_logs_date"), table_name="meal_logs")
    op.drop_index(op.f("ix_meal_logs_id"), table_name="meal_logs")
    op.drop_table("meal_logs")

    op.drop_index(op.f("ix_food_items_owner_id"), table_name="food_items")
    op.drop_index(op.f("ix_food_items_food_type"), table_name="food_items")
    op.drop_index(op.f("ix_food_items_category"), table_name="food_items")
    op.drop_index(op.f("ix_food_items_name"), table_name="food_items")
    op.drop_index(op.f("ix_food_items_id"), table_name="food_items")
    op.drop_table("food_items")
