from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from auth import jwtToken as token 

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")


def get_current_user(data: str = Depends(oauth2_scheme)):
    return token.verify_access_token(data)