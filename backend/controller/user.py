from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import get_db
from models.models import User as UserModel
from schemas import UserCreate, UserUpdate, UserResponse
from auth.hashing import Hash
from auth import jwtToken as token
import schemas
import oauth
from utils.emailsender import EmailService
from responseFormat import make_response
from typing import List

router = APIRouter(prefix="/users", tags=["Users"])


# CREATE
@router.post("/create")
def create_user(req: UserCreate, db: Session = Depends(get_db)):
    """Create a new user."""    
    try:
        # Check if email already exists
        existing_user = db.query(UserModel).filter(UserModel.email == req.email).first()
        if existing_user:
            return make_response(
                data=None,
                message="Email already registered",
                success=False
            )

        # Create new user
        hashed_password = Hash.hash_password(req.password)
        user = UserModel(
            name=req.name,
            email=req.email,
            password_hash=hashed_password,
            role=req.role.value if req.role else "MANAGER",
            is_active=True
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        # Send welcome email
        try:
            EmailService.send_email(
                to=[req.email],
                subject="Welcome to FleetFlow!",
                body=f"Hi {req.name},\n\nWelcome to FleetFlow! Your account has been created successfully."
            )
        except Exception as e:
            print(f"Email send failed: {e}")

        return make_response(
            data=UserResponse.from_orm(user).dict(),
            message="User created successfully",
            success=True
        )

    except Exception as e:
        db.rollback()
        print(f"Error creating user: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# READ - Get all users
@router.get("/all")
def get_all_users(db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get all users (requires authentication and ADMIN/MANAGER role)."""
    try:
        # Check authorization - only ADMIN and MANAGER can access
        allowed_roles = ["ADMIN", "MANAGER"]
        if current_user.role not in allowed_roles:
            return make_response(
                data=None,
                message="Access denied. Only ADMIN and MANAGER can view all users",
                success=False
            )

        users = db.query(UserModel).all()
        if not users:
            return make_response(data=[], message="No users found", success=True)
        
        return make_response(
            data=[UserResponse.from_orm(user).dict() for user in users],
            message="Users fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching users: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# READ - Get user by ID
@router.get("/{user_id}")
def get_user_by_id(user_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Get a user by ID (requires authentication and ADMIN/MANAGER role)."""
    try:
        # Check authorization - only ADMIN and MANAGER can access, or the user's own profile
        allowed_roles = ["ADMIN", "MANAGER"]
        if current_user.role not in allowed_roles:
            return make_response(
                data=None,
                message="Access denied. Only ADMIN and MANAGER can view user details",
                success=False
            )

        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user:
            return make_response(
                data=None,
                message="User not found",
                success=False
            )

        return make_response(
            data=UserResponse.from_orm(user).dict(),
            message="User fetched successfully",
            success=True
        )
    except Exception as e:
        print(f"Error fetching user: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# READ - Get current user profile
@router.get("/profile/me")
def get_current_user(current_user: schemas.TokenData = Depends(oauth.get_current_user), db: Session = Depends(get_db)):
    """Get current authenticated user's profile."""
    try:
        user = db.query(UserModel).filter(UserModel.id == current_user.user_id).first()
        if not user:
            return make_response(
                data=None,
                message="User not found",
                success=False
            )

        return make_response(
            data=UserResponse.from_orm(user).dict(),
            message="Current user profile fetched",
            success=True
        )
    except Exception as e:
        print(f"Error fetching current user: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# UPDATE
@router.put("/{user_id}")
def update_user(user_id: int, req: UserUpdate, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Update a user by ID (requires authentication and authorization)."""
    try:
        # Check authorization (can only update own profile unless admin)
        if current_user.user_id != user_id:
            return make_response(
                data=None,
                message="Not authorized to update this user",
                success=False
            )

        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user:
            return make_response(
                data=None,
                message="User not found",
                success=False
            )

        # Update fields if provided
        if req.name is not None:
            user.name = req.name
        if req.email is not None:
            # Check if new email already exists
            existing_email = db.query(UserModel).filter(
                UserModel.email == req.email,
                UserModel.id != user_id
            ).first()
            if existing_email:
                return make_response(
                    data=None,
                    message="Email already in use",
                    success=False
                )
            user.email = req.email
        if req.password is not None:
            user.password_hash = Hash.hash_password(req.password)
        if req.role is not None:
            user.role = req.role.value

        db.commit()
        db.refresh(user)

        return make_response(
            data=UserResponse.from_orm(user).dict(),
            message="User updated successfully",
            success=True
        )
    except Exception as e:
        db.rollback()
        print(f"Error updating user: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )


# DELETE
@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    """Delete a user by ID (requires authentication and authorization)."""
    try:
        # Check authorization (can only delete own account unless admin)
        if current_user.user_id != user_id:
            return make_response(
                data=None,
                message="Not authorized to delete this user",
                success=False
            )

        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user:
            return make_response(
                data=None,
                message="User not found",
                success=False
            )

        db.delete(user)
        db.commit()

        return make_response(
            data={"user_id": user_id},
            message="User deleted successfully",
            success=True
        )
    except Exception as e:
        db.rollback()
        print(f"Error deleting user: {e}")
        return make_response(
            data=None,
            message=str(e),
            success=False
        )