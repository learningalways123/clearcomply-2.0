"""add_start_and_end_dates

Revision ID: 600d790ff8ec
Revises: 6b78ed725099
Create Date: 2026-07-07 22:56:11.073496

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '600d790ff8ec'
down_revision: Union[str, Sequence[str], None] = '6b78ed725099'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('assessments', sa.Column('start_date', sa.DateTime(), nullable=True))
    op.add_column('assessments', sa.Column('end_date', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('assessments', 'end_date')
    op.drop_column('assessments', 'start_date')
