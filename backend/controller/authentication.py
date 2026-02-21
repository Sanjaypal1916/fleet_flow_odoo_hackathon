from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from auth import jwtToken
from auth.hashing import Hash
from sqlalchemy.orm import Session
from db import database
from models.user import User as Usermodels
router = APIRouter(tags=['Authentication'])


@router.post('/login')
def login(request: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(Usermodels).filter(Usermodels.email == request.username).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Invalid Credentials")
    if not Hash.verify_password(request.password, user.password):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Incorrect password")

    access_token = jwtToken.create_access_token(data={"sub": str(user.id), "role": str(user.role), "email": user.email, "name": user.name})
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}}

@router.post("/logout")
def logout():
    return {
        "success": True,
        "message": "Logged out"
    }