import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pymongo import DESCENDING
from pymongo.errors import DuplicateKeyError

from api.schemas.dto.news import NewsCreate, NewsResponse, NewsUpdate
from api.schemas.dto.price_point import (
    PricePointBulkCreate,
    PricePointCreate,
    PricePointResponse,
)
from api.schemas.dto.stock import StockCreate, StockResponse, StockUpdate
from api.schemas.dto.stock_snapshot import (
    StockSnapshotCreate,
    StockSnapshotResponse,
)
from api.schemas.dto.thesis import (
    AiThesisCreate,
    AiThesisResponse,
    ThesisResponse,
    UserThesisUpdate,
)
from api.schemas.dto.youtube_link import (
    YouTubeLinkCreate,
    YouTubeLinkResponse,
    YouTubeLinkUpdate,
)
from api.schemas.orm.news_item import NewsItem
from api.schemas.orm.price_point import PricePoint
from api.schemas.orm.stock import Stock
from api.schemas.orm.stock_snapshot import StockSnapshot
from api.schemas.orm.thesis import AiThesis, UserThesis
from api.schemas.orm.user import User
from api.schemas.orm.youtube_link import YouTubeLink
from api.utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------- helpers ----------

async def _get_owned_stock(stock_id: str, user: User) -> Stock:
    stock = await Stock.get(stock_id)
    if not stock or stock.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Stock not found")
    return stock


