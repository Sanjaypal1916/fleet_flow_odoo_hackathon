from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from models.models import ExpenseLog as ExpenseLogModel, Trip as TripModel, Vehicle as VehicleModel
from schemas import ExpenseLogCreate, ExpenseLogResponse
import schemas
import oauth
from responseFormat import make_response
from datetime import datetime

router = APIRouter(prefix="/expense-logs", tags=["Expense Logs"])


# Helper function to check admin/manager access
def check_admin_manager_access(current_user: schemas.TokenData):
	"""Check if user has ADMIN, MANAGER, or FINANCE role."""
	allowed_roles = ["ADMIN", "MANAGER", "FINANCE"]
	if current_user.role not in allowed_roles:
		return False
	return True


# CREATE - Create a new expense log
@router.post("/create")
def create_expense_log(req: ExpenseLogCreate, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
	"""Create a new expense log (requires ADMIN or MANAGER role)."""
	try:
		# Check authorization
		if not check_admin_manager_access(current_user):
			return make_response(
				data=None,
				message="Access denied. Only ADMIN and MANAGER can create expense logs",
				success=False
			)

		if req.trip_id is None:
			return make_response(
				data=None,
				message="Trip ID is required to create an expense log",
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

		# Get vehicle_id from trip (every trip has an associated vehicle)
		vehicle_id = trip.vehicle_id
		vehicle = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
		if not vehicle:
			return make_response(
				data=None,
				message="Vehicle not found for the specified trip",
				success=False
			)

		expense_log = ExpenseLogModel(
			vehicle_id=vehicle_id,
			trip_id=req.trip_id,
			expense_type=req.expense_type,
			amount=req.amount,
			description=req.description,
			date=req.date if req.date else datetime.now()
		)

		# Add expense amount to vehicle acquisition_cost
		vehicle.acquisition_cost += req.amount

		db.add(expense_log)
		db.commit()
		db.refresh(expense_log)

		return make_response(
			data=ExpenseLogResponse.from_orm(expense_log).dict(),
			message="Expense log created successfully",
			success=True
		)
	except Exception as e:
		db.rollback()
		print(f"Error creating expense log: {e}")
		return make_response(
			data=None,
			message=str(e),
			success=False
		)


# READ - Get all expense logs
@router.get("/all")
def get_all_expense_logs(db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
	"""Get all expense logs (requires authentication)."""
	try:
		logs = db.query(ExpenseLogModel).all()
		if not logs:
			return make_response(data=[], message="No expense logs found", success=True)

		return make_response(
			data=[ExpenseLogResponse.from_orm(log).dict() for log in logs],
			message="Expense logs fetched successfully",
			success=True
		)
	except Exception as e:
		print(f"Error fetching expense logs: {e}")
		return make_response(
			data=None,
			message=str(e),
			success=False
		)


# READ - Get expense log by ID
@router.get("/{expense_log_id}")
def get_expense_log_by_id(expense_log_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
	"""Get an expense log by ID (requires authentication)."""
	try:
		log = db.query(ExpenseLogModel).filter(ExpenseLogModel.id == expense_log_id).first()
		if not log:
			return make_response(
				data=None,
				message="Expense log not found",
				success=False
			)

		return make_response(
			data=ExpenseLogResponse.from_orm(log).dict(),
			message="Expense log fetched successfully",
			success=True
		)
	except Exception as e:
		print(f"Error fetching expense log: {e}")
		return make_response(
			data=None,
			message=str(e),
			success=False
		)


# READ - Get expense logs by trip ID
@router.get("/trip/{trip_id}")
def get_expense_logs_by_trip(trip_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
	"""Get expense logs for a specific trip (requires authentication)."""
	try:
		logs = db.query(ExpenseLogModel).filter(ExpenseLogModel.trip_id == trip_id).all()
		if not logs:
			return make_response(data=[], message="No expense logs found for this trip", success=True)

		return make_response(
			data=[ExpenseLogResponse.from_orm(log).dict() for log in logs],
			message="Expense logs fetched successfully",
			success=True
		)
	except Exception as e:
		print(f"Error fetching expense logs: {e}")
		return make_response(
			data=None,
			message=str(e),
			success=False
		)


# READ - Get expense logs by vehicle ID
@router.get("/vehicle/{vehicle_id}")
def get_expense_logs_by_vehicle(vehicle_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
	"""Get expense logs for a specific vehicle (requires authentication)."""
	try:
		logs = db.query(ExpenseLogModel).filter(ExpenseLogModel.vehicle_id == vehicle_id).all()
		if not logs:
			return make_response(data=[], message="No expense logs found for this vehicle", success=True)

		return make_response(
			data=[ExpenseLogResponse.from_orm(log).dict() for log in logs],
			message="Expense logs fetched successfully",
			success=True
		)
	except Exception as e:
		print(f"Error fetching expense logs: {e}")
		return make_response(
			data=None,
			message=str(e),
			success=False
		)


# UPDATE - Update an expense log
@router.put("/{expense_log_id}")
def update_expense_log(expense_log_id: int, req: ExpenseLogCreate, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
	"""Update an expense log by ID (requires ADMIN or MANAGER role)."""
	try:
		# Check authorization
		if not check_admin_manager_access(current_user):
			return make_response(
				data=None,
				message="Access denied. Only ADMIN and MANAGER can update expense logs",
				success=False
			)

		log = db.query(ExpenseLogModel).filter(ExpenseLogModel.id == expense_log_id).first()
		if not log:
			return make_response(
				data=None,
				message="Expense log not found",
				success=False
			)

		if req.trip_id is None:
			return make_response(
				data=None,
				message="Trip ID is required to update an expense log",
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

		# Get vehicle_id from trip (every trip has an associated vehicle)
		vehicle_id = trip.vehicle_id
		vehicle = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
		if not vehicle:
			return make_response(
				data=None,
				message="Vehicle not found for the specified trip",
				success=False
			)

		# Update vehicle acquisition_cost: remove old, add new
		old_amount = log.amount or 0
		old_vehicle = db.query(VehicleModel).filter(VehicleModel.id == log.vehicle_id).first()
		if old_vehicle:
			old_vehicle.acquisition_cost -= old_amount

		vehicle.acquisition_cost += req.amount

		# Update fields
		log.vehicle_id = vehicle_id
		log.trip_id = req.trip_id
		log.expense_type = req.expense_type
		log.amount = req.amount
		log.description = req.description
		log.date = req.date if req.date else log.date

		db.commit()
		db.refresh(log)

		return make_response(
			data=ExpenseLogResponse.from_orm(log).dict(),
			message="Expense log updated successfully",
			success=True
		)
	except Exception as e:
		db.rollback()
		print(f"Error updating expense log: {e}")
		return make_response(
			data=None,
			message=str(e),
			success=False
		)


# DELETE - Delete an expense log
@router.delete("/{expense_log_id}")
def delete_expense_log(expense_log_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
	"""Delete an expense log by ID (requires ADMIN or MANAGER role)."""
	try:
		# Check authorization
		if not check_admin_manager_access(current_user):
			return make_response(
				data=None,
				message="Access denied. Only ADMIN and MANAGER can delete expense logs",
				success=False
			)

		log = db.query(ExpenseLogModel).filter(ExpenseLogModel.id == expense_log_id).first()
		if not log:
			return make_response(
				data=None,
				message="Expense log not found",
				success=False
			)

		vehicle = db.query(VehicleModel).filter(VehicleModel.id == log.vehicle_id).first()
		if vehicle:
			vehicle.acquisition_cost -= log.amount

		db.delete(log)
		db.commit()

		return make_response(
			data={"expense_log_id": expense_log_id},
			message="Expense log deleted successfully",
			success=True
		)
	except Exception as e:
		db.rollback()
		print(f"Error deleting expense log: {e}")
		return make_response(
			data=None,
			message=str(e),
			success=False
		)
