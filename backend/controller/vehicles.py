from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import get_db
from models.models import Vehicle as VehicleModel, VehicleType
from schemas import VehicleCreate, VehicleUpdate, VehicleResponse
import schemas
import oauth
from responseFormat import make_response
from typing import List

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


# Helper function to check admin/manager access
def check_admin_manager_access(current_user: schemas.TokenData):
    """Check if user has ADMIN or MANAGER role."""
    allowed_roles = ["ADMIN", "MANAGER"]
    if current_user.role not in allowed_roles:
        return False
    return True


def normalize_vehicle_type(vehicle: VehicleModel) -> bool:
    """Normalize vehicle_type to valid enum values; returns True if updated."""
    allowed_types = {vt.value for vt in VehicleType}
    if not vehicle.vehicle_type:
        return False

    normalized = str(vehicle.vehicle_type).upper()
    if normalized in allowed_types and vehicle.vehicle_type != normalized:
        vehicle.vehicle_type = normalized
        return True
    return False


# CREATE - Create a new vehicle
@router.post("/create")
def create_vehicle(req: VehicleCreate, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Create a new vehicle (requires ADMIN or MANAGER role)."""
    try:
        # Check authorization
        if not check_admin_manager_access(current_user):
            return make_response(
                data=None,
                message="Access denied. Only ADMIN and MANAGER can create vehicles",
                success=False
            )

        # Check if vehicle_number already exists
        existing_vehicle = db.query(VehicleModel).filter(VehicleModel.vehicle_number == req.vehicle_number).first()
        if existing_vehicle:
            return make_response(
                data=None,
                message="Vehicle with this number already exists",
                success=False
            )

        # Create new vehicle
        vehicle = VehicleModel(
            vehicle_number=req.vehicle_number,
            model=req.model,
            vehicle_type=req.vehicle_type.value,
            max_load_capacity=req.max_load_capacity,
            odometer=req.odometer if req.odometer is not None else 0,
            status=req.status.value if req.status else "AVAILABLE",
            acquisition_cost=req.acquisition_cost if req.acquisition_cost is not None else 0
        )

        # Validate initial status - only AVAILABLE or RETIRED allowed
        allowed_initial_statuses = ["AVAILABLE", "RETIRED"]
        if vehicle.status not in allowed_initial_statuses:
            return make_response(
                data=None,
                message=f"Vehicle status on creation can only be AVAILABLE or RETIRED (provided: {vehicle.status})",
                success=False
            )

        db.add(vehicle)
        db.commit()
        db.refresh(vehicle)

        return make_response(
            data=VehicleResponse.from_orm(vehicle).dict(),
            message="Vehicle created successfully",
            success=True
        )

    except Exception as e:
        db.rollback()
        print(f"Error creating vehicle: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# READ - Get all vehicles
@router.get("/all")
def get_all_vehicles(db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get all vehicles (requires authentication)."""
    try:
        vehicles = db.query(VehicleModel).all()
        if not vehicles:
            return make_response(data=[], message="No vehicles found", success=True)
        
        updated = False
        for vehicle in vehicles:
            if normalize_vehicle_type(vehicle):
                updated = True

        if updated:
            db.commit()

        return make_response(
            data=[VehicleResponse.from_orm(vehicle).dict() for vehicle in vehicles],
            message="Vehicles fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching vehicles: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# READ - Get vehicle by ID
@router.get("/{vehicle_id}")
def get_vehicle_by_id(vehicle_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get a vehicle by ID (requires authentication)."""
    try:
        vehicle = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
        if not vehicle:
            return make_response(
                data=None,
                message="Vehicle not found",
                success=False
            )

        if normalize_vehicle_type(vehicle):
            db.commit()
            db.refresh(vehicle)

        return make_response(
            data=VehicleResponse.from_orm(vehicle).dict(),
            message="Vehicle fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching vehicle: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# UPDATE - Update a vehicle
@router.put("/{vehicle_id}")
def update_vehicle(vehicle_id: int, req: VehicleUpdate, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Update a vehicle by ID (requires ADMIN or MANAGER role)."""
    try:
        # Check authorization
        if not check_admin_manager_access(current_user):
            return make_response(
                data=None,
                message="Access denied. Only ADMIN and MANAGER can update vehicles",
                success=False
            )

        vehicle = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
        if not vehicle:
            return make_response(
                data=None,
                message="Vehicle not found",
                success=False
            )

        # Update fields if provided
        if req.vehicle_number is not None:
            # Check if new vehicle_number already exists
            existing_vehicle = db.query(VehicleModel).filter(
                VehicleModel.vehicle_number == req.vehicle_number,
                VehicleModel.id != vehicle_id
            ).first()
            if existing_vehicle:
                return make_response(
                    data=None,
                    message="Vehicle number already in use",
                    success=False
                )
            vehicle.vehicle_number = req.vehicle_number
        if req.model is not None:
            vehicle.model = req.model
        if req.vehicle_type is not None:
            vehicle.vehicle_type = req.vehicle_type.value
        if req.max_load_capacity is not None:
            vehicle.max_load_capacity = req.max_load_capacity
        if req.odometer is not None:
            vehicle.odometer = req.odometer
        if req.status is not None:
            vehicle.status = req.status.value
        if req.acquisition_cost is not None:
            vehicle.acquisition_cost = req.acquisition_cost

        db.commit()
        db.refresh(vehicle)

        return make_response(
            data=VehicleResponse.from_orm(vehicle).dict(),
            message="Vehicle updated successfully",
            success=True
        )
    except Exception as e:
        db.rollback()
        print(f"Error updating vehicle: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# DELETE - Delete a vehicle
@router.delete("/{vehicle_id}")
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Delete a vehicle by ID (requires ADMIN or MANAGER role)."""
    try:
        # Check authorization
        if not check_admin_manager_access(current_user):
            return make_response(
                data=None,
                message="Access denied. Only ADMIN and MANAGER can delete vehicles",
                success=False
            )

        vehicle = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
        if not vehicle:
            return make_response(
                data=None,
                message="Vehicle not found",
                success=False
            )

        db.delete(vehicle)
        db.commit()

        return make_response(
            data={"vehicle_id": vehicle_id},
            message="Vehicle deleted successfully",
            success=True
        )
    except Exception as e:
        db.rollback()
        print(f"Error deleting vehicle: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )
