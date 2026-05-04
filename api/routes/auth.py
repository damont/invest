import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from api.config import get_settings
from api.schemas.dto.auth import (
    AgentTokenRequest,
    AgentTokenResponse,
    GoogleLoginRequest,
    LoginRequest,
    MessageResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    RegisterResponse,
    ResendVerificationRequest,
    TokenResponse,
    UserRegister,
    UserResponse,
    VerifyEmailRequest,
)
from api.schemas.orm.email_verification import EmailVerificationToken
from api.schemas.orm.password_reset import PasswordResetToken
from api.schemas.orm.user import User
from api.services.email import send_password_reset_email, send_verification_email
from api.utils.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)
router = APIRouter()


async def _create_and_send_verification(user: User) -> None:
    settings = get_settings()
    token = secrets.token_urlsafe(32)
    verification = EmailVerificationToken(
        token=token,
        user_id=str(user.id),
        expires_at=datetime.now(timezone.utc)
        + timedelta(minutes=settings.email_verification_expire_minutes),
    )
    await verification.insert()

    verify_url = f"{settings.frontend_base_url.rstrip('/')}/verify-email/{token}"
    try:
        await send_verification_email(user.email, verify_url)
    except Exception:
        logger.exception("Failed to send verification email to %s", user.email)


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(data: UserRegister):
    existing = await User.find_one(User.email == data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=data.email,
        username=data.email,
        hashed_password=hash_password(data.password),
        display_name=data.name,
        phone=data.phone,
        email_verified=False,
    )
    await user.insert()

    await _create_and_send_verification(user)

    return RegisterResponse(
        message="Account created. Please check your email to verify your address.",
        email=user.email,
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    user = await User.find_one(User.email == data.email)
    if not user or not user.hashed_password or not verify_password(
        data.password, user.hashed_password
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.email_verified is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="email_not_verified",
        )

    if not user.is_active:
        raise HTTPException(status_code=401, detail="User account is disabled")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.post("/verify-email", response_model=TokenResponse)
async def verify_email(data: VerifyEmailRequest):
    verification = await EmailVerificationToken.find_one(
        EmailVerificationToken.token == data.token
    )

    if (
        not verification
        or verification.used_at
        or verification.expires_at < datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token.",
        )

    user = await User.get(verification.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token.",
        )
    if not user.is_active:
        raise HTTPException(status_code=401, detail="User account is disabled")

    verification.used_at = datetime.now(timezone.utc)
    await verification.save()

    user.email_verified = True
    await user.save()

    access_token = create_access_token(str(user.id))
    return TokenResponse(access_token=access_token)


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(data: ResendVerificationRequest):
    message = "If that email is registered and unverified, a new verification link has been sent."

    user = await User.find_one(User.email == data.email)
    if not user or user.email_verified:
        return MessageResponse(message=message)

    user_id = str(user.id)
    existing = await EmailVerificationToken.find(
        EmailVerificationToken.user_id == user_id,
        EmailVerificationToken.used_at == None,  # noqa: E711
    ).to_list()
    for t in existing:
        t.used_at = datetime.now(timezone.utc)
        await t.save()

    await _create_and_send_verification(user)
    return MessageResponse(message=message)


@router.post("/google", response_model=TokenResponse)
async def google_login(data: GoogleLoginRequest):
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google login not configured",
        )

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google auth library not installed",
        )

    try:
        idinfo = google_id_token.verify_oauth2_token(
            data.id_token, google_requests.Request(), settings.google_client_id
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )

    sub = idinfo.get("sub")
    email = idinfo.get("email")
    email_verified = idinfo.get("email_verified", False)
    name = idinfo.get("name") or (email.split("@")[0] if email else None)

    if not sub or not email or not email_verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token missing required claims",
        )

    user = await User.find_one(User.google_sub == sub)

    if not user:
        user = await User.find_one(User.email == email)
        if user:
            user.google_sub = sub
            user.email_verified = True
            await user.save()
        else:
            user = User(
                email=email,
                username=email,
                hashed_password=None,
                display_name=name,
                google_sub=sub,
                email_verified=True,
            )
            await user.insert()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled",
        )

    access_token = create_access_token(str(user.id))
    return TokenResponse(access_token=access_token)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(data: PasswordResetRequest):
    settings = get_settings()
    message = "If that email is registered, a reset link has been sent."

    user = await User.find_one(User.email == data.email)
    if not user:
        return MessageResponse(message=message)

    user_id = str(user.id)
    existing = await PasswordResetToken.find(
        PasswordResetToken.user_id == user_id,
        PasswordResetToken.used_at == None,  # noqa: E711
    ).to_list()
    for t in existing:
        t.used_at = datetime.now(timezone.utc)
        await t.save()

    token = secrets.token_urlsafe(16)
    reset_token = PasswordResetToken(
        token=token,
        user_id=user_id,
        expires_at=datetime.now(timezone.utc)
        + timedelta(minutes=settings.password_reset_expire_minutes),
    )
    await reset_token.insert()

    reset_url = f"{settings.frontend_base_url.rstrip('/')}/reset-password/{token}"
    try:
        await send_password_reset_email(data.email, reset_url)
    except Exception:
        logger.exception("Failed to send password reset email to %s", data.email)

    return MessageResponse(message=message)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(data: PasswordResetConfirm):
    reset_token = await PasswordResetToken.find_one(
        PasswordResetToken.token == data.token
    )

    if (
        not reset_token
        or reset_token.used_at
        or reset_token.expires_at < datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    user = await User.get(reset_token.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    reset_token.used_at = datetime.now(timezone.utc)
    await reset_token.save()

    user.hashed_password = hash_password(data.new_password)
    await user.save()

    return MessageResponse(message="Password has been reset. You can now sign in.")


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse(id=str(user.id), name=user.display_name, email=user.email)


@router.post("/agent-token", response_model=AgentTokenResponse)
async def agent_token(
    data: AgentTokenRequest,
    user: User = Depends(get_current_user),
):
    """Mint a long-lived JWT for the currently-authenticated user.

    Caller must hold a valid session JWT (obtained via /login or /google).
    The new token has the same format and identity — it just lives longer.
    Same JWT format as /login, so agents call the same endpoints the frontend does.
    """
    from datetime import timedelta

    token = create_access_token(
        str(user.id), expires_delta=timedelta(days=data.expires_in_days)
    )
    logger.info(
        "Agent token issued for user %s (%d days)", user.email, data.expires_in_days
    )
    return AgentTokenResponse(
        access_token=token,
        expires_in_days=data.expires_in_days,
    )