def _stock_to_response(s: Stock) -> StockResponse:
    return StockResponse(
        id=str(s.id),
        ticker=s.ticker,
        name=s.name,
        sector=s.sector,
        exchange=s.exchange,
        related=s.related,
        archived=s.archived,
        pinned=s.pinned,
        sort_order=s.sort_order,
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


def _ai_to_response(a: AiThesis) -> AiThesisResponse:
    return AiThesisResponse(
        id=str(a.id),
        content_md=a.content_md,
        model=a.model,
        version=a.version,
        generated_at=a.generated_at,
    )


# ---------- stocks CRUD ----------

@router.get("", response_model=list[StockResponse])
async def list_stocks(
    include_archived: bool = False,
    user: User = Depends(get_current_user),
):
    q = Stock.find(Stock.user_id == str(user.id))
    if not include_archived:
        q = q.find(Stock.archived == False)  # noqa: E712
    stocks = await q.sort([("pinned", DESCENDING), ("sort_order", 1), ("ticker", 1)]).to_list()
    return [_stock_to_response(s) for s in stocks]


@router.post("", response_model=StockResponse, status_code=201)
async def create_stock(data: StockCreate, user: User = Depends(get_current_user)):
    stock = Stock(
        user_id=str(user.id),
        ticker=data.ticker.upper(),
        name=data.name,
        sector=data.sector,
        exchange=data.exchange,
        related=data.related,
    )
    try:
        await stock.insert()
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Stock already in your watchlist")
    logger.info("Stock %s created by user %s", stock.ticker, user.id)
    return _stock_to_response(stock)


@router.get("/{stock_id}", response_model=StockResponse)
async def get_stock(stock_id: str, user: User = Depends(get_current_user)):
    stock = await _get_owned_stock(stock_id, user)
    return _stock_to_response(stock)


@router.patch("/{stock_id}", response_model=StockResponse)
async def update_stock(
    stock_id: str,
    data: StockUpdate,
    user: User = Depends(get_current_user),
):
    stock = await _get_owned_stock(stock_id, user)
    update = data.model_dump(exclude_unset=True)
    if not update:
        return _stock_to_response(stock)
    for k, v in update.items():
        setattr(stock, k, v)
    stock.updated_at = datetime.now(timezone.utc)
    await stock.save()
    return _stock_to_response(stock)


@router.delete("/{stock_id}", status_code=204)
async def delete_stock(stock_id: str, user: User = Depends(get_current_user)):
    stock = await _get_owned_stock(stock_id, user)
    sid = str(stock.id)
    await UserThesis.find(UserThesis.stock_id == sid).delete()
    await AiThesis.find(AiThesis.stock_id == sid).delete()
    await NewsItem.find(NewsItem.stock_id == sid).delete()
    await PricePoint.find(PricePoint.stock_id == sid).delete()
    await StockSnapshot.find(StockSnapshot.stock_id == sid).delete()
    await YouTubeLink.find(YouTubeLink.stock_id == sid).delete()
    await stock.delete()
    logger.info("Stock %s (%s) deleted by user %s", stock.ticker, sid, user.id)


# ---------- thesis ----------

@router.get("/{stock_id}/thesis", response_model=ThesisResponse)
async def get_thesis(stock_id: str, user: User = Depends(get_current_user)):
    stock = await _get_owned_stock(stock_id, user)
    sid = str(stock.id)

    user_thesis = await UserThesis.find_one(
        UserThesis.stock_id == sid,
        UserThesis.user_id == str(user.id),
    )
    ai_current = (
        await AiThesis.find(AiThesis.stock_id == sid)
        .sort([("version", DESCENDING)])
        .limit(1)
        .to_list()
    )

    return ThesisResponse(
        user_md=user_thesis.content_md if user_thesis else "",
        user_updated_at=user_thesis.updated_at if user_thesis else None,
        ai=_ai_to_response(ai_current[0]) if ai_current else None,
    )


@router.put("/{stock_id}/thesis", response_model=ThesisResponse)
async def update_user_thesis(
    stock_id: str,
    data: UserThesisUpdate,
    user: User = Depends(get_current_user),
):
    stock = await _get_owned_stock(stock_id, user)
    sid = str(stock.id)

    user_thesis = await UserThesis.find_one(
        UserThesis.stock_id == sid,
        UserThesis.user_id == str(user.id),
    )
    now = datetime.now(timezone.utc)
    if user_thesis:
        user_thesis.content_md = data.content_md
        user_thesis.updated_at = now
        await user_thesis.save()
    else:
        user_thesis = UserThesis(
            stock_id=sid,
            user_id=str(user.id),
            content_md=data.content_md,
            updated_at=now,
        )
        await user_thesis.insert()

    logger.info("UserThesis updated for stock %s by user %s", sid, user.id)
    return await get_thesis(stock_id, user)


@router.post(
    "/{stock_id}/ai-thesis",
    response_model=AiThesisResponse,
    status_code=201,
)
async def create_ai_thesis(
    stock_id: str,
    data: AiThesisCreate,
    user: User = Depends(get_current_user),
):
    """Append a new AI thesis version. Phase 10 will swap to API-key auth."""
    stock = await _get_owned_stock(stock_id, user)
    sid = str(stock.id)

    latest = (
        await AiThesis.find(AiThesis.stock_id == sid)
        .sort([("version", DESCENDING)])
        .limit(1)
        .to_list()
    )
    next_version = (latest[0].version + 1) if latest else 1

    ai = AiThesis(
        stock_id=sid,
        content_md=data.content_md,
        model=data.model,
        version=next_version,
    )
    await ai.insert()
    logger.info(
        "AiThesis v%d inserted for stock %s (model=%s)", next_version, sid, data.model
    )
    return _ai_to_response(ai)


# ---------- news ----------

def _news_to_response(n: NewsItem) -> NewsResponse:
    return NewsResponse(
        id=str(n.id),
        headline=n.headline,
        source=n.source,
        url=n.url,
        summary=n.summary,
        published_at=n.published_at,
        tag=n.tag,
        sentiment=n.sentiment,
        relevance_score=n.relevance_score,
        is_read=n.is_read,
        ingested_at=n.ingested_at,
    )


@router.get("/{stock_id}/news", response_model=list[NewsResponse])
async def list_news(
    stock_id: str,
    tag: str | None = None,
    unread_only: bool = False,
    limit: int = 50,
    user: User = Depends(get_current_user),
):
    stock = await _get_owned_stock(stock_id, user)
    q = NewsItem.find(NewsItem.stock_id == str(stock.id))
    if tag in ("recent", "long_term"):
        q = q.find(NewsItem.tag == tag)
    if unread_only:
        q = q.find(NewsItem.is_read == False)  # noqa: E712
    items = await q.sort([("published_at", DESCENDING), ("ingested_at", DESCENDING)]).limit(limit).to_list()
    return [_news_to_response(n) for n in items]


@router.post(
    "/{stock_id}/news",
    response_model=NewsResponse,
    status_code=201,
)
async def create_news(
    stock_id: str,
    data: NewsCreate,
    user: User = Depends(get_current_user),
):
    """Phase 10 will swap to API-key auth."""
    stock = await _get_owned_stock(stock_id, user)
    item = NewsItem(stock_id=str(stock.id), **data.model_dump())
    try:
        await item.insert()
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="News URL already ingested for this stock")
    return _news_to_response(item)


