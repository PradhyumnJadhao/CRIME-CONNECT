"""
Authentication API routes for Crime-Connect backend.
Handles user registration, login, and profile.
"""

import logging
import json
import requests
from pathlib import Path
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, HTTPException, status, Depends
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.pg_database import get_pg_db
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

class GoogleLoginRequest(BaseModel):
    """Request model for Google login."""
    token: str

class RegisterRequest(BaseModel):
    """Request model for user registration."""
    username: str
    email: EmailStr
    password: str


class RegisterResponse(BaseModel):
    """Response model for registration."""
    username: str
    email: str
    message: str


class LoginRequest(BaseModel):
    """Request model for user login."""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Response model for login."""
    access_token: str
    token_type: str
    email: str


@router.post("/google-login", response_model=LoginResponse)
async def google_login(request: GoogleLoginRequest, db: Session = Depends(get_pg_db)) -> LoginResponse:
    """Login/Register with Google."""
    try:
        # Check if it's a JWT (ID Token) or an Access Token
        # JWTs start with 'ey'
        if request.token.startswith("ey"):
            # Load client ID from secret file
            with open(settings.google_client_secret_path, "r") as f:
                secret_data = json.load(f)
                client_id = secret_data["web"]["client_id"]

            # Verify Google ID Token
            idinfo = id_token.verify_oauth2_token(
                request.token, 
                google_requests.Request(), 
                client_id
            )
            email = idinfo['email']
            name = idinfo.get('name', email.split('@')[0])
        else:
            # Assume it's an Access Token and fetch user info from Google's endpoint
            response = requests.get(f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={request.token}")
            if response.status_code != 200:
                raise Exception("Failed to fetch user info from Google using access token")
            
            user_data = response.json()
            email = user_data['email']
            name = user_data.get('name', email.split('@')[0])

        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Create new user for Google login
            logger.info(f"Creating new user from Google login: {email}")
            user = User(
                name=name,
                email=email,
                hashed_password=hash_password(f"google-auth-{email}"), # Dummy pass
                role="user"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Create JWT token for Crime-Connect
        access_token = create_access_token(data={"sub": user.email, "name": user.name, "role": user.role})
        logger.info(f"User logged in via Google: {email}")
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            email=user.email,
        )

    except Exception as e:
        logger.error(f"Google login failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google authentication failed: {str(e)}",
        )


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: Session = Depends(get_pg_db)) -> RegisterResponse:
    """Register a new user."""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        logger.warning(f"Registration attempt with existing email: {request.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    try:
        hashed_pwd = hash_password(request.password)
        new_user = User(
            name=request.username,
            email=request.email,
            hashed_password=hashed_pwd,
            role="user"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"New user registered: {request.email}")
        return RegisterResponse(
            username=new_user.name,
            email=new_user.email,
            message="User registered successfully",
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed",
        )


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_pg_db)) -> LoginResponse:
    """User login - returns JWT access token."""
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        logger.warning(f"Login attempt with non-existent email: {request.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(request.password, user.hashed_password):
        logger.warning(f"Failed login attempt for: {request.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    try:
        # Create JWT token. Includes sub, name, and role for convenience.
        access_token = create_access_token(data={"sub": user.email, "name": user.name, "role": user.role})
        logger.info(f"User logged in: {request.email}")
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            email=user.email,
        )
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed",
        )

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_pg_db)):
    """Get current user details."""
    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at
    }
