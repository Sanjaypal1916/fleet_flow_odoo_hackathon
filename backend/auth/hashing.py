from passlib.context import CryptContext
import hashlib

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class Hash(): 
    @staticmethod
    def hash_password(password: str) -> str:
        # sha256_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        # sha256_hash = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
        return pwd_context.verify(plain_password, hashed_password)