@router.patch("/{stock_id}/news/{news_id}", response_model=NewsResponse)
async def update_news(
    stock_id: str,
    news_id: str,
    data: NewsUpdate,
    user: User = Depends(get_current_user),
):
    stock = await _get_owned_stock(stock_id, user)
    item = await NewsItem.get(news_id)
    if not item or item.stock_id != str(stock.id):
        raise HTTPException(status_code=404, detail="News item not found")
    update = data.model_dump(exclude_unset=True)
    for k, v in update.items():
        setattr(item, k, v)
    if update:
        await item.save()
    return _news_to_response(item)


@router.delete("/{stock_id}/news/{news_id}", status_code=204)
async def delete_news(
    stock_id: str,
    news_id: str,
    user: User = Depends(get_current_user),
):
    stock = await _get_owned_stock(stock_id, user)
    item = await NewsItem.get(news_id)
    if not item or item.stock_id != str(stock.id):
        raise HTTPException(status_code=404, detail="News item not found")
    await item.delete()


# ---------- prices ----------

def _pp_to_response(p: PricePoint) -> PricePointResponse:
    return PricePointResponse(
        id=str(p.id),
        date=p.date,
        open=p.open,
        close=p.close,
        high=p.high,
        low=p.low,
        volume=p.volume,
        captured_at=p.captured_at,
    )


@router.get("/{stock_id}/prices", response_model=list[PricePointResponse])
async def list_prices(
    stock_id: str,
    limit: int = 365,
    user: User = Depends(get_current_user),
):
    stock = await _get_owned_stock(stock_id, user)
    items = (
        await PricePoint.find(PricePoint.stock_id == str(stock.id))
        .sort([("date", DESCENDING)])
        .limit(limit)
        .to_list()
    )
    return [_pp_to_response(p) for p in items]


@router.post(
    "/{stock_id}/prices",
    response_model=PricePointResponse,
    status_code=201,
)
async def create_price_point(
    stock_id: str,
    data: PricePointCreate,
    user: User = Depends(get_current_user),
):
    """Phase 10 will swap to API-key auth."""
    stock = await _get_owned_stock(stock_id, user)
    pp = PricePoint(stock_id=str(stock.id), **data.model_dump())
    try:
        await pp.insert()
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Price for that date already recorded")
    return _pp_to_response(pp)


@router.post("/{stock_id}/prices/bulk", response_model=dict)
async def bulk_upsert_prices(
    stock_id: str,
    data: PricePointBulkCreate,
    user: User = Depends(get_current_user),
):
    """Idempotent bulk upsert by (stock_id, date). Phase 10 will swap to API-key auth."""
    stock = await _get_owned_stock(stock_id, user)
    sid = str(stock.id)
    inserted = 0
    updated = 0
    now = datetime.now(timezone.utc)
    for pt in data.points:
        existing = await PricePoint.find_one(
            PricePoint.stock_id == sid,
            PricePoint.date == pt.date,
        )
        if existing:
            existing.open = pt.open
            existing.close = pt.close
            existing.high = pt.high
            existing.low = pt.low
            existing.volume = pt.volume
            existing.captured_at = now
            await existing.save()
            updated += 1
        else:
            await PricePoint(stock_id=sid, **pt.model_dump()).insert()
            inserted += 1
    return {"inserted": inserted, "updated": updated}


# ---------- snapshot (current vitals) ----------

def _snap_to_response(s: StockSnapshot) -> StockSnapshotResponse:
    return StockSnapshotResponse(
        id=str(s.id),
        captured_at=s.captured_at,
        price=s.price,
        market_cap=s.market_cap,
        pe_ratio=s.pe_ratio,
        eps=s.eps,
        dividend_yield=s.dividend_yield,
        beta=s.beta,
        high_52w=s.high_52w,
        low_52w=s.low_52w,
        high_all_time=s.high_all_time,
        low_all_time=s.low_all_time,
        avg_volume_30d=s.avg_volume_30d,
        shares_outstanding=s.shares_outstanding,
    )


