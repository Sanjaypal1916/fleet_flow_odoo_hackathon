from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import get_db
from models.models import Driver as DriverModel, LicenseCategory
from schemas import DriverCreate, DriverUpdate, DriverResponse
import schemas
import oauth
from responseFormat import make_response
from typing import List

router = APIRouter(prefix="/drivers", tags=["Drivers"])


# Helper function to check admin/manager access
def check_admin_manager_access(current_user: schemas.TokenData):
    """Check if user has ADMIN or MANAGER role."""
    allowed_roles = ["ADMIN", "MANAGER","SAFETY" ]
    if current_user.role not in allowed_roles:
        return False
    return True


def normalize_license_category(driver: DriverModel) -> bool:
    """Normalize license_category to valid enum values; returns True if updated."""
    allowed_categories = {lc.value for lc in LicenseCategory}
    if not driver.license_category:
        return False

    normalized = str(driver.license_category).upper()
    if normalized in allowed_categories and driver.license_category != normalized:
        driver.license_category = normalized
        return True
    return False


# CREATE - Create a new driver
@router.post("/create")
def create_driver(req: DriverCreate, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Create a new driver (requires ADMIN or MANAGER role)."""
    try:
        # Check authorization
        if not check_admin_manager_access(current_user):
            return make_response(
                data=None,
                message="Access denied. Only ADMIN and MANAGER can create drivers",
                success=False
            )

        # Check if license_number already exists
        existing_driver = db.query(DriverModel).filter(DriverModel.license_number == req.license_number).first()
        if existing_driver:
            return make_response(
                data=None,
                message="Driver with this license number already exists",
                success=False
            )

        # Create new driver
        driver = DriverModel(
            name=req.name,
            license_number=req.license_number,
            license_category=req.license_category.value,
            license_expiry_date=req.license_expiry_date,
            status=req.status.value if req.status else "ON_DUTY",
            safety_score=req.safety_score if req.safety_score is not None else 100.0,
            complaints=req.complaints if req.complaints is not None else 0
        )

        db.add(driver)
        db.commit()
        db.refresh(driver)

        return make_response(
            data=DriverResponse.from_orm(driver).dict(),
            message="Driver created successfully",
            success=True
        )

    except Exception as e:
        db.rollback()
        print(f"Error creating driver: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# READ - Get all drivers
@router.get("/all")
def get_all_drivers(db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get all drivers (requires authentication)."""
    try:
        drivers = db.query(DriverModel).all()
        if not drivers:
            return make_response(data=[], message="No drivers found", success=True)
        
        updated = False
        for driver in drivers:
            if normalize_license_category(driver):
                updated = True

        if updated:
            db.commit()

        return make_response(
            data=[DriverResponse.from_orm(driver).dict() for driver in drivers],
            message="Drivers fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching drivers: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# READ - Get driver by ID
@router.get("/{driver_id}")
def get_driver_by_id(driver_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get a driver by ID (requires authentication)."""
    try:
        driver = db.query(DriverModel).filter(DriverModel.id == driver_id).first()
        if not driver:
            return make_response(
                data=None,
                message="Driver not found",
                success=False
            )

        if normalize_license_category(driver):
            db.commit()
            db.refresh(driver)

        return make_response(
            data=DriverResponse.from_orm(driver).dict(),
            message="Driver fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching driver: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# UPDATE - Update a driver
@router.put("/{driver_id}")
def update_driver(driver_id: int, req: DriverUpdate, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Update a driver by ID (requires ADMIN or MANAGER role)."""
    try:
        # Check authorization
        if not check_admin_manager_access(current_user):
            return make_response(
                data=None,
                message="Access denied. Only ADMIN and MANAGER can update drivers",
                success=False
            )

        driver = db.query(DriverModel).filter(DriverModel.id == driver_id).first()
        if not driver:
            return make_response(
                data=None,
                message="Driver not found",
                success=False
            )

        # Update fields if provided
        if req.name is not None:
            driver.name = req.name
        if req.license_number is not None:
            # Check if new license_number already exists
            existing_driver = db.query(DriverModel).filter(
                DriverModel.license_number == req.license_number,
                DriverModel.id != driver_id
            ).first()
            if existing_driver:
                return make_response(
                    data=None,
                    message="License number already in use",
                    success=False
                )
            driver.license_number = req.license_number
        if req.license_category is not None:
            driver.license_category = req.license_category.value
        if req.license_expiry_date is not None:
            driver.license_expiry_date = req.license_expiry_date
        if req.status is not None:
            driver.status = req.status.value
        if req.safety_score is not None:
            driver.safety_score = req.safety_score
        if req.complaints is not None:
            driver.complaints = req.complaints

        db.commit()
        db.refresh(driver)

        return make_response(
            data=DriverResponse.from_orm(driver).dict(),
            message="Driver updated successfully",
            success=True
        )
    except Exception as e:
        db.rollback()
        print(f"Error updating driver: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# DELETE - Delete a driver
@router.delete("/{driver_id}")
def delete_driver(driver_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Delete a driver by ID (requires ADMIN or MANAGER role)."""
    try:
        # Check authorization
        if not check_admin_manager_access(current_user):
            return make_response(
                data=None,
                message="Access denied. Only ADMIN and MANAGER can delete drivers",
                success=False
            )

        driver = db.query(DriverModel).filter(DriverModel.id == driver_id).first()
        if not driver:
            return make_response(
                data=None,
                message="Driver not found",
                success=False
            )

        db.delete(driver)
        db.commit()

        return make_response(
            data={"driver_id": driver_id},
            message="Driver deleted successfully",
            success=True
        )
    except Exception as e:
        db.rollback()
        print(f"Error deleting driver: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )
