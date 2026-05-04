import jwt

from api.config import get_settings
from api.schemas.orm.user import User
from api.utils.auth import create_access_token


async def test_agent_token_happy_path(authenticated_client):
    res = await authenticated_client.post(
        "/api/auth/agent-token",
        json={"expires_in_days": 90},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["expires_in_days"] == 90
    assert body["token_type"] == "bearer"

    settings = get_settings()
    payload = jwt.decode(
        body["access_token"], settings.jwt_secret, algorithms=[settings.jwt_algorithm]
    )
    user = await User.find_one(User.email == "test@example.com")
    assert payload["sub"] == str(user.id)

    # New token is interchangeable with a session token
    me = await authenticated_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["email"] == "test@example.com"


async def test_agent_token_default_expiry_30_days(authenticated_client):
    res = await authenticated_client.post("/api/auth/agent-token", json={})
    assert res.status_code == 200
    assert res.json()["expires_in_days"] == 30


async def test_agent_token_clamps_to_max_365(authenticated_client):
    res = await authenticated_client.post(
        "/api/auth/agent-token", json={"expires_in_days": 9999}
    )
    assert res.status_code == 422


async def test_agent_token_requires_auth(client):
    res = await client.post("/api/auth/agent-token", json={"expires_in_days": 7})
    assert res.status_code in (401, 403)


async def test_agent_token_works_for_google_only_user(client):
    """Bearer-auth means a Google-only user (no password) can mint agent tokens too."""
    user = User(
        email="g@example.com",
        username="g@example.com",
        hashed_password=None,
        google_sub="fake-sub",
        email_verified=True,
    )
    await user.insert()

    session_token = create_access_token(str(user.id))
    res = await client.post(
        "/api/auth/agent-token",
        json={"expires_in_days": 30},
        headers={"Authorization": f"Bearer {session_token}"},
    )
    assert res.status_code == 200
    assert res.json()["expires_in_days"] == 30


async def test_openapi_schema_exposed(client):
    res = await client.get("/api/openapi.json")
    assert res.status_code == 200
    schema = res.json()
    assert "paths" in schema
    assert "/api/auth/agent-token" in schema["paths"]
    assert "/api/stocks/{stock_id}/prices/bulk" in schema["paths"]


async def test_schema_convenience_endpoint(client):
    res = await client.get("/api/schema")
    assert res.status_code == 200
    assert "paths" in res.json()