@router.get("/{stock_id}/snapshot", response_model=StockSnapshotResponse | None)
async def get_latest_snapshot(stock_id: str, user: User = Depends(get_current_user)):
    stock = await _get_owned_stock(stock_id, user)
    items = (
        await StockSnapshot.find(StockSnapshot.stock_id == str(stock.id))
        .sort([("captured_at", DESCENDING)])
        .limit(1)
        .to_list()
    )
    return _snap_to_response(items[0]) if items else None


@router.get("/{stock_id}/snapshots", response_model=list[StockSnapshotResponse])
async def list_snapshots(
    stock_id: str,
    limit: int = 30,
    user: User = Depends(get_current_user),
):
    stock = await _get_owned_stock(stock_id, user)
    items = (
        await StockSnapshot.find(StockSnapshot.stock_id == str(stock.id))
        .sort([("captured_at", DESCENDING)])
        .limit(limit)
        .to_list()
    )
    return [_snap_to_response(s) for s in items]


@router.post(
    "/{stock_id}/snapshot",
    response_model=StockSnapshotResponse,
    status_code=201,
)
async def create_snapshot(
    stock_id: str,
    data: StockSnapshotCreate,
    user: User = Depends(get_current_user),
):
    """Phase 10 will swap to API-key auth."""
    stock = await _get_owned_stock(stock_id, user)
    snap = StockSnapshot(stock_id=str(stock.id), **data.model_dump(exclude_none=False))
    await snap.insert()
    return _snap_to_response(snap)


# ---------- youtube ----------

def _yt_to_response(y: YouTubeLink) -> YouTubeLinkResponse:
    return YouTubeLinkResponse(
        id=str(y.id),
        title=y.title,
        url=y.url,
        channel=y.channel,
        notes=y.notes,
        duration_seconds=y.duration_seconds,
        watched=y.watched,
        published_at=y.published_at,
        curated_at=y.curated_at,
    )


@router.get("/{stock_id}/youtube", response_model=list[YouTubeLinkResponse])
async def list_youtube(stock_id: str, user: User = Depends(get_current_user)):
    stock = await _get_owned_stock(stock_id, user)
    items = (
        await YouTubeLink.find(YouTubeLink.stock_id == str(stock.id))
        .sort([("published_at", DESCENDING), ("curated_at", DESCENDING)])
        .to_list()
    )
    return [_yt_to_response(y) for y in items]


@router.post(
    "/{stock_id}/youtube",
    response_model=YouTubeLinkResponse,
    status_code=201,
)
async def create_youtube(
    stock_id: str,
    data: YouTubeLinkCreate,
    user: User = Depends(get_current_user),
):
    """Phase 10 will swap to API-key auth."""
    stock = await _get_owned_stock(stock_id, user)
    item = YouTubeLink(stock_id=str(stock.id), **data.model_dump())
    try:
        await item.insert()
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="YouTube URL already added for this stock")
    return _yt_to_response(item)


@router.patch("/{stock_id}/youtube/{link_id}", response_model=YouTubeLinkResponse)
async def update_youtube(
    stock_id: str,
    link_id: str,
    data: YouTubeLinkUpdate,
    user: User = Depends(get_current_user),
):
    stock = await _get_owned_stock(stock_id, user)
    item = await YouTubeLink.get(link_id)
    if not item or item.stock_id != str(stock.id):
        raise HTTPException(status_code=404, detail="YouTube link not found")
    update = data.model_dump(exclude_unset=True)
    for k, v in update.items():
        setattr(item, k, v)
    if update:
        await item.save()
    return _yt_to_response(item)


@router.delete("/{stock_id}/youtube/{link_id}", status_code=204)
async def delete_youtube(
    stock_id: str,
    link_id: str,
    user: User = Depends(get_current_user),
):
    stock = await _get_owned_stock(stock_id, user)
    item = await YouTubeLink.get(link_id)
    if not item or item.stock_id != str(stock.id):
        raise HTTPException(status_code=404, detail="YouTube link not found")
    await item.delete()
