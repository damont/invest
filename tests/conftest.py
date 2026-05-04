import os

import pytest
from beanie import init_beanie
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient

from api.main import app
from api.schemas.orm.email_verification import EmailVerificationToken
from api.schemas.orm.news_item import NewsItem
from api.schemas.orm.password_reset import PasswordResetToken
from api.schemas.orm.price_point import PricePoint
from api.schemas.orm.stock import Stock
from api.schemas.orm.stock_snapshot import StockSnapshot
from api.schemas.orm.thesis import AiThesis, UserThesis
from api.schemas.orm.user import User
from api.schemas.orm.youtube_link import YouTubeLink
from api.utils.auth import create_access_token, hash_password

TEST_DB_NAME = "invest_test"
MONGODB_URL = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
async def setup_test_db():
    client = AsyncIOMotorClient(MONGODB_URL, tz_aware=True)
    await init_beanie(
        database=client[TEST_DB_NAME],
        document_models=[
            User,
            PasswordResetToken,
            EmailVerificationToken,
            Stock,
            UserThesis,
            AiThesis,
            NewsItem,
            PricePoint,
            StockSnapshot,
            YouTubeLink,
        ],
    )
    yield
    await client.drop_database(TEST_DB_NAME)
    client.close()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def _make_user(email: str, password: str = "testpass123", verified: bool = True) -> User:
    user = User(
        email=email,
        username=email,
        hashed_password=hash_password(password),
        display_name=email.split("@")[0],
        email_verified=verified,
    )
    await user.insert()
    return user


@pytest.fixture
async def authenticated_client(client: AsyncClient):
    user = await _make_user("test@example.com")
    token = create_access_token(str(user.id))
    client.headers["Authorization"] = f"Bearer {token}"
    yield client


@pytest.fixture
async def make_user():
    """Factory fixture so tests can create additional users (e.g. for ownership tests)."""
    return _make_user


@pytest.fixture
async def auth_header_for():
    """Returns a function that creates a user and returns an Authorization header."""
    async def _make(email: str = "other@example.com") -> dict[str, str]:
        user = await _make_user(email)
        token = create_access_token(str(user.id))
        return {"Authorization": f"Bearer {token}"}
    return _make
