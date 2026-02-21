from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from models.models import (
	UserRole, VehicleStatus, DriverStatus,
	TripStatus, MaintenanceStatus, ExpenseType,
	VehicleType, LicenseCategory
)


### Authentication & Token
class TokenData(BaseModel):
	user_id: int
	role: Optional[str] = None
	email: Optional[str] = None
	name: Optional[str] = None


class Token(BaseModel):
	access_token: str
	token_type: str


### User
class UserCreate(BaseModel):
	name: str
	email: str
	password: str
	role: Optional[UserRole] = UserRole.MANAGER


class UserUpdate(BaseModel):
	name: Optional[str]
	email: Optional[str]
	password: Optional[str]
	role: Optional[UserRole]


class UserResponse(BaseModel):
	id: int
	name: str
	email: str
	role: UserRole
	is_active: bool
	created_at: datetime

	class Config:
		orm_mode = True


### Vehicle
class VehicleCreate(BaseModel):
	vehicle_number: str
	model: str
	vehicle_type: VehicleType
	max_load_capacity: float
	odometer: Optional[float] = 0
	status: Optional[VehicleStatus] = VehicleStatus.AVAILABLE
	acquisition_cost: Optional[float] = 0


class VehicleUpdate(BaseModel):
	vehicle_number: Optional[str]
	model: Optional[str]
	vehicle_type: Optional[VehicleType]
	max_load_capacity: Optional[float]
	odometer: Optional[float]
	status: Optional[VehicleStatus]
	acquisition_cost: Optional[float]


class VehicleResponse(BaseModel):
	id: int
	vehicle_number: str
	model: str
	vehicle_type: VehicleType
	max_load_capacity: float
	odometer: float
	status: VehicleStatus
	acquisition_cost: float
	created_at: datetime

	class Config:
		orm_mode = True


### Driver
class DriverCreate(BaseModel):
	name: str
	license_number: str
	license_category: LicenseCategory
	license_expiry_date: date
	status: Optional[DriverStatus] = DriverStatus.ON_DUTY
	safety_score: Optional[float] = 100.0
	complaints: Optional[int] = 0


class DriverUpdate(BaseModel):
	name: Optional[str]
	license_number: Optional[str]
	license_category: Optional[LicenseCategory]
	license_expiry_date: Optional[date]
	status: Optional[DriverStatus]
	safety_score: Optional[float]
	complaints: Optional[int]


class DriverResponse(BaseModel):
	id: int
	name: str
	license_number: str
	license_category: LicenseCategory
	license_expiry_date: date
	status: DriverStatus
	safety_score: float
	complaints: int
	created_at: datetime

	class Config:
		orm_mode = True


### Trip
class TripCreate(BaseModel):
	vehicle_id: int
	driver_id: int
	cargo_weight: float

	origin_street: Optional[str]
	origin_city: Optional[str]
	origin_state: Optional[str]
	origin_country: Optional[str]

	destination_street: Optional[str]
	destination_city: Optional[str]
	destination_state: Optional[str]
	destination_country: Optional[str]
	
	end_odometer: Optional[float]
	total_distance: Optional[float]
	status: Optional[TripStatus] = TripStatus.DRAFT


class TripUpdate(BaseModel):
	cargo_weight: Optional[float]
	origin_street: Optional[str]
	origin_city: Optional[str]
	origin_state: Optional[str]
	origin_country: Optional[str]
	destination_street: Optional[str]
	destination_city: Optional[str]
	destination_state: Optional[str]
	destination_country: Optional[str]
	end_odometer: Optional[float]
	total_distance: Optional[float]
	status: Optional[TripStatus]


class TripResponse(BaseModel):
	id: int
	vehicle_id: int
	driver_id: int
	cargo_weight: float
	origin_city: Optional[str]
	destination_city: Optional[str]
	start_odometer: float
	end_odometer: Optional[float]
	total_distance: float
	status: TripStatus
	created_at: datetime
	completed_at: Optional[datetime]

	class Config:
		orm_mode = True


### MaintenanceLog
class MaintenanceLogCreate(BaseModel):
	vehicle_id: int
	issue_description: str
	service_start_date: date
	service_end_date: Optional[date]
	cost: float
	status: Optional[MaintenanceStatus] = MaintenanceStatus.OPEN


class MaintenanceLogResponse(BaseModel):
	id: int
	vehicle_id: int
	issue_description: str
	service_start_date: date
	service_end_date: Optional[date]
	cost: float
	status: MaintenanceStatus
	created_at: datetime

	class Config:
		orm_mode = True


### FuelLog
class FuelLogCreate(BaseModel):
	trip_id: int
	liters: float
	fuel_cost: float
	vehicle_id: Optional[int]
	total_kms: Optional[float]
	total_cost: Optional[float]
	date: Optional[datetime]


class FuelLogResponse(BaseModel):
	id: int
	trip_id: int
	vehicle_id: int
	liters: float
	fuel_cost: float
	total_kms: float
	total_cost: float
	date: datetime

	class Config:
		orm_mode = True


### ExpenseLog
class ExpenseLogCreate(BaseModel):
	vehicle_id: int
	trip_id: Optional[int]
	expense_type: Optional[ExpenseType] = ExpenseType.OTHER
	amount: float
	description: Optional[str]
	date: Optional[datetime]


class ExpenseLogResponse(BaseModel):
	id: int
	vehicle_id: int
	trip_id: Optional[int]
	expense_type: ExpenseType
	amount: float
	description: Optional[str]
	date: datetime

	class Config:
		orm_mode = True

