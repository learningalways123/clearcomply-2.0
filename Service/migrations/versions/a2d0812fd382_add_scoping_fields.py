"""add_scoping_fields

Revision ID: a2d0812fd382
Revises: 10a9d3a9cc19
Create Date: 2026-06-29 21:45:31.020090

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2d0812fd382'
down_revision: Union[str, Sequence[str], None] = '10a9d3a9cc19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('assessments', sa.Column('soc2_assessment_type', sa.String(), nullable=True))
    op.add_column('assessments', sa.Column('soc2_categories', sa.Text(), nullable=True))
    op.add_column('assessments', sa.Column('nist_confidentiality', sa.String(), nullable=True))
    op.add_column('assessments', sa.Column('nist_integrity', sa.String(), nullable=True))
    op.add_column('assessments', sa.Column('nist_availability', sa.String(), nullable=True))
    op.add_column('assessments', sa.Column('nist_baseline', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('assessments', 'nist_baseline')
    op.drop_column('assessments', 'nist_availability')
    op.drop_column('assessments', 'nist_integrity')
    op.drop_column('assessments', 'nist_confidentiality')
    op.drop_column('assessments', 'soc2_categories')
    op.drop_column('assessments', 'soc2_assessment_type')

