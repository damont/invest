from api.schemas.orm.email_verification import EmailVerificationToken
from api.schemas.orm.password_reset import PasswordResetToken
from api.schemas.orm.user import User


async def test_health_check(client):
    res = await client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


async def test_register_creates_unverified_user(client):
    res = await client.post(
        "/api/auth/register",
        json={"name": "New", "email": "new@example.com", "password": "password123"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["email"] == "new@example.com"
    # No token issued — user must verify first.
    assert "access_token" not in body

    user = await User.find_one(User.email == "new@example.com")
    assert user is not None
    assert user.email_verified is False


async def test_register_duplicate_email_rejected(client):
    payload = {"name": "Dup", "email": "dup@example.com", "password": "password123"}
    await client.post("/api/auth/register", json=payload)
    res = await client.post("/api/auth/register", json=payload)
    assert res.status_code == 400


async def test_login_unverified_returns_email_not_verified(client):
    await client.post(
        "/api/auth/register",
        json={"name": "U", "email": "unv@example.com", "password": "password123"},
    )
    res = await client.post(
        "/api/auth/login",
        json={"email": "unv@example.com", "password": "password123"},
    )
    assert res.status_code == 403
    assert res.json()["detail"] == "email_not_verified"


async def test_verify_email_then_login(client):
    await client.post(
        "/api/auth/register",
        json={"name": "V", "email": "v@example.com", "password": "password123"},
    )
    user = await User.find_one(User.email == "v@example.com")
    token_doc = await EmailVerificationToken.find_one(
        EmailVerificationToken.user_id == str(user.id)
    )
    assert token_doc is not None

    verify_res = await client.post(
        "/api/auth/verify-email", json={"token": token_doc.token}
    )
    assert verify_res.status_code == 200
    assert "access_token" in verify_res.json()

    login_res = await client.post(
        "/api/auth/login",
        json={"email": "v@example.com", "password": "password123"},
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


async def test_verify_email_bad_token(client):
    res = await client.post("/api/auth/verify-email", json={"token": "nope"})
    assert res.status_code == 400


async def test_login_bad_password(client, make_user):
    await make_user("bad@example.com")
    res = await client.post(
        "/api/auth/login",
        json={"email": "bad@example.com", "password": "wrong"},
    )
    assert res.status_code == 401


async def test_me_requires_auth(client):
    res = await client.get("/api/auth/me")
    assert res.status_code in (401, 403)


async def test_me_returns_current_user(authenticated_client):
    res = await authenticated_client.get("/api/auth/me")
    assert res.status_code == 200
    body = res.json()
    assert body["email"] == "test@example.com"
    assert "id" in body


async def test_resend_verification_idempotent_response(client):
    # Registers + emits a token
    await client.post(
        "/api/auth/register",
        json={"name": "R", "email": "r@example.com", "password": "password123"},
    )
    res = await client.post(
        "/api/auth/resend-verification", json={"email": "r@example.com"}
    )
    assert res.status_code == 200
    # Same generic message for unknown emails (no enumeration)
    res2 = await client.post(
        "/api/auth/resend-verification", json={"email": "nobody@example.com"}
    )
    assert res2.status_code == 200
    assert res.json()["message"] == res2.json()["message"]


async def test_forgot_and_reset_password(client, make_user):
    await make_user("reset@example.com", password="oldpass123")

    forgot = await client.post(
        "/api/auth/forgot-password", json={"email": "reset@example.com"}
    )
    assert forgot.status_code == 200

    user = await User.find_one(User.email == "reset@example.com")
    rt = await PasswordResetToken.find_one(PasswordResetToken.user_id == str(user.id))
    assert rt is not None

    reset = await client.post(
        "/api/auth/reset-password",
        json={"token": rt.token, "new_password": "newpass123"},
    )
    assert reset.status_code == 200

    # Old password fails, new password works
    bad = await client.post(
        "/api/auth/login",
        json={"email": "reset@example.com", "password": "oldpass123"},
    )
    assert bad.status_code == 401
    good = await client.post(
        "/api/auth/login",
        json={"email": "reset@example.com", "password": "newpass123"},
    )
    assert good.status_code == 200
