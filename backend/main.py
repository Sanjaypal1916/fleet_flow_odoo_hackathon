from fastapi import APIRouter, UploadFile, File, Form, HTTPException, FastAPI
from db.database import engine
from models.models import Base
import stripe
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from controller.user import router as user_router
from controller.authentication import router as auth_router
from controller.vehicles import router as vehicles_router
from controller.drivers import router as drivers_router
from controller.trips import router as trips_router
from controller.maintenance_log import router as maintenance_router
from controller.fuel_log import router as fuel_log_router
from controller.expense_log import router as expense_log_router



origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.on_event("startup")
def startup():
    print("Creating tables...")
    print(Base.metadata.tables.keys())
    Base.metadata.create_all(bind=engine)
    print("Tables created!")

@app.get("/")
def healthcheck():
    return "healthcheck ok"


app.include_router(user_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(vehicles_router, prefix="/api")
app.include_router(drivers_router, prefix="/api")
app.include_router(trips_router, prefix="/api")
app.include_router(maintenance_router, prefix="/api")
app.include_router(fuel_log_router, prefix="/api")
app.include_router(expense_log_router, prefix="/api")

