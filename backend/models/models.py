from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    Date, DateTime, ForeignKey
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func
from enum import Enum

Base = declarative_base()

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    DISPATCHER = "DISPATCHER"
    SAFETY = "SAFETY"
    FINANCE = "FINANCE"

class VehicleStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    ON_TRIP = "ON_TRIP"
    IN_SHOP = "IN_SHOP"
    RETIRED = "RETIRED"

class DriverStatus(str, Enum):
    ON_DUTY = "ON_DUTY"
    OFF_DUTY = "OFF_DUTY"
    SUSPENDED = "SUSPENDED"
    ON_TRIP = "ON_TRIP"

class TripStatus(str, Enum):
    DRAFT = "DRAFT"
    DISPATCHED = "DISPATCHED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class MaintenanceStatus(str, Enum):
    OPEN = "OPEN"
    COMPLETED = "COMPLETED"

class ExpenseType(str, Enum):
    FUEL = "FUEL"
    MAINTENANCE = "MAINTENANCE"
    TOLL = "TOLL"
    OTHER = "OTHER"

class VehicleType(str, Enum):
    BIKE = "BIKE"
    TRUCK = "TRUCK"
    VAN = "VAN"

class LicenseCategory(str, Enum):
    BIKE = "BIKE"
    TRUCK = "TRUCK"
    VAN = "VAN"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)  # auto-generated
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default=UserRole.MANAGER.value)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True)
    vehicle_number = Column(String, unique=True, nullable=False)
    model = Column(String, nullable=False)
    vehicle_type = Column(String, nullable=False)

    max_load_capacity = Column(Float, nullable=False)
    odometer = Column(Float, default=0)

    status = Column(String, default=VehicleStatus.AVAILABLE.value)
    acquisition_cost = Column(Float, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)

    license_number = Column(String, unique=True, nullable=False)
    license_category = Column(String, nullable=False)
    license_expiry_date = Column(Date, nullable=False)

    status = Column(String, default=DriverStatus.ON_DUTY.value)
    safety_score = Column(Float, default=100)
    complaints = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())



class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True)

    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)

    cargo_weight = Column(Float, nullable=False)

    origin_street = Column(String)
    origin_city = Column(String)
    origin_state = Column(String)
    origin_country = Column(String)

    destination_street = Column(String)
    destination_city = Column(String)
    destination_state = Column(String)
    destination_country = Column(String)

    start_odometer = Column(Float, nullable=False)
    end_odometer = Column(Float)
    total_distance = Column(Float, default=0)

    status = Column(String, default=TripStatus.DRAFT.value)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))



class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(Integer, primary_key=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)

    issue_description = Column(String, nullable=False)

    service_start_date = Column(Date, nullable=False)
    service_end_date = Column(Date)

    cost = Column(Float, nullable=False)
    status = Column(String, default=MaintenanceStatus.OPEN.value)

    created_at = Column(DateTime(timezone=True), server_default=func.now())




class FuelLog(Base):
    __tablename__ = "fuel_logs"

    id = Column(Integer, primary_key=True)

    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)

    liters = Column(Float, nullable=False)
    fuel_cost = Column(Float, nullable=False)

    total_kms = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)

    date = Column(DateTime(timezone=True), server_default=func.now())



class ExpenseLog(Base):
    __tablename__ = "expense_logs"

    id = Column(Integer, primary_key=True)

    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=True)

    expense_type = Column(String, default=ExpenseType.OTHER.value)
    amount = Column(Float, nullable=False)

    description = Column(String)

    date = Column(Date, nullable=False)
