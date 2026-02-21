from sqlalchemy import Column, String, Enum, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base
import enum
import uuid
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import UUID



class UserRole(enum.Enum):
    internal = "internal"
    portal = "portal"

class User(Base):
    __tablename__ = "users"

    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    mobile = Column(String)
    contact_id = Column(
        UUID(as_uuid=True),
        ForeignKey("contacts.id", ondelete="RESTRICT"),
        nullable=False   
    )
    contact = relationship("Contact", back_populates="user" )



class ContactType(enum.Enum):
    customer = "customer"
    vendor = "vendor"
    both = "both"

class Contact(Base):
    __tablename__ = "contacts"

    name = Column(String, nullable=False)
    type = Column(Enum(ContactType), nullable=False)
    email = Column(String)
    mobile = Column(String)
    city = Column(String)
    state = Column(String)
    pincode = Column(String)

    user = relationship("User", back_populates="contact", uselist=False, cascade="all, delete-orphan")
