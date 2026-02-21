from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import get_db
from models.models import FuelLog as FuelLogModel, Trip as TripModel, Vehicle as VehicleModel
from schemas import FuelLogCreate, FuelLogResponse
import schemas
import oauth
from responseFormat import make_response
from typing import List
from datetime import datetime

router = APIRouter(prefix="/fuel-logs", tags=["Fuel Logs"])


# Helper function to check admin/manager access
def check_admin_manager_access(current_user: schemas.TokenData):
    """Check if user has ADMIN or MANAGER role."""
    allowed_roles = ["ADMIN", "MANAGER", "FINANCE"]
    if current_user.role not in allowed_roles:
        return False
    return True


# CREATE - Create a new fuel log
@router.post("/create")
def create_fuel_log(req: FuelLogCreate, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Create a new fuel log (requires ADMIN or MANAGER role)."""
    try:
        # Check authorization
        if not check_admin_manager_access(current_user):
            return make_response(
                data=None,
                message="Access denied. Only ADMIN and MANAGER can create fuel logs",
                success=False
            )

        # Validate trip exists
        trip = db.query(TripModel).filter(TripModel.id == req.trip_id).first()
        if not trip:
            return make_response(
                data=None,
                message="Trip not found",
                success=False
            )

        # Validate trip status is DISPATCHED or COMPLETED
        allowed_trip_statuses = ["DISPATCHED", "COMPLETED"]
        if trip.status not in allowed_trip_statuses:
            return make_response(
                data=None,
                message=f"Fuel log can only be created for trips with status DISPATCHED or COMPLETED (current status: {trip.status})",
                success=False
            )

        # Get vehicle_id from trip (every trip has an associated vehicle)
        vehicle_id = trip.vehicle_id
        vehicle = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
        if not vehicle:
            return make_response(
                data=None,
                message="Vehicle not found for the specified trip",
                success=False
            )

        # Calculate total_cost = liters * fuel_cost (cost_per_liter)
        total_cost = req.liters * req.fuel_cost

        # Calculate total_kms = trip.end_odometer - trip.start_odometer
        if trip.end_odometer is None:
            return make_response(
                data=None,
                message="Trip does not have an end odometer reading yet",
                success=False
            )

        total_kms = trip.end_odometer - trip.start_odometer

        # Create new fuel log
        fuel_log = FuelLogModel(
            trip_id=req.trip_id,
            vehicle_id=vehicle_id,
            liters=req.liters,
            fuel_cost=req.fuel_cost,
            total_kms=total_kms,
            total_cost=total_cost,
            date=req.date if req.date else datetime.now()
        )

        # Add fuel cost to vehicle acquisition_cost
        vehicle.acquisition_cost += total_cost

        db.add(fuel_log)
        db.commit()
        db.refresh(fuel_log)

        return make_response(
            data=FuelLogResponse.from_orm(fuel_log).dict(),
            message="Fuel log created successfully",
            success=True
        )

    except Exception as e:
        db.rollback()
        print(f"Error creating fuel log: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# READ - Get all fuel logs
@router.get("/all")
def get_all_fuel_logs(db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get all fuel logs (requires authentication)."""
    try:
        logs = db.query(FuelLogModel).all()
        if not logs:
            return make_response(data=[], message="No fuel logs found", success=True)
        
        return make_response(
            data=[FuelLogResponse.from_orm(log).dict() for log in logs],
            message="Fuel logs fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching fuel logs: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# READ - Get fuel log by ID
@router.get("/{fuel_log_id}")
def get_fuel_log_by_id(fuel_log_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get a fuel log by ID (requires authentication)."""
    try:
        log = db.query(FuelLogModel).filter(FuelLogModel.id == fuel_log_id).first()
        if not log:
            return make_response(
                data=None,
                message="Fuel log not found",
                success=False
            )

        return make_response(
            data=FuelLogResponse.from_orm(log).dict(),
            message="Fuel log fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching fuel log: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# READ - Get fuel logs by trip ID
@router.get("/trip/{trip_id}")
def get_fuel_logs_by_trip(trip_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get fuel logs for a specific trip (requires authentication)."""
    try:
        logs = db.query(FuelLogModel).filter(FuelLogModel.trip_id == trip_id).all()
        if not logs:
            return make_response(data=[], message="No fuel logs found for this trip", success=True)
        
        return make_response(
            data=[FuelLogResponse.from_orm(log).dict() for log in logs],
            message="Fuel logs fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching fuel logs: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# READ - Get fuel logs by vehicle ID
@router.get("/vehicle/{vehicle_id}")
def get_fuel_logs_by_vehicle(vehicle_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get fuel logs for a specific vehicle (requires authentication)."""
    try:
        logs = db.query(FuelLogModel).filter(FuelLogModel.vehicle_id == vehicle_id).all()
        if not logs:
            return make_response(data=[], message="No fuel logs found for this vehicle", success=True)
        
        return make_response(
            data=[FuelLogResponse.from_orm(log).dict() for log in logs],
            message="Fuel logs fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching fuel logs: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# HELPER - Get all available trips for fuel log creation
@router.get("/trips/available")
def get_available_trips(db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get all trips with DISPATCHED or COMPLETED status (eligible for fuel log creation)."""
    try:
        allowed_statuses = ["DISPATCHED", "COMPLETED"]
        trips = db.query(TripModel).filter(TripModel.status.in_(allowed_statuses)).all()
        
        if not trips:
            return make_response(data=[], message="No available trips found", success=True)
        
        # Return trip details with associated vehicle and driver info
        trip_data = []
        for trip in trips:
            vehicle = db.query(VehicleModel).filter(VehicleModel.id == trip.vehicle_id).first()
            trip_info = {
                "id": trip.id,
                "vehicle_id": trip.vehicle_id,
                "vehicle_number": vehicle.vehicle_number if vehicle else None,
                "driver_id": trip.driver_id,
                "status": trip.status,
                "start_odometer": trip.start_odometer,
                "end_odometer": trip.end_odometer,
                "total_distance": trip.total_distance
            }
            trip_data.append(trip_info)
        
        return make_response(
            data=trip_data,
            message="Available trips fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching available trips: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# HELPER - Get all vehicles associated with available trips
@router.get("/vehicles/available")
def get_available_vehicles(db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get all vehicles that have DISPATCHED or COMPLETED trips (eligible for fuel log creation)."""
    try:
        allowed_statuses = ["DISPATCHED", "COMPLETED"]
        # Get all trips with allowed statuses
        trips = db.query(TripModel).filter(TripModel.status.in_(allowed_statuses)).all()
        
        if not trips:
            return make_response(data=[], message="No vehicles with available trips found", success=True)
        
        # Get unique vehicle IDs from these trips
        vehicle_ids = set(trip.vehicle_id for trip in trips)
        
        # Fetch vehicle details
        vehicles = db.query(VehicleModel).filter(VehicleModel.id.in_(vehicle_ids)).all()
        
        if not vehicles:
            return make_response(data=[], message="No vehicles found", success=True)
        
        vehicle_data = [
            {
                "id": vehicle.id,
                "vehicle_number": vehicle.vehicle_number,
                "model": vehicle.model,
                "vehicle_type": vehicle.vehicle_type,
                "status": vehicle.status,
                "odometer": vehicle.odometer
            }
            for vehicle in vehicles
        ]
        
        return make_response(
            data=vehicle_data,
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


# UPDATE - Update a fuel log
@router.put("/{fuel_log_id}")
def update_fuel_log(fuel_log_id: int, req: FuelLogCreate, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Update a fuel log by ID (requires ADMIN or MANAGER role)."""
    try:
        # Check authorization
        if not check_admin_manager_access(current_user):
            return make_response(
                data=None,
                message="Access denied. Only ADMIN and MANAGER can update fuel logs",
                success=False
            )

        log = db.query(FuelLogModel).filter(FuelLogModel.id == fuel_log_id).first()
        if not log:
            return make_response(
                data=None,
                message="Fuel log not found",
                success=False
            )

        # Validate trip exists and has proper status
        trip = db.query(TripModel).filter(TripModel.id == req.trip_id).first()
        if not trip:
            return make_response(
                data=None,
                message="Trip not found",
                success=False
            )

        allowed_trip_statuses = ["DISPATCHED", "COMPLETED"]
        if trip.status not in allowed_trip_statuses:
            return make_response(
                data=None,
                message=f"Fuel log can only be updated for trips with status DISPATCHED or COMPLETED (current status: {trip.status})",
                success=False
            )

        # Get vehicle_id from trip (every trip has an associated vehicle)
        vehicle_id = trip.vehicle_id
        vehicle = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
        if not vehicle:
            return make_response(
                data=None,
                message="Vehicle not found for the specified trip",
                success=False
            )

        # Calculate total_cost = liters * fuel_cost
        total_cost = req.liters * req.fuel_cost

        # Calculate total_kms = trip.end_odometer - trip.start_odometer
        if trip.end_odometer is None:
            return make_response(
                data=None,
                message="Trip does not have an end odometer reading yet",
                success=False
            )

        total_kms = trip.end_odometer - trip.start_odometer

        # Update vehicle acquisition_cost: remove old, add new
        old_total_cost = log.total_cost or 0
        old_vehicle = db.query(VehicleModel).filter(VehicleModel.id == log.vehicle_id).first()
        if old_vehicle:
            old_vehicle.acquisition_cost -= old_total_cost

        vehicle.acquisition_cost += total_cost

        # Update fields
        log.trip_id = req.trip_id
        log.vehicle_id = vehicle_id
        log.liters = req.liters
        log.fuel_cost = req.fuel_cost
        log.total_kms = total_kms
        log.total_cost = total_cost
        log.date = req.date if req.date else log.date

        db.commit()
        db.refresh(log)

        return make_response(
            data=FuelLogResponse.from_orm(log).dict(),
            message="Fuel log updated successfully",
            success=True
        )
    except Exception as e:
        db.rollback()
        print(f"Error updating fuel log: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# DELETE - Delete a fuel log
@router.delete("/{fuel_log_id}")
def delete_fuel_log(fuel_log_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Delete a fuel log by ID (requires ADMIN or MANAGER role)."""
    try:
        # Check authorization
        if not check_admin_manager_access(current_user):
            return make_response(
                data=None,
                message="Access denied. Only ADMIN and MANAGER can delete fuel logs",
                success=False
            )

        log = db.query(FuelLogModel).filter(FuelLogModel.id == fuel_log_id).first()
        if not log:
            return make_response(
                data=None,
                message="Fuel log not found",
                success=False
            )

        vehicle = db.query(VehicleModel).filter(VehicleModel.id == log.vehicle_id).first()
        if vehicle:
            vehicle.acquisition_cost -= log.total_cost

        db.delete(log)
        db.commit()

        return make_response(
            data={"fuel_log_id": fuel_log_id},
            message="Fuel log deleted successfully",
            success=True
        )
    except Exception as e:
        db.rollback()
        print(f"Error deleting fuel log: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )
