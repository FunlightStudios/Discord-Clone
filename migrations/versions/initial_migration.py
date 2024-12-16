"""initial migration

Revision ID: 001
Revises: 
Create Date: 2024-01-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create user table
    op.create_table('user',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=80), nullable=False),
        sa.Column('email', sa.String(length=120), nullable=False),
        sa.Column('password_hash', sa.String(length=128), nullable=True),
        sa.Column('avatar', sa.String(length=120), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username')
    )

    # Create server table
    op.create_table('server',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=1024), nullable=True),
        sa.Column('icon', sa.String(length=255), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('template', sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create category table
    op.create_table('category',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('server_id', sa.Integer(), nullable=False),
        sa.Column('position', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['server_id'], ['server.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create channel table
    op.create_table('channel',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('topic', sa.String(length=1024), nullable=True),
        sa.Column('position', sa.Integer(), nullable=True),
        sa.Column('private', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('server_id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['category.id'], ),
        sa.ForeignKeyConstraint(['server_id'], ['server.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create message table
    op.create_table('message',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('channel_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('edited_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['channel_id'], ['channel.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create server_member table
    op.create_table('server_member',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('server_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('joined_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['server_id'], ['server.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create role table
    op.create_table('role',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=80), nullable=False),
        sa.Column('server_id', sa.Integer(), nullable=False),
        sa.Column('permissions', sa.Integer(), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.ForeignKeyConstraint(['server_id'], ['server.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create friend_associations table
    op.create_table('friend_associations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user1_id', sa.Integer(), nullable=False),
        sa.Column('user2_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user1_id'], ['user.id'], ),
        sa.ForeignKeyConstraint(['user2_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create member_roles table
    op.create_table('member_roles',
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['member_id'], ['server_member.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['role.id'], ),
        sa.PrimaryKeyConstraint('member_id', 'role_id')
    )


def downgrade():
    op.drop_table('member_roles')
    op.drop_table('friend_associations')
    op.drop_table('role')
    op.drop_table('server_member')
    op.drop_table('message')
    op.drop_table('channel')
    op.drop_table('category')
    op.drop_table('server')
    op.drop_table('user')
