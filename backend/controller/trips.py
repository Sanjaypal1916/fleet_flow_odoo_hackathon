from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import get_db
from models.models import Trip as TripModel, Vehicle as VehicleModel, Driver as DriverModel
from schemas import TripCreate, TripUpdate, TripResponse
import schemas
import oauth
from responseFormat import make_response
from typing import List, Optional
from datetime import datetime, date

router = APIRouter(prefix="/trips", tags=["Trips"])


# Helper function to check admin/manager access
def check_admin_manager_access(current_user: schemas.TokenData):
    """Check if user has ADMIN, MANAGER, or DISPATCHER role."""
    allowed_roles = ["ADMIN", "MANAGER", "DISPATCHER"]
    if current_user.role not in allowed_roles:
        return False
    return True


# CREATE - Create a new trip
@router.post("/create")
def create_trip(req: TripCreate, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Create a new trip (requires ADMIN or MANAGER role)."""
    try:
        # Check authorization
        if not check_admin_manager_access(current_user):
            return make_response(
                data=None,
                message="Access denied. Only ADMIN, MANAGER, and DISPATCHER can create trips",
                success=False
            )

        # Validate vehicle exists and is AVAILABLE
        vehicle = db.query(VehicleModel).filter(VehicleModel.id == req.vehicle_id).first()
        if not vehicle:
            return make_response(
                data=None,
                message="Vehicle not found",
                success=False
            )
        
        if vehicle.status != "AVAILABLE":
            return make_response(
                data=None,
                message=f"Vehicle is not available (current status: {vehicle.status})",
                success=False
            )

        # Validate driver exists, is ON_DUTY, and has valid license
        driver = db.query(DriverModel).filter(DriverModel.id == req.driver_id).first()
        if not driver:
            return make_response(
                data=None,
                message="Driver not found",
                success=False
            )
        
        if driver.status != "ON_DUTY":
            return make_response(
                data=None,
                message=f"Driver is not on duty (current status: {driver.status})",
                success=False
            )
        
        # Check if driver's license is expired
        today = date.today()
        if driver.license_expiry_date < today:
            return make_response(
                data=None,
                message="Driver's license has expired",
                success=False
            )

        # Validate vehicle type matches driver license category
        if vehicle.vehicle_type != driver.license_category:
            return make_response(
                data=None,
                message="Vehicle type does not match driver license category",
                success=False
            )

        # Validate cargo weight does not exceed vehicle capacity
        if req.cargo_weight > vehicle.max_load_capacity:
            return make_response(
                data=None,
                message=f"Cargo weight ({req.cargo_weight} kg) exceeds vehicle capacity ({vehicle.max_load_capacity} kg)",
                success=False
            )

        desired_status = req.status.value if req.status else "DISPATCHED"
        if desired_status not in ["DRAFT", "DISPATCHED"]:
            return make_response(
                data=None,
                message="Trip status on creation can only be DRAFT or DISPATCHED",
                success=False
            )

        # Create new trip
        trip = TripModel(
            vehicle_id=req.vehicle_id,
            driver_id=req.driver_id,
            cargo_weight=req.cargo_weight,
            origin_street=req.origin_street,
            origin_city=req.origin_city,
            origin_state=req.origin_state,
            origin_country=req.origin_country,
            destination_street=req.destination_street,
            destination_city=req.destination_city,
            destination_state=req.destination_state,
            destination_country=req.destination_country,
            start_odometer=vehicle.odometer,  # Set start odometer to current vehicle odometer
            end_odometer=req.end_odometer,
            total_distance=req.total_distance if req.total_distance is not None else 0,
            status=desired_status
        )

        # Update vehicle and driver status to ON_TRIP if trip is DISPATCHED
        if trip.status == "DISPATCHED":
            vehicle.status = "ON_TRIP"
            driver.status = "ON_TRIP"

        db.add(trip)
        db.commit()
        
        db.refresh(trip)

        return make_response(
            data=TripResponse.from_orm(trip).dict(),
            message="Trip created successfully",
            success=True
        )

    except Exception as e:
        db.rollback()
        print(f"Error creating trip: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# READ - Get all trips
@router.get("/all")
def get_all_trips(db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get all trips (requires authentication)."""
    try:
        trips = db.query(TripModel).all()
        if not trips:
            return make_response(data=[], message="No trips found", success=True)
        
        return make_response(
            data=[TripResponse.from_orm(trip).dict() for trip in trips],
            message="Trips fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching trips: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# Helper endpoint - Get available vehicles for trip creation
@router.get("/available-vehicles")
def get_available_vehicles(db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get all available vehicles (status = AVAILABLE)."""
    try:
        vehicles = db.query(VehicleModel).filter(VehicleModel.status == "AVAILABLE").all()
        if not vehicles:
            return make_response(data=[], message="No available vehicles found", success=True)
        
        return make_response(
            data=[{"id": v.id, "vehicle_number": v.vehicle_number, "model": v.model, "max_load_capacity": v.max_load_capacity} for v in vehicles],
            message="Available vehicles fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching available vehicles: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# Helper endpoint - Get available drivers for trip creation
@router.get("/available-drivers")
def get_available_drivers(vehicle_type: Optional[str] = None, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get all available drivers (status = ON_DUTY and license not expired)."""
    try:
        today = date.today()
        drivers_query = db.query(DriverModel).filter(
            DriverModel.status == "ON_DUTY",
            DriverModel.license_expiry_date >= today
        )

        if vehicle_type:
            drivers_query = drivers_query.filter(DriverModel.license_category == vehicle_type)

        drivers = drivers_query.all()
        
        if not drivers:
            return make_response(data=[], message="No available drivers found", success=True)
        
        return make_response(
            data=[{"id": d.id, "name": d.name, "license_number": d.license_number, "license_expiry_date": str(d.license_expiry_date), "safety_score": d.safety_score} for d in drivers],
            message="Available drivers fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching available drivers: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# READ - Get trip by ID
@router.get("/{trip_id}")
def get_trip_by_id(trip_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get a trip by ID (requires authentication)."""
    try:
        trip = db.query(TripModel).filter(TripModel.id == trip_id).first()
        if not trip:
            return make_response(
                data=None,
                message="Trip not found",
                success=False
            )

        return make_response(
            data=TripResponse.from_orm(trip).dict(),
            message="Trip fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching trip: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# UPDATE - Update a trip
@router.put("/{trip_id}")
def update_trip(trip_id: int, req: TripUpdate, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Update a trip by ID (requires ADMIN or MANAGER role)."""
    try:
        # Check authorization
        if not check_admin_manager_access(current_user):
            return make_response(
                data=None,
                message="Access denied. Only ADMIN and MANAGER can update trips",
                success=False
            )

        trip = db.query(TripModel).filter(TripModel.id == trip_id).first()
        if not trip:
            return make_response(
                data=None,
                message="Trip not found",
                success=False
            )

        # Update fields if provided
        if req.cargo_weight is not None:
            trip.cargo_weight = req.cargo_weight
        if req.origin_street is not None:
            trip.origin_street = req.origin_street
        if req.origin_city is not None:
            trip.origin_city = req.origin_city
        if req.origin_state is not None:
            trip.origin_state = req.origin_state
        if req.origin_country is not None:
            trip.origin_country = req.origin_country
        if req.destination_street is not None:
            trip.destination_street = req.destination_street
        if req.destination_city is not None:
            trip.destination_city = req.destination_city
        if req.destination_state is not None:
            trip.destination_state = req.destination_state
        if req.destination_country is not None:
            trip.destination_country = req.destination_country
        if req.end_odometer is not None:
            trip.end_odometer = req.end_odometer
        if req.total_distance is not None:
            trip.total_distance = req.total_distance
        
        # Handle trip status change
        if req.status is not None:
            new_status = req.status.value
            old_status = trip.status

            if new_status == old_status:
                pass
            elif old_status == "DRAFT":
                if new_status != "DISPATCHED":
                    return make_response(
                        data=None,
                        message="Trip status can only change from DRAFT to DISPATCHED",
                        success=False
                    )

                vehicle = db.query(VehicleModel).filter(VehicleModel.id == trip.vehicle_id).first()
                driver = db.query(DriverModel).filter(DriverModel.id == trip.driver_id).first()

                if not vehicle or not driver:
                    return make_response(
                        data=None,
                        message="Vehicle or driver not found",
                        success=False
                    )

                if vehicle.status != "AVAILABLE":
                    return make_response(
                        data=None,
                        message=f"Vehicle is not available (current status: {vehicle.status})",
                        success=False
                    )

                if driver.status != "ON_DUTY":
                    return make_response(
                        data=None,
                        message=f"Driver is not on duty (current status: {driver.status})",
                        success=False
                    )

                today = date.today()
                if driver.license_expiry_date < today:
                    return make_response(
                        data=None,
                        message="Driver's license has expired",
                        success=False
                    )

                if vehicle.vehicle_type != driver.license_category:
                    return make_response(
                        data=None,
                        message="Vehicle type does not match driver license category",
                        success=False
                    )

                trip.status = "DISPATCHED"
                vehicle.status = "ON_TRIP"
                driver.status = "ON_TRIP"

            elif old_status == "DISPATCHED":
                if new_status not in ["COMPLETED", "CANCELLED"]:
                    return make_response(
                        data=None,
                        message="Trip status can only change from DISPATCHED to COMPLETED or CANCELLED",
                        success=False
                    )

                vehicle = db.query(VehicleModel).filter(VehicleModel.id == trip.vehicle_id).first()
                driver = db.query(DriverModel).filter(DriverModel.id == trip.driver_id).first()

                if new_status == "COMPLETED":
                    if trip.end_odometer is None:
                        return make_response(
                            data=None,
                            message="End odometer is required to complete the trip",
                            success=False
                        )

                    trip.status = "COMPLETED"
                    trip.completed_at = datetime.utcnow()

                    if trip.start_odometer is not None:
                        trip.total_distance = trip.end_odometer - trip.start_odometer

                    if vehicle:
                        vehicle.status = "AVAILABLE"
                        vehicle.odometer = trip.end_odometer

                    if driver:
                        driver.status = "ON_DUTY"

                else:
                    trip.status = "CANCELLED"
                    if vehicle:
                        vehicle.status = "AVAILABLE"
                    if driver:
                        driver.status = "ON_DUTY"

            else:
                return make_response(
                    data=None,
                    message="Trip status cannot be changed after completion or cancellation",
                    success=False
                )

        db.commit()
        db.refresh(trip)

        return make_response(
            data=TripResponse.from_orm(trip).dict(),
            message="Trip updated successfully",
            success=True
        )
    except Exception as e:
        db.rollback()
        print(f"Error updating trip: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# DELETE - Delete a trip
@router.delete("/{trip_id}")
def delete_trip(trip_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Delete a trip by ID (requires ADMIN or MANAGER role)."""
    try:
        # Check authorization
        if not check_admin_manager_access(current_user):
            return make_response(
                data=None,
                message="Access denied. Only ADMIN and MANAGER can delete trips",
                success=False
            )

        trip = db.query(TripModel).filter(TripModel.id == trip_id).first()
        if not trip:
            return make_response(
                data=None,
                message="Trip not found",
                success=False
            )

        vehicle = db.query(VehicleModel).filter(VehicleModel.id == trip.vehicle_id).first()
        driver = db.query(DriverModel).filter(DriverModel.id == trip.driver_id).first()

        if trip.status == "COMPLETED":
            if trip.end_odometer is not None and vehicle:
                vehicle.odometer = trip.end_odometer
            if driver:
                driver.status = "ON_DUTY"
            if vehicle:
                vehicle.status = "AVAILABLE"
        elif trip.status == "DISPATCHED":
            if vehicle:
                vehicle.status = "AVAILABLE"
            if driver:
                driver.status = "ON_DUTY"
        elif trip.status == "CANCELLED":
            if vehicle:
                vehicle.status = "AVAILABLE"
            if driver:
                driver.status = "ON_DUTY"

        db.delete(trip)
        db.commit()

        return make_response(
            data={"trip_id": trip_id},
            message="Trip deleted successfully",
            success=True
        )
    except Exception as e:
        db.rollback()
        print(f"Error deleting trip: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )
