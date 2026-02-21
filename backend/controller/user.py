from fastapi import Response
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from models.user import User as UserModel
from models.contact import Contact as ContactModel
from schemas import User, UserResponse
from auth.hashing import Hash
from auth import jwtToken as token
import schemas
import oauth
from utils.emailsender import EmailService

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/create", response_model=UserResponse)
def create_user(req: User,  response : Response,db: Session = Depends(get_db)):
    try:
        existing_user = db.query(UserModel).filter(UserModel.email == req.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        if req.mobile:
            existing_mobile = db.query(UserModel).filter(UserModel.mobile == req.mobile).first()
            if existing_mobile:
                raise HTTPException(status_code=400, detail="Mobile number already registered")

        contact = ContactModel(
        name=req.name,
        type=req.contact_type,
        email=req.email,
        mobile=req.mobile,
        city=req.city,
        state=req.state,
        pincode=req.pincode
        )

        db.add(contact)
        db.flush()  # generates contact.id without commit

        user = UserModel(
            name=req.name,
            email=req.email,
            password=Hash.hash_password(req.password),
            role=req.role,
            mobile=req.mobile,
            contact_id=contact.id
        )

        db.add(user)
        db.commit()

        EmailService.send_email(
            to=["sanjudada1916@gmail.com"],
            subject="Welcome to ApparelDesk!",
            body=f"Hi {req.name},\n\nWelcome to ApparelDesk! Your account has been created successfully."
        )

        
        access_token = token.create_access_token(
            data={
                "sub": str(user.id),
                "role": str(user.role),
                "email": user.email,
                "name": user.name
            }
        )

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,      # True in HTTPS
            samesite="lax",
            max_age=60 * 60
        )



        return {
            "succes" : True,
            "message": "User created and logged in successfully",
            "user": user
        }
    

        
    except Exception as e:
        print("Error creating user:", e)
        raise HTTPException(status_code=500, 
                            detail = f"""Internal Server Error: {str(e)}""")
    


@router.get("/getAllUsers")
def get_all_users(db: Session = Depends(get_db),  current_user: schemas.User = Depends(oauth.get_current_user)):
    try:
        print(f"Current user: {current_user}")
        users = db.query(UserModel).all()
        if not users:
            raise HTTPException(status_code=404, detail="No users found")
        return users
    except Exception as e:
        print("Error fetching users:", e)
        raise HTTPException(status_code=500, 
                            detail = f"""Internal Server Error: {str(e)}""")

@router.get("/getUserByEmail", response_model=UserResponse, )
def get_user_by_email(email: str, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(oauth.get_current_user)):
    try:
        print(f"Current user: {current_user}")
        current_user_id = current_user.user_id
        user = db.query(UserModel).filter(UserModel.id == current_user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except Exception as e:
        print("Error fetching user by email:", e)
        raise HTTPException(status_code=500, 
                            detail = f"""Internal Server Error: {str(e)}""")
    
@router.get("/getUserById/{user_id}", response_model=UserResponse)
def get_user_by_id(user_id: str, db: Session = Depends(get_db)):
    try:
        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except Exception as e:
        print("Error fetching user by ID:", e)
        raise HTTPException(status_code=500, 
                            detail = f"""Internal Server Error: {str(e)}""")

@router.put("/updateUser/{user_id}", response_model=UserResponse)
def update_user(user_id: str, req: User, db: Session = Depends(get_db)):
    try:
        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Update contact details
        contact = user.contact
        contact.name = req.name
        contact.type = req.contact_type
        contact.email = req.email
        contact.mobile = req.mobile
        contact.city = req.city
        contact.state = req.state
        contact.pincode = req.pincode

        # Update user details
        user.name = req.name
        user.email = req.email
        user.password = req.password
        user.role = req.role
        user.mobile = req.mobile

        db.commit()
        db.refresh(user)
        return user
        
    except Exception as e:
        print("Error updating user:", e)
        raise HTTPException(status_code=500, 
                            detail = f"""Internal Server Error: {str(e)}""")


