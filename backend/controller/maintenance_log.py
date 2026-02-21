from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import get_db
from models.models import MaintenanceLog as MaintenanceLogModel, Vehicle as VehicleModel
from schemas import MaintenanceLogCreate, MaintenanceLogResponse
import schemas
import oauth
from responseFormat import make_response
from typing import List
from datetime import date

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


# Helper function to check admin/manager access
def check_admin_manager_access(current_user: schemas.TokenData):
    """Check if user has ADMIN or MANAGER role."""
    allowed_roles = ["ADMIN", "MANAGER"]
    if current_user.role not in allowed_roles:
        return False
    return True


# Helper function to auto-complete maintenance logs
def auto_complete_maintenance(db: Session):
    """Auto-complete any maintenance logs where today >= service_end_date."""
    try:
        today = date.today()
        # Find all OPEN maintenance logs where today >= service_end_date
        logs_to_complete = db.query(MaintenanceLogModel).filter(
            MaintenanceLogModel.status == "OPEN",
            MaintenanceLogModel.service_end_date <= today
        ).all()

        for log in logs_to_complete:
            # Mark maintenance as COMPLETED
            log.status = "COMPLETED"

            # Get the vehicle and update it
            vehicle = db.query(VehicleModel).filter(VehicleModel.id == log.vehicle_id).first()
            if vehicle:
                # Add maintenance cost to vehicle's acquisition cost
                vehicle.acquisition_cost += log.cost
                # Set vehicle status back to AVAILABLE
                vehicle.status = "AVAILABLE"

        if logs_to_complete:
            db.commit()
    except Exception as e:
        print(f"Error auto-completing maintenance logs: {e}")
        db.rollback()


