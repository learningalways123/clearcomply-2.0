"""add_projects_table

Revision ID: 42fd61213759
Revises: 3bed3d66fa53
Create Date: 2026-07-04 22:55:02.590681

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '42fd61213759'
down_revision: Union[str, Sequence[str], None] = '3bed3d66fa53'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # Create projects table conditionally
    if 'projects' not in tables:
        op.create_table('projects',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('created_by_email', sa.String(), nullable=True),
            sa.ForeignKeyConstraint(['created_by_email'], ['users.email'], ),
            sa.PrimaryKeyConstraint('id')
        )

    # Add project_id column and foreign key conditionally
    columns = [c['name'] for c in inspector.get_columns('assessments')]
    if 'project_id' not in columns:
        with op.batch_alter_table('assessments') as batch_op:
            batch_op.add_column(sa.Column('project_id', sa.String(), nullable=True))
            batch_op.create_foreign_key(
                'fk_assessments_project_id',
                'projects',
                ['project_id'], ['id'],
                ondelete='CASCADE'
            )

    # Data migration: associate existing assessments with a Default Project
    assessments = bind.execute(sa.text("SELECT id FROM assessments WHERE project_id IS NULL")).fetchall()
    if assessments:
        import uuid
        from datetime import datetime
        
        # Check if there is already a default project to reuse
        default_proj = bind.execute(sa.text("SELECT id FROM projects WHERE name = 'Default Project'")).fetchone()
        if default_proj:
            default_project_id = default_proj[0]
        else:
            default_project_id = str(uuid.uuid4())
            # Insert a Default Project
            bind.execute(
                sa.text("INSERT INTO projects (id, name, created_at, created_by_email) VALUES (:id, :name, :created_at, :email)"),
                {"id": default_project_id, "name": "Default Project", "created_at": datetime.utcnow(), "email": None}
            )
            
        # Update assessments to point to default_project_id
        for ass in assessments:
            bind.execute(
                sa.text("UPDATE assessments SET project_id = :project_id WHERE id = :id"),
                {"project_id": default_project_id, "id": ass[0]}
            )


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    
    columns = [c['name'] for c in inspector.get_columns('assessments')]
    if 'project_id' in columns:
        with op.batch_alter_table('assessments') as batch_op:
            batch_op.drop_constraint('fk_assessments_project_id', type_='foreignkey')
            batch_op.drop_column('project_id')
            
    tables = inspector.get_table_names()
    if 'projects' in tables:
        op.drop_table('projects')
