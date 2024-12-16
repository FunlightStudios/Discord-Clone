"""add category_id to channel

Revision ID: add_category_id
Revises: 001
Create Date: 2024-01-16 01:26:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_category_id'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Add category_id column to channel table
    with op.batch_alter_table('channel', schema=None) as batch_op:
        batch_op.add_column(sa.Column('category_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_channel_category_id', 'category', ['category_id'], ['id'])


def downgrade():
    # Remove category_id column from channel table
    with op.batch_alter_table('channel', schema=None) as batch_op:
        batch_op.drop_constraint('fk_channel_category_id', type_='foreignkey')
        batch_op.drop_column('category_id')
