"""add_trainer_chat_tables

Revision ID: ee12f4a901b2
Revises: d9e8f1c2a441
Create Date: 2026-03-28 14:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "ee12f4a901b2"
down_revision: Union[str, None] = "d9e8f1c2a441"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trainer_chat_conversations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("preview", sa.String(length=600), nullable=False),
        sa.Column("pinned", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_trainer_chat_conversations_id"), "trainer_chat_conversations", ["id"], unique=False)
    op.create_index(op.f("ix_trainer_chat_conversations_owner_id"), "trainer_chat_conversations", ["owner_id"], unique=False)
    op.create_index(op.f("ix_trainer_chat_conversations_updated_at"), "trainer_chat_conversations", ["updated_at"], unique=False)

    op.create_table(
        "trainer_chat_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("image_data", sa.Text(), nullable=True),
        sa.Column("liked", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["trainer_chat_conversations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_trainer_chat_messages_conversation_id"), "trainer_chat_messages", ["conversation_id"], unique=False)
    op.create_index(op.f("ix_trainer_chat_messages_created_at"), "trainer_chat_messages", ["created_at"], unique=False)
    op.create_index(op.f("ix_trainer_chat_messages_id"), "trainer_chat_messages", ["id"], unique=False)
    op.create_index(op.f("ix_trainer_chat_messages_role"), "trainer_chat_messages", ["role"], unique=False)

    op.create_table(
        "trainer_chat_message_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("user_message_id", sa.Integer(), nullable=False),
        sa.Column("assistant_message_id", sa.Integer(), nullable=True),
        sa.Column("task_id", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("error_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["assistant_message_id"], ["trainer_chat_messages.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["conversation_id"], ["trainer_chat_conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_message_id"], ["trainer_chat_messages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id"),
    )
    op.create_index(op.f("ix_trainer_chat_message_requests_assistant_message_id"), "trainer_chat_message_requests", ["assistant_message_id"], unique=False)
    op.create_index(op.f("ix_trainer_chat_message_requests_conversation_id"), "trainer_chat_message_requests", ["conversation_id"], unique=False)
    op.create_index(op.f("ix_trainer_chat_message_requests_id"), "trainer_chat_message_requests", ["id"], unique=False)
    op.create_index(op.f("ix_trainer_chat_message_requests_status"), "trainer_chat_message_requests", ["status"], unique=False)
    op.create_index(op.f("ix_trainer_chat_message_requests_task_id"), "trainer_chat_message_requests", ["task_id"], unique=False)
    op.create_index(op.f("ix_trainer_chat_message_requests_user_message_id"), "trainer_chat_message_requests", ["user_message_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_trainer_chat_message_requests_user_message_id"), table_name="trainer_chat_message_requests")
    op.drop_index(op.f("ix_trainer_chat_message_requests_task_id"), table_name="trainer_chat_message_requests")
    op.drop_index(op.f("ix_trainer_chat_message_requests_status"), table_name="trainer_chat_message_requests")
    op.drop_index(op.f("ix_trainer_chat_message_requests_id"), table_name="trainer_chat_message_requests")
    op.drop_index(op.f("ix_trainer_chat_message_requests_conversation_id"), table_name="trainer_chat_message_requests")
    op.drop_index(op.f("ix_trainer_chat_message_requests_assistant_message_id"), table_name="trainer_chat_message_requests")
    op.drop_table("trainer_chat_message_requests")

    op.drop_index(op.f("ix_trainer_chat_messages_role"), table_name="trainer_chat_messages")
    op.drop_index(op.f("ix_trainer_chat_messages_id"), table_name="trainer_chat_messages")
    op.drop_index(op.f("ix_trainer_chat_messages_created_at"), table_name="trainer_chat_messages")
    op.drop_index(op.f("ix_trainer_chat_messages_conversation_id"), table_name="trainer_chat_messages")
    op.drop_table("trainer_chat_messages")

    op.drop_index(op.f("ix_trainer_chat_conversations_updated_at"), table_name="trainer_chat_conversations")
    op.drop_index(op.f("ix_trainer_chat_conversations_owner_id"), table_name="trainer_chat_conversations")
    op.drop_index(op.f("ix_trainer_chat_conversations_id"), table_name="trainer_chat_conversations")
    op.drop_table("trainer_chat_conversations")
