async def _create_stock(c, ticker="GOOG", **extra):
    payload = {"ticker": ticker, "name": f"{ticker} Inc"}
    payload.update(extra)
    res = await c.post("/api/stocks", json=payload)
    assert res.status_code == 201, res.text
    return res.json()


async def test_create_and_list_stock(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="goog", related=[
        {"ticker": "MSFT", "name": "Microsoft", "relation": "competitor"}
    ])
    assert s["ticker"] == "GOOG"  # uppercased
    assert s["pinned"] is False
    assert s["archived"] is False
    assert s["related"][0]["ticker"] == "MSFT"

    res = await authenticated_client.get("/api/stocks")
    assert res.status_code == 200
    assert len(res.json()) == 1


async def test_duplicate_ticker_per_user_rejected(authenticated_client):
    await _create_stock(authenticated_client, ticker="GOOG")
    res = await authenticated_client.post(
        "/api/stocks", json={"ticker": "GOOG", "name": "dup"}
    )
    assert res.status_code == 409


async def test_stocks_require_auth(client):
    res = await client.get("/api/stocks")
    assert res.status_code in (401, 403)


async def test_users_only_see_own_stocks(authenticated_client, auth_header_for):
    await _create_stock(authenticated_client, ticker="GOOG")

    other_headers = await auth_header_for("other@example.com")
    res = await authenticated_client.get("/api/stocks", headers=other_headers)
    assert res.status_code == 200
    assert res.json() == []


async def test_get_other_users_stock_returns_404(authenticated_client, auth_header_for):
    s = await _create_stock(authenticated_client, ticker="GOOG")
    other_headers = await auth_header_for("o2@example.com")
    res = await authenticated_client.get(f"/api/stocks/{s['id']}", headers=other_headers)
    assert res.status_code == 404


