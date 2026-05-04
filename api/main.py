import logging
from contextlib import asynccontextmanager

from beanie import init_beanie
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from api.config import get_settings
from api.routes import auth, stocks
from api.schemas.orm.email_verification import EmailVerificationToken
from api.schemas.orm.news_item import NewsItem
from api.schemas.orm.password_reset import PasswordResetToken
from api.schemas.orm.price_point import PricePoint
from api.schemas.orm.stock import Stock
from api.schemas.orm.stock_snapshot import StockSnapshot
from api.schemas.orm.thesis import AiThesis, UserThesis
from api.schemas.orm.user import User
from api.schemas.orm.youtube_link import YouTubeLink

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongodb_url, tz_aware=True)
    await init_beanie(
        database=client[settings.mongodb_db_name],
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
    logger.info("Connected to MongoDB database: %s", settings.mongodb_db_name)
    yield
    client.close()
    logger.info("Disconnected from MongoDB")


app = FastAPI(
    title="invest API",
    description="Personal stock thesis dashboard — used by the frontend and by openclaw agent jobs.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/agent",           # Swagger UI for agent discovery
    openapi_url="/api/openapi.json", # Machine-readable schema
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/schema")
async def get_schema():
    """Convenience GET that returns the OpenAPI schema — same data as /api/openapi.json."""
    return app.openapi()
