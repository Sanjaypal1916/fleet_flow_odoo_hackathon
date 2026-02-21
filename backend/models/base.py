import uuid
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Table, ForeignKey

class Base(DeclarativeBase):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)