async def test_patch_stock_pin_archive_sort(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="GOOG")
    res = await authenticated_client.patch(
        f"/api/stocks/{s['id']}", json={"pinned": True, "sort_order": 5}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["pinned"] is True
    assert body["sort_order"] == 5

    # archive -> hidden by default
    await authenticated_client.patch(f"/api/stocks/{s['id']}", json={"archived": True})
    visible = await authenticated_client.get("/api/stocks")
    assert visible.json() == []
    all_stocks = await authenticated_client.get("/api/stocks?include_archived=true")
    assert len(all_stocks.json()) == 1


async def test_pinned_sorts_first(authenticated_client):
    a = await _create_stock(authenticated_client, ticker="AAA")
    await _create_stock(authenticated_client, ticker="BBB")
    await authenticated_client.patch(f"/api/stocks/{a['id']}", json={"pinned": True})
    res = await authenticated_client.get("/api/stocks")
    tickers = [s["ticker"] for s in res.json()]
    assert tickers[0] == "AAA"


async def test_user_thesis_upsert(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="GOOG")
    sid = s["id"]

    # initial GET — empty
    initial = await authenticated_client.get(f"/api/stocks/{sid}/thesis")
    assert initial.status_code == 200
    assert initial.json()["user_md"] == ""
    assert initial.json()["ai"] is None

    # PUT (insert)
    res = await authenticated_client.put(
        f"/api/stocks/{sid}/thesis", json={"content_md": "v1"}
    )
    assert res.status_code == 200
    assert res.json()["user_md"] == "v1"

    # PUT (update)
    res2 = await authenticated_client.put(
        f"/api/stocks/{sid}/thesis", json={"content_md": "v2"}
    )
    assert res2.json()["user_md"] == "v2"


async def test_ai_thesis_versioning(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="GOOG")
    sid = s["id"]
    r1 = await authenticated_client.post(
        f"/api/stocks/{sid}/ai-thesis",
        json={"content_md": "first", "model": "claude-opus-4-7"},
    )
    r2 = await authenticated_client.post(
        f"/api/stocks/{sid}/ai-thesis", json={"content_md": "second"}
    )
    assert r1.json()["version"] == 1
    assert r2.json()["version"] == 2

    # GET thesis returns the latest as `ai`
    combined = await authenticated_client.get(f"/api/stocks/{sid}/thesis")
    assert combined.json()["ai"]["version"] == 2
    assert combined.json()["ai"]["content_md"] == "second"


async def test_news_create_patch_delete(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="GOOG")
    sid = s["id"]
    r = await authenticated_client.post(
        f"/api/stocks/{sid}/news",
        json={
            "headline": "Beat earnings",
            "source": "Reuters",
            "url": "https://r/x",
            "sentiment": "bullish",
            "relevance_score": 0.9,
        },
    )
    assert r.status_code == 201
    nid = r.json()["id"]
    assert r.json()["is_read"] is False

    # duplicate URL -> 409
    dup = await authenticated_client.post(
        f"/api/stocks/{sid}/news",
        json={"headline": "x", "source": "y", "url": "https://r/x"},
    )
    assert dup.status_code == 409

    patched = await authenticated_client.patch(
        f"/api/stocks/{sid}/news/{nid}", json={"is_read": True}
    )
    assert patched.json()["is_read"] is True

    # filter unread_only after marking read -> empty
    unread = await authenticated_client.get(
        f"/api/stocks/{sid}/news?unread_only=true"
    )
    assert unread.json() == []

    deleted = await authenticated_client.delete(f"/api/stocks/{sid}/news/{nid}")
    assert deleted.status_code == 204


async def test_prices_bulk_idempotent(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="GOOG")
    sid = s["id"]
    payload = {
        "points": [
            {"date": "2026-05-01", "open": 170, "close": 172, "high": 173, "low": 169, "volume": 12000000},
            {"date": "2026-05-02", "open": 172, "close": 175, "high": 176, "low": 171, "volume": 13500000},
        ]
    }
    r1 = await authenticated_client.post(f"/api/stocks/{sid}/prices/bulk", json=payload)
    assert r1.json() == {"inserted": 2, "updated": 0}

    payload["points"][1]["close"] = 999
    r2 = await authenticated_client.post(f"/api/stocks/{sid}/prices/bulk", json=payload)
    assert r2.json() == {"inserted": 0, "updated": 2}

    listed = await authenticated_client.get(f"/api/stocks/{sid}/prices")
    assert listed.status_code == 200
    rows = listed.json()
    assert len(rows) == 2
    # most recent first
    assert rows[0]["date"] == "2026-05-02"
    assert rows[0]["close"] == 999


async def test_prices_single_duplicate_rejected(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="GOOG")
    sid = s["id"]
    pt = {"date": "2026-05-01", "open": 1, "close": 1, "high": 1, "low": 1, "volume": 1}
    a = await authenticated_client.post(f"/api/stocks/{sid}/prices", json=pt)
    assert a.status_code == 201
    b = await authenticated_client.post(f"/api/stocks/{sid}/prices", json=pt)
    assert b.status_code == 409


async def test_snapshot_latest_after_multiple(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="GOOG")
    sid = s["id"]
    empty = await authenticated_client.get(f"/api/stocks/{sid}/snapshot")
    assert empty.status_code == 200
    assert empty.json() is None

    await authenticated_client.post(
        f"/api/stocks/{sid}/snapshot", json={"price": 100.0, "pe_ratio": 20.0}
    )
    await authenticated_client.post(
        f"/api/stocks/{sid}/snapshot", json={"price": 110.0, "pe_ratio": 22.0}
    )
    latest = await authenticated_client.get(f"/api/stocks/{sid}/snapshot")
    assert latest.json()["price"] == 110.0

    history = await authenticated_client.get(f"/api/stocks/{sid}/snapshots")
    assert len(history.json()) == 2


async def test_youtube_create_patch_delete(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="GOOG")
    sid = s["id"]
    r = await authenticated_client.post(
        f"/api/stocks/{sid}/youtube",
        json={"title": "deep dive", "url": "https://yt/abc", "duration_seconds": 1800},
    )
    assert r.status_code == 201
    yid = r.json()["id"]
    assert r.json()["watched"] is False

    patched = await authenticated_client.patch(
        f"/api/stocks/{sid}/youtube/{yid}", json={"watched": True, "notes": "great"}
    )
    assert patched.json()["watched"] is True
    assert patched.json()["notes"] == "great"

    deleted = await authenticated_client.delete(f"/api/stocks/{sid}/youtube/{yid}")
    assert deleted.status_code == 204


async def test_delete_stock_cascades(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="GOOG")
    sid = s["id"]
    await authenticated_client.put(f"/api/stocks/{sid}/thesis", json={"content_md": "x"})
    await authenticated_client.post(
        f"/api/stocks/{sid}/ai-thesis", json={"content_md": "ai"}
    )
    await authenticated_client.post(
        f"/api/stocks/{sid}/news",
        json={"headline": "h", "source": "s", "url": "https://u/1"},
    )
    await authenticated_client.post(
        f"/api/stocks/{sid}/prices",
        json={"date": "2026-05-01", "open": 1, "close": 1, "high": 1, "low": 1, "volume": 1},
    )
    await authenticated_client.post(
        f"/api/stocks/{sid}/snapshot", json={"price": 1.0}
    )
    await authenticated_client.post(
        f"/api/stocks/{sid}/youtube", json={"title": "t", "url": "https://yt/1"}
    )

    res = await authenticated_client.delete(f"/api/stocks/{sid}")
    assert res.status_code == 204

    # All cascaded — verify via raw collections
    from api.schemas.orm.news_item import NewsItem
    from api.schemas.orm.price_point import PricePoint
    from api.schemas.orm.stock_snapshot import StockSnapshot
    from api.schemas.orm.thesis import AiThesis, UserThesis
    from api.schemas.orm.youtube_link import YouTubeLink

    assert await UserThesis.find(UserThesis.stock_id == sid).count() == 0
    assert await AiThesis.find(AiThesis.stock_id == sid).count() == 0
    assert await NewsItem.find(NewsItem.stock_id == sid).count() == 0
    assert await PricePoint.find(PricePoint.stock_id == sid).count() == 0
    assert await StockSnapshot.find(StockSnapshot.stock_id == sid).count() == 0
    assert await YouTubeLink.find(YouTubeLink.stock_id == sid).count() == 0


# ---------- thesis recent_change ----------

async def test_ai_thesis_recent_change_carries_over(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="NVDA")
    sid = s["id"]
    # v1 with a recent_change set explicitly
    r1 = await authenticated_client.post(
        f"/api/stocks/{sid}/ai-thesis",
        json={"content_md": "v1 body", "recent_change": "Initial conviction set"},
    )
    assert r1.status_code == 201
    assert r1.json()["recent_change"] == "Initial conviction set"
    assert r1.json()["recent_change_at"] is not None

    # v2 without recent_change in payload — should carry over from v1
    r2 = await authenticated_client.post(
        f"/api/stocks/{sid}/ai-thesis", json={"content_md": "v2 body"}
    )
    assert r2.json()["version"] == 2
    assert r2.json()["recent_change"] == "Initial conviction set"
    # Mongo truncates to ms — compare on the second.
    assert r2.json()["recent_change_at"][:19] == r1.json()["recent_change_at"][:19]


async def test_ai_thesis_recent_change_explicit_overrides_carryover(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="NVDA")
    sid = s["id"]
    await authenticated_client.post(
        f"/api/stocks/{sid}/ai-thesis",
        json={"content_md": "v1", "recent_change": "old"},
    )
    r2 = await authenticated_client.post(
        f"/api/stocks/{sid}/ai-thesis",
        json={"content_md": "v2", "recent_change": "new note"},
    )
    assert r2.json()["recent_change"] == "new note"


async def test_ai_thesis_recent_change_explicit_null_clears(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="NVDA")
    sid = s["id"]
    await authenticated_client.post(
        f"/api/stocks/{sid}/ai-thesis",
        json={"content_md": "v1", "recent_change": "old"},
    )
    r2 = await authenticated_client.post(
        f"/api/stocks/{sid}/ai-thesis",
        json={"content_md": "v2", "recent_change": None},
    )
    assert r2.json()["recent_change"] is None
    assert r2.json()["recent_change_at"] is None


async def test_patch_recent_change_endpoint(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="NVDA")
    sid = s["id"]
    await authenticated_client.post(
        f"/api/stocks/{sid}/ai-thesis", json={"content_md": "v1"}
    )
    res = await authenticated_client.patch(
        f"/api/stocks/{sid}/ai-thesis/recent-change",
        json={"recent_change": "Upgraded after Q1 beat"},
    )
    assert res.status_code == 200
    assert res.json()["recent_change"] == "Upgraded after Q1 beat"
    assert res.json()["recent_change_at"] is not None
    assert res.json()["version"] == 1  # still latest


async def test_patch_recent_change_404_when_no_thesis(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="NVDA")
    sid = s["id"]
    res = await authenticated_client.patch(
        f"/api/stocks/{sid}/ai-thesis/recent-change",
        json={"recent_change": "x"},
    )
    assert res.status_code == 404


async def test_patch_recent_change_other_user_404(authenticated_client, auth_header_for):
    s = await _create_stock(authenticated_client, ticker="NVDA")
    sid = s["id"]
    await authenticated_client.post(
        f"/api/stocks/{sid}/ai-thesis", json={"content_md": "v1"}
    )
    other_headers = await auth_header_for("other@example.com")
    res = await authenticated_client.patch(
        f"/api/stocks/{sid}/ai-thesis/recent-change",
        json={"recent_change": "x"},
        headers=other_headers,
    )
    assert res.status_code == 404


# ---------- dashboard ----------

async def test_dashboard_empty(authenticated_client):
    res = await authenticated_client.get("/api/stocks/dashboard")
    assert res.status_code == 200
    assert res.json() == {"stocks": []}


async def test_dashboard_requires_auth(client):
    res = await client.get("/api/stocks/dashboard")
    assert res.status_code in (401, 403)


async def test_dashboard_aggregates_stock_data(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="NVDA")
    sid = s["id"]

    # Snapshot
    await authenticated_client.post(
        f"/api/stocks/{sid}/snapshot",
        json={"price": 100.0, "market_cap": 2.5e12, "pe_ratio": 50.0, "avg_volume_30d": 4e8},
    )
    # Two prices to compute % change
    await authenticated_client.post(
        f"/api/stocks/{sid}/prices",
        json={"date": "2026-05-04", "open": 95, "close": 100, "high": 101, "low": 94, "volume": 1},
    )
    await authenticated_client.post(
        f"/api/stocks/{sid}/prices",
        json={"date": "2026-05-05", "open": 100, "close": 105, "high": 106, "low": 99, "volume": 1},
    )
    # Thesis with a recent_change
    await authenticated_client.post(
        f"/api/stocks/{sid}/ai-thesis",
        json={"content_md": "thesis", "recent_change": "Upgraded"},
    )
    # News + youtube
    await authenticated_client.post(
        f"/api/stocks/{sid}/news",
        json={"headline": "Beat earnings", "source": "Reuters", "url": "https://r/1"},
    )
    await authenticated_client.post(
        f"/api/stocks/{sid}/youtube",
        json={"title": "Why NVDA", "url": "https://yt/abc", "channel": "Foo"},
    )

    res = await authenticated_client.get("/api/stocks/dashboard")
    assert res.status_code == 200
    payload = res.json()
    assert len(payload["stocks"]) == 1
    item = payload["stocks"][0]
    assert item["stock"]["ticker"] == "NVDA"
    assert item["snapshot"]["price"] == 100.0
    assert item["spark"] == [100.0, 105.0]
    assert item["change_pct"] == 5.0
    assert item["thesis"]["recent_change"] == "Upgraded"
    assert item["latest_news"]["headline"] == "Beat earnings"
    assert item["latest_video"]["title"] == "Why NVDA"


async def test_dashboard_excludes_archived_and_other_users(authenticated_client, auth_header_for):
    # Owned, archived (should not appear)
    s_arch = await _create_stock(authenticated_client, ticker="ARCH")
    await authenticated_client.patch(
        f"/api/stocks/{s_arch['id']}", json={"archived": True}
    )
    # Owned, active
    await _create_stock(authenticated_client, ticker="ACT")
    # Other user's stock (should not appear)
    other_headers = await auth_header_for("other@example.com")
    await authenticated_client.post(
        "/api/stocks", json={"ticker": "OTHR", "name": "Other Inc"}, headers=other_headers
    )

    res = await authenticated_client.get("/api/stocks/dashboard")
    tickers = [item["stock"]["ticker"] for item in res.json()["stocks"]]
    assert tickers == ["ACT"]


async def test_dashboard_skips_watched_youtube(authenticated_client):
    s = await _create_stock(authenticated_client, ticker="NVDA")
    sid = s["id"]
    yt = await authenticated_client.post(
        f"/api/stocks/{sid}/youtube",
        json={"title": "Old", "url": "https://yt/old"},
    )
    await authenticated_client.patch(
        f"/api/stocks/{sid}/youtube/{yt.json()['id']}", json={"watched": True}
    )
    res = await authenticated_client.get("/api/stocks/dashboard")
    item = res.json()["stocks"][0]
    assert item["latest_video"] is None