# CREATE - Create a new maintenance log
@router.post("/create")
def create_maintenance_log(req: MaintenanceLogCreate, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Create a new maintenance log (requires ADMIN or MANAGER role)."""
    try:
        # Check authorization
        if not check_admin_manager_access(current_user):
            return make_response(
                data=None,
                message="Access denied. Only ADMIN and MANAGER can create maintenance logs",
                success=False
            )

        # Validate vehicle exists
        vehicle = db.query(VehicleModel).filter(VehicleModel.id == req.vehicle_id).first()
        if not vehicle:
            return make_response(
                data=None,
                message="Vehicle not found",
                success=False
            )

        # Create new maintenance log with status OPEN
        maintenance_log = MaintenanceLogModel(
            vehicle_id=req.vehicle_id,
            issue_description=req.issue_description,
            service_start_date=req.service_start_date,
            service_end_date=req.service_end_date,
            cost=req.cost,
            status="OPEN"  # Always start with OPEN status
        )

        # Update vehicle status to IN_SHOP
        vehicle.status = "IN_SHOP"

        db.add(maintenance_log)
        db.commit()
        db.refresh(maintenance_log)

        return make_response(
            data=MaintenanceLogResponse.from_orm(maintenance_log).dict(),
            message="Maintenance log created successfully. Vehicle status changed to IN_SHOP",
            success=True
        )

    except Exception as e:
        db.rollback()
        print(f"Error creating maintenance log: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# READ - Get all maintenance logs
@router.get("/all")
def get_all_maintenance_logs(db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get all maintenance logs (requires authentication)."""
    try:
        # Auto-complete any maintenance logs where today >= service_end_date
        auto_complete_maintenance(db)

        logs = db.query(MaintenanceLogModel).all()
        if not logs:
            return make_response(data=[], message="No maintenance logs found", success=True)
        
        return make_response(
            data=[MaintenanceLogResponse.from_orm(log).dict() for log in logs],
            message="Maintenance logs fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching maintenance logs: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# READ - Get maintenance logs by vehicle ID
@router.get("/vehicle/{vehicle_id}")
def get_maintenance_logs_by_vehicle(vehicle_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get maintenance logs for a specific vehicle (requires authentication)."""
    try:
        # Auto-complete any maintenance logs where today >= service_end_date
        auto_complete_maintenance(db)

        logs = db.query(MaintenanceLogModel).filter(MaintenanceLogModel.vehicle_id == vehicle_id).all()
        if not logs:
            return make_response(data=[], message="No maintenance logs found for this vehicle", success=True)
        
        return make_response(
            data=[MaintenanceLogResponse.from_orm(log).dict() for log in logs],
            message="Maintenance logs fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching maintenance logs: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# READ - Get maintenance log by ID
@router.get("/{maintenance_id}")
def get_maintenance_log_by_id(maintenance_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get a maintenance log by ID (requires authentication)."""
    try:
        # Auto-complete any maintenance logs where today >= service_end_date
        auto_complete_maintenance(db)

        log = db.query(MaintenanceLogModel).filter(MaintenanceLogModel.id == maintenance_id).first()
        if not log:
            return make_response(
                data=None,
                message="Maintenance log not found",
                success=False
            )

        return make_response(
            data=MaintenanceLogResponse.from_orm(log).dict(),
            message="Maintenance log fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching maintenance log: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# UPDATE - Update a maintenance log
@router.put("/{maintenance_id}")
def update_maintenance_log(maintenance_id: int, req: MaintenanceLogCreate, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Update a maintenance log by ID (requires ADMIN or MANAGER role and OPEN status)."""

    try:
        # Check authorization
        if not check_admin_manager_access(current_user):
            return make_response(
                data=None,
                message="Access denied. Only ADMIN and MANAGER can update maintenance logs",
                success=False
            )
        
        auto_complete_maintenance(db)

        log = db.query(MaintenanceLogModel).filter(MaintenanceLogModel.id == maintenance_id).first()
        if not log:
            return make_response(
                data=None,
                message="Maintenance log not found",
                success=False
            )

        # Check if maintenance log is OPEN - if not, it's frozen and cannot be updated
        if log.status != "OPEN":
            return make_response(
                data=None,
                message=f"Cannot update maintenance log. Status is {log.status} (FROZEN). Only OPEN maintenance logs can be updated.",
                success=False
            )

        # Update fields
        log.issue_description = req.issue_description
        log.service_start_date = req.service_start_date
        log.service_end_date = req.service_end_date
        log.cost = req.cost

        # Check if maintenance should be marked as completed
        today = date.today()
        if log.service_end_date and today >= log.service_end_date:
            # Mark maintenance as COMPLETED
            log.status = "COMPLETED"

            # Get the vehicle and update its status
            vehicle = db.query(VehicleModel).filter(VehicleModel.id == log.vehicle_id).first()
            if vehicle:
                # Add maintenance cost to vehicle's acquisition cost
                vehicle.acquisition_cost += log.cost
                # Set vehicle status back to AVAILABLE
                vehicle.status = "AVAILABLE"
        else:
            # Keep status as OPEN if end_date hasn't passed yet
            log.status = "OPEN"

        db.commit()
        db.refresh(log)

        return make_response(
            data=MaintenanceLogResponse.from_orm(log).dict(),
            message="Maintenance log updated successfully",
            success=True
        )
    except Exception as e:
        db.rollback()
        print(f"Error updating maintenance log: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# DELETE - Delete a maintenance log
@router.delete("/{maintenance_id}")
def delete_maintenance_log(maintenance_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Delete a maintenance log by ID (requires ADMIN or MANAGER role)."""
    try:
        auto_complete_maintenance(db)
        # Check authorization
        if not check_admin_manager_access(current_user):
            return make_response(
                data=None,
                message="Access denied. Only ADMIN and MANAGER can delete maintenance logs",
                success=False
            )

        log = db.query(MaintenanceLogModel).filter(MaintenanceLogModel.id == maintenance_id).first()
        if not log:
            return make_response(
                data=None,
                message="Maintenance log not found",
                success=False
            )

        # Get the vehicle and reset its status to AVAILABLE if it was IN_SHOP
        vehicle = db.query(VehicleModel).filter(VehicleModel.id == log.vehicle_id).first()
        if vehicle and vehicle.status == "IN_SHOP":
            vehicle.status = "AVAILABLE"
            vehicle.acquisition_cost -= log.cost  # Subtract maintenance cost from acquisition cost

        db.delete(log)
        db.commit()

        return make_response(
            data={"maintenance_id": maintenance_id},
            message="Maintenance log deleted successfully. Vehicle status reset to AVAILABLE",
            success=True
        )
    except Exception as e:
        db.rollback()
        print(f"Error deleting maintenance log: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# Helper endpoint - Get active maintenance logs (Open ones)
@router.get("/status/open")
def get_open_maintenance_logs(db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get all open maintenance logs (requires authentication)."""
    try:
        # Auto-complete any maintenance logs where today >= service_end_date
        auto_complete_maintenance(db)

        logs = db.query(MaintenanceLogModel).filter(MaintenanceLogModel.status == "OPEN").all()
        if not logs:
            return make_response(data=[], message="No open maintenance logs found", success=True)
        
        return make_response(
            data=[MaintenanceLogResponse.from_orm(log).dict() for log in logs],
            message="Open maintenance logs fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching open maintenance logs: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )
