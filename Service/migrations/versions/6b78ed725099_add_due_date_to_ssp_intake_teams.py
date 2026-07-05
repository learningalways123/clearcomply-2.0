"""add due_date to ssp_intake_teams

Revision ID: 6b78ed725099
Revises: 382785f6556f
Create Date: 2026-07-05 11:27:05.118800

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6b78ed725099'
down_revision: Union[str, Sequence[str], None] = '382785f6556f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('ssp_intake_teams', sa.Column('due_date', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('ssp_intake_teams', 'due_date')
