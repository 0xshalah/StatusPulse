#!/usr/bin/env python3
"""
StatusPulse — Backend Badge & Health Validation
================================================

Runs via TestSprite CLI --type backend. Asserts:
  - GET /api/badge/<valid-id> returns SVG with correct Content-Type
  - GET /api/badge/<valid-id> with each style+metric variant returns SVG
  - GET /api/health returns healthy
"""
import os
import sys
import requests

BASE_URL = os.environ.get("STATUSPULSE_URL", "https://statuspulse.edgeone.dev").rstrip("/")
API = f"{BASE_URL}/api"
TIMEOUT = 40

def _log(msg, status="INFO"):
    print(f"[{status}] {msg}")

def _get_first_ep_id():
    r = requests.get(f"{API}/status", timeout=TIMEOUT)
    assert r.status_code == 200, "unable to fetch status endpoint"
    eps = r.json().get("endpoints", [])
    if not eps:
        return None
    return eps[0]["id"]

def test_health_endpoint():
    r = requests.get(f"{API}/health", timeout=TIMEOUT)
    _log(f"GET /api/health -> {r.status_code}")
    assert r.status_code == 200, f"expected 200, got {r.status_code}"
    data = r.json()
    assert data.get("status") == "healthy"
    assert data.get("checks", {}).get("database") == "ok"

def test_badge_returns_svg():
    ep_id = _get_first_ep_id()
    if ep_id is None:
        _log("No endpoints available — skipping", "WARN")
        return
    r = requests.get(f"{API}/badge/{ep_id}?style=flat&metric=status", timeout=TIMEOUT)
    _log(f"GET /api/badge/{ep_id} -> {r.status_code}, CT={r.headers.get('Content-Type')}")
    assert r.status_code == 200, f"expected 200, got {r.status_code}"
    assert "image/svg+xml" in r.headers.get("Content-Type", "")
    assert "<svg" in r.text

def test_badge_all_styles_and_metrics():
    ep_id = _get_first_ep_id()
    if ep_id is None:
        _log("No endpoints available — skipping", "WARN")
        return
    styles = ["flat", "plastic", "for-the-badge"]
    metrics = ["status", "uptime", "response_time"]
    for style in styles:
        for metric in metrics:
            url = f"{API}/badge/{ep_id}?style={style}&metric={metric}"
            r = requests.get(url, timeout=TIMEOUT)
            assert r.status_code == 200, f"style={style} metric={metric} -> {r.status_code}"
            assert "image/svg+xml" in r.headers.get("Content-Type", "")
            _log(f"  style={style} metric={metric} -> OK")

TESTS = [
    test_health_endpoint,
    test_badge_returns_svg,
    test_badge_all_styles_and_metrics,
]

def main():
    _log("=" * 72)
    _log(f"StatusPulse Badge & Health Validation  ->  {BASE_URL}")
    _log("=" * 72)
    passed = 0
    for fn in TESTS:
        try:
            fn()
            _log(f"PASS: {fn.__name__}", "SUCCESS")
            passed += 1
        except AssertionError as e:
            _log(f"FAIL: {fn.__name__} — {e}", "ERROR")
        except Exception as e:
            _log(f"ERROR: {fn.__name__} — {e}", "ERROR")
    _log("=" * 72)
    _log(f"TOTAL: {passed}/{len(TESTS)} passed")
    _log("=" * 72)
    return 0 if passed == len(TESTS) else 1

if __name__ == "__main__":
    sys.exit(main())

def main():
    _log("=" * 72)
    _log(f"StatusPulse Badge & 404 Validation  ->  {BASE_URL}")
    _log("=" * 72)
    passed = 0
    for fn in TESTS:
        try:
            fn()
            _log(f"PASS: {fn.__name__}", "SUCCESS")
            passed += 1
        except AssertionError as e:
            _log(f"FAIL: {fn.__name__} — {e}", "ERROR")
        except Exception as e:
            _log(f"ERROR: {fn.__name__} — {e}", "ERROR")
    _log("=" * 72)
    _log(f"TOTAL: {passed}/{len(TESTS)} passed")
    _log("=" * 72)
    return 0 if passed == len(TESTS) else 1

if __name__ == "__main__":
    sys.exit(main())
