"""initial_schema

Revision ID: 15da37aa5611
Revises:
Create Date: 2026-03-25 18:11:24.155740

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '15da37aa5611'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=True),
        sa.Column('display_name', sa.String(), nullable=False),
        sa.Column('google_sub', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('google_sub'),
    )

    op.create_table(
        'videos',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('content_type', sa.String(), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('gcs_path', sa.String(), nullable=False),
        sa.Column('player_name', sa.String(), nullable=True),
        sa.Column('focus_areas', sa.String(), nullable=True),
        sa.Column('problems', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'insights',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('video_id', sa.String(), sa.ForeignKey('videos.id'), nullable=False),
        sa.Column('timestamp_start', sa.Float(), nullable=False),
        sa.Column('timestamp_end', sa.Float(), nullable=False),
        sa.Column('stroke_type', sa.String(), nullable=False),
        sa.Column('issue_severity', sa.String(), nullable=False),
        sa.Column('analysis_text', sa.Text(), nullable=False),
        sa.Column('correction_text', sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('insights')
    op.drop_table('videos')
    op.drop_table('users')
