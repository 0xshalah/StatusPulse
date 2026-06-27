#!/usr/bin/env python3
"""
StatusPulse v2 Backend API Test Suite
Tests all backend routes with MongoDB + UUID ids
"""
import requests
import time
import json
import sys

BASE_URL = "https://endpoint-status-3.preview.emergentagent.com/api"

def log(msg, status="INFO"):
    print(f"[{status}] {msg}")

def test_seed_idempotent():
    """Test 1: POST /api/seed - idempotent seeding"""
    log("Testing POST /api/seed (idempotent)...")
    try:
        # First call
        r1 = requests.post(f"{BASE_URL}/seed", timeout=30)
        log(f"First seed call: {r1.status_code} - {r1.text[:200]}")
        assert r1.status_code == 200, f"Expected 200, got {r1.status_code}"
        data1 = r1.json()
        assert "seeded" in data1, "Missing 'seeded' field"
        assert "count" in data1, "Missing 'count' field"
        
        # Second call - should be idempotent
        r2 = requests.post(f"{BASE_URL}/seed", timeout=30)
        log(f"Second seed call: {r2.status_code} - {r2.text[:200]}")
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
        data2 = r2.json()
        assert data2["seeded"] == False, "Second call should return seeded:false"
        
        log("✅ PASS: POST /api/seed is idempotent", "SUCCESS")
        return True
    except Exception as e:
        log(f"❌ FAIL: POST /api/seed - {str(e)}", "ERROR")
        return False

def test_rollups():
    """Test 2: POST /api/rollups"""
    log("Testing POST /api/rollups...")
    try:
        r = requests.post(f"{BASE_URL}/rollups", timeout=30)
        log(f"Rollups response: {r.status_code} - {r.text[:200]}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("rollups") == True, "Expected {rollups:true}"
        
        log("✅ PASS: POST /api/rollups", "SUCCESS")
        return True
    except Exception as e:
        log(f"❌ FAIL: POST /api/rollups - {str(e)}", "ERROR")
        return False

def test_cron_ping():
    """Test 3: POST /api/cron/ping - interval-aware scheduler"""
    log("Testing POST /api/cron/ping...")
    try:
        r = requests.post(f"{BASE_URL}/cron/ping", timeout=30)
        log(f"Cron ping response: {r.status_code} - {r.text[:200]}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "ok" in data, "Missing 'ok' field"
        assert data["ok"] == True, "Expected ok:true"
        assert "due" in data, "Missing 'due' field"
        assert "total" in data, "Missing 'total' field"
        assert isinstance(data["due"], int), "due should be integer"
        assert isinstance(data["total"], int), "total should be integer"
        log(f"Cron ping: due={data['due']}, total={data['total']}")
        
        log("✅ PASS: POST /api/cron/ping", "SUCCESS")
        return True
    except Exception as e:
        log(f"❌ FAIL: POST /api/cron/ping - {str(e)}", "ERROR")
        return False

def test_dashboard():
    """Test 4: GET /api/dashboard"""
    log("Testing GET /api/dashboard...")
    try:
        r = requests.get(f"{BASE_URL}/dashboard", timeout=30)
        log(f"Dashboard response: {r.status_code} - {r.text[:300]}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        
        # Check structure
        assert "endpoints" in data, "Missing 'endpoints' field"
        assert "health" in data, "Missing 'health' field"
        assert isinstance(data["endpoints"], list), "endpoints should be array"
        
        # Check health structure
        health = data["health"]
        required_health_keys = ["up", "degraded", "down", "maintenance", "paused", "total", "healthy"]
        for key in required_health_keys:
            assert key in health, f"Missing health.{key}"
        
        # Verify healthy = up + degraded
        expected_healthy = health["up"] + health["degraded"]
        assert health["healthy"] == expected_healthy, f"healthy should be {expected_healthy}, got {health['healthy']}"
        
        # Check endpoint structure
        if data["endpoints"]:
            ep = data["endpoints"][0]
            assert "verdict" in ep, "Endpoint missing 'verdict'"
            assert "pings" in ep, "Endpoint missing 'pings'"
            assert "uptime24h" in ep, "Endpoint missing 'uptime24h'"
            assert "paused" in ep, "Endpoint missing 'paused'"
            assert isinstance(ep["pings"], list), "pings should be array"
            assert len(ep["pings"]) <= 30, "pings should be max 30"
            assert "_id" not in ep, "Endpoint should not have MongoDB _id"
        
        log(f"Dashboard: {len(data['endpoints'])} endpoints, health={health}")
        log("✅ PASS: GET /api/dashboard", "SUCCESS")
        return True
    except Exception as e:
        log(f"❌ FAIL: GET /api/dashboard - {str(e)}", "ERROR")
        return False

def test_status():
    """Test 5: GET /api/status"""
    log("Testing GET /api/status...")
    try:
        r = requests.get(f"{BASE_URL}/status", timeout=30)
        log(f"Status response: {r.status_code} - {r.text[:300]}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        
        # Check top-level structure
        assert "endpoints" in data, "Missing 'endpoints'"
        assert "incidents" in data, "Missing 'incidents'"
        assert "overall" in data, "Missing 'overall'"
        assert "health" in data, "Missing 'health'"
        assert "updatedAt" in data, "Missing 'updatedAt'"
        
        # Check endpoint structure
        if data["endpoints"]:
            ep = data["endpoints"][0]
            assert "heatmap" in ep, "Endpoint missing 'heatmap'"
            assert "uptime" in ep, "Endpoint missing 'uptime'"
            assert isinstance(ep["heatmap"], list), "heatmap should be array"
            assert len(ep["heatmap"]) == 30, f"heatmap should have 30 items, got {len(ep['heatmap'])}"
            
            # Check heatmap structure
            hm = ep["heatmap"][0]
            assert "date" in hm, "Heatmap item missing 'date'"
            assert "uptime" in hm, "Heatmap item missing 'uptime'"
            
            # Check uptime structure
            uptime = ep["uptime"]
            assert "h24" in uptime, "Missing uptime.h24"
            assert "d7" in uptime, "Missing uptime.d7"
            assert "d30" in uptime, "Missing uptime.d30"
        
        log(f"Status: {len(data['endpoints'])} endpoints, {len(data['incidents'])} incidents, overall={data['overall']}")
        log("✅ PASS: GET /api/status", "SUCCESS")
        return True
    except Exception as e:
        log(f"❌ FAIL: GET /api/status - {str(e)}", "ERROR")
        return False

def test_endpoints_list():
    """Test 6: GET /api/endpoints"""
    log("Testing GET /api/endpoints...")
    try:
        r = requests.get(f"{BASE_URL}/endpoints", timeout=30)
        log(f"Endpoints list response: {r.status_code} - {r.text[:300]}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        
        assert isinstance(data, list), "Response should be array"
        if data:
            ep = data[0]
            required_keys = ["id", "name", "url", "expectedStatus", "interval"]
            for key in required_keys:
                assert key in ep, f"Endpoint missing '{key}'"
            assert "_id" not in ep, "Endpoint should not have MongoDB _id"
        
        log(f"Endpoints list: {len(data)} endpoints")
        log("✅ PASS: GET /api/endpoints", "SUCCESS")
        return data  # Return for use in other tests
    except Exception as e:
        log(f"❌ FAIL: GET /api/endpoints - {str(e)}", "ERROR")
        return None

def test_endpoint_detail(endpoint_id):
    """Test 7: GET /api/endpoints/{id}/detail"""
    log(f"Testing GET /api/endpoints/{endpoint_id}/detail...")
    try:
        r = requests.get(f"{BASE_URL}/endpoints/{endpoint_id}/detail", timeout=30)
        log(f"Endpoint detail response: {r.status_code} - {r.text[:300]}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        
        # Check required keys
        required_keys = ["endpoint", "verdict", "history", "heatmap", "incidents", "percentiles", "uptime"]
        for key in required_keys:
            assert key in data, f"Missing '{key}'"
        
        # Check arrays
        assert isinstance(data["history"], list), "history should be array"
        assert isinstance(data["heatmap"], list), "heatmap should be array"
        assert isinstance(data["incidents"], list), "incidents should be array"
        assert len(data["heatmap"]) == 30, f"heatmap should have 30 items, got {len(data['heatmap'])}"
        
        # Check percentiles
        perc = data["percentiles"]
        assert "p50" in perc, "Missing percentiles.p50"
        assert "p95" in perc, "Missing percentiles.p95"
        assert "p99" in perc, "Missing percentiles.p99"
        
        # Check uptime
        uptime = data["uptime"]
        assert "h24" in uptime, "Missing uptime.h24"
        assert "d7" in uptime, "Missing uptime.d7"
        assert "d30" in uptime, "Missing uptime.d30"
        
        log(f"Endpoint detail: verdict={data['verdict']}, {len(data['history'])} history items")
        log("✅ PASS: GET /api/endpoints/{id}/detail", "SUCCESS")
        return True
    except Exception as e:
        log(f"❌ FAIL: GET /api/endpoints/{endpoint_id}/detail - {str(e)}", "ERROR")
        return False

def test_endpoint_test(endpoint_id):
    """Test 8: POST /api/endpoints/{id}/test"""
    log(f"Testing POST /api/endpoints/{endpoint_id}/test...")
    try:
        r = requests.post(f"{BASE_URL}/endpoints/{endpoint_id}/test", timeout=30)
        log(f"Endpoint test response: {r.status_code} - {r.text[:300]}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        
        assert "ping" in data, "Missing 'ping' field"
        ping = data["ping"]
        required_keys = ["statusCode", "responseTime", "verdict"]
        for key in required_keys:
            assert key in ping, f"Ping missing '{key}'"
        
        log(f"Endpoint test: statusCode={ping['statusCode']}, responseTime={ping['responseTime']}ms, verdict={ping['verdict']}")
        log("✅ PASS: POST /api/endpoints/{id}/test", "SUCCESS")
        return True
    except Exception as e:
        log(f"❌ FAIL: POST /api/endpoints/{endpoint_id}/test - {str(e)}", "ERROR")
        return False

def test_pause_toggle(endpoint_id):
    """Test 9: POST /api/endpoints/{id}/pause"""
    log(f"Testing POST /api/endpoints/{endpoint_id}/pause...")
    try:
        # Pause endpoint
        r1 = requests.post(f"{BASE_URL}/endpoints/{endpoint_id}/pause", 
                          json={"paused": True}, timeout=30)
        log(f"Pause response: {r1.status_code} - {r1.text[:200]}")
        assert r1.status_code == 200, f"Expected 200, got {r1.status_code}"
        data1 = r1.json()
        assert data1.get("paused") == True, "Expected paused:true"
        
        # Check dashboard shows paused verdict
        time.sleep(1)
        r_dash = requests.get(f"{BASE_URL}/dashboard", timeout=30)
        dash = r_dash.json()
        ep = next((e for e in dash["endpoints"] if e["id"] == endpoint_id), None)
        assert ep is not None, "Endpoint not found in dashboard"
        assert ep["verdict"] == "paused", f"Expected verdict='paused', got '{ep['verdict']}'"
        log(f"Dashboard confirms verdict='paused'")
        
        # Unpause endpoint
        r2 = requests.post(f"{BASE_URL}/endpoints/{endpoint_id}/pause", 
                          json={"paused": False}, timeout=30)
        log(f"Unpause response: {r2.status_code} - {r2.text[:200]}")
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
        data2 = r2.json()
        assert data2.get("paused") == False, "Expected paused:false"
        
        log("✅ PASS: POST /api/endpoints/{id}/pause", "SUCCESS")
        return True
    except Exception as e:
        log(f"❌ FAIL: POST /api/endpoints/{endpoint_id}/pause - {str(e)}", "ERROR")
        return False

def test_maintenance_toggle(endpoint_id):
    """Test 10: POST /api/endpoints/{id}/maintenance"""
    log(f"Testing POST /api/endpoints/{endpoint_id}/maintenance...")
    try:
        # Set maintenance mode
        r1 = requests.post(f"{BASE_URL}/endpoints/{endpoint_id}/maintenance", 
                          json={"maintenance": True}, timeout=30)
        log(f"Maintenance on response: {r1.status_code} - {r1.text[:200]}")
        assert r1.status_code == 200, f"Expected 200, got {r1.status_code}"
        data1 = r1.json()
        assert data1.get("maintenance") == True, "Expected maintenance:true"
        
        # Check dashboard shows maintenance verdict
        time.sleep(1)
        r_dash = requests.get(f"{BASE_URL}/dashboard", timeout=30)
        dash = r_dash.json()
        ep = next((e for e in dash["endpoints"] if e["id"] == endpoint_id), None)
        assert ep is not None, "Endpoint not found in dashboard"
        assert ep["verdict"] == "maintenance", f"Expected verdict='maintenance', got '{ep['verdict']}'"
        log(f"Dashboard confirms verdict='maintenance'")
        
        # Disable maintenance mode
        r2 = requests.post(f"{BASE_URL}/endpoints/{endpoint_id}/maintenance", 
                          json={"maintenance": False}, timeout=30)
        log(f"Maintenance off response: {r2.status_code} - {r2.text[:200]}")
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
        data2 = r2.json()
        assert data2.get("maintenance") == False, "Expected maintenance:false"
        
        log("✅ PASS: POST /api/endpoints/{id}/maintenance", "SUCCESS")
        return True
    except Exception as e:
        log(f"❌ FAIL: POST /api/endpoints/{endpoint_id}/maintenance - {str(e)}", "ERROR")
        return False

def test_test_url():
    """Test 11: POST /api/test-url"""
    log("Testing POST /api/test-url...")
    try:
        # Get initial endpoint count
        r_before = requests.get(f"{BASE_URL}/endpoints", timeout=30)
        count_before = len(r_before.json())
        
        # Test URL
        r = requests.post(f"{BASE_URL}/test-url", 
                         json={"url": "https://api.github.com", "expectedStatus": 200}, 
                         timeout=30)
        log(f"Test URL response: {r.status_code} - {r.text[:300]}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        
        required_keys = ["statusCode", "responseTime", "verdict", "errored", "attempts"]
        for key in required_keys:
            assert key in data, f"Missing '{key}'"
        
        # Verify no new endpoint was created
        r_after = requests.get(f"{BASE_URL}/endpoints", timeout=30)
        count_after = len(r_after.json())
        assert count_after == count_before, f"Endpoint count changed from {count_before} to {count_after}"
        
        log(f"Test URL: statusCode={data['statusCode']}, verdict={data['verdict']}, no endpoint created")
        log("✅ PASS: POST /api/test-url", "SUCCESS")
        return True
    except Exception as e:
        log(f"❌ FAIL: POST /api/test-url - {str(e)}", "ERROR")
        return False

def test_check_duplicate():
    """Test 12: POST /api/check-duplicate"""
    log("Testing POST /api/check-duplicate...")
    try:
        # Check existing URL
        r1 = requests.post(f"{BASE_URL}/check-duplicate", 
                          json={"url": "https://api.github.com"}, 
                          timeout=30)
        log(f"Check duplicate (existing) response: {r1.status_code} - {r1.text[:200]}")
        assert r1.status_code == 200, f"Expected 200, got {r1.status_code}"
        data1 = r1.json()
        assert "exists" in data1, "Missing 'exists' field"
        assert data1["exists"] == True, "Expected exists:true for existing URL"
        
        # Check non-existing URL
        r2 = requests.post(f"{BASE_URL}/check-duplicate", 
                          json={"url": "https://no-such-url-xyz-12345.example"}, 
                          timeout=30)
        log(f"Check duplicate (non-existing) response: {r2.status_code} - {r2.text[:200]}")
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
        data2 = r2.json()
        assert data2["exists"] == False, "Expected exists:false for non-existing URL"
        
        log("✅ PASS: POST /api/check-duplicate", "SUCCESS")
        return True
    except Exception as e:
        log(f"❌ FAIL: POST /api/check-duplicate - {str(e)}", "ERROR")
        return False

def test_subscribe():
    """Test 13: POST /api/subscribe"""
    log("Testing POST /api/subscribe...")
    try:
        # Valid email
        r1 = requests.post(f"{BASE_URL}/subscribe", 
                          json={"email": "test@example.com"}, 
                          timeout=30)
        log(f"Subscribe (valid) response: {r1.status_code} - {r1.text[:200]}")
        assert r1.status_code == 200, f"Expected 200, got {r1.status_code}"
        data1 = r1.json()
        assert data1.get("subscribed") == True, "Expected subscribed:true"
        
        # Invalid email
        r2 = requests.post(f"{BASE_URL}/subscribe", 
                          json={"email": "bad"}, 
                          timeout=30)
        log(f"Subscribe (invalid) response: {r2.status_code} - {r2.text[:200]}")
        assert r2.status_code == 400, f"Expected 400 for invalid email, got {r2.status_code}"
        
        log("✅ PASS: POST /api/subscribe", "SUCCESS")
        return True
    except Exception as e:
        log(f"❌ FAIL: POST /api/subscribe - {str(e)}", "ERROR")
        return False

def test_badge_variants(endpoint_id):
    """Test 14: GET /api/badge/{id} - all variants"""
    log(f"Testing GET /api/badge/{endpoint_id} variants...")
    try:
        styles = ["flat", "plastic", "for-the-badge"]
        metrics = ["status", "uptime", "response_time"]
        passed = 0
        total = 0
        
        # Test all 9 combinations
        for style in styles:
            for metric in metrics:
                total += 1
                url = f"{BASE_URL}/badge/{endpoint_id}?style={style}&metric={metric}"
                r = requests.get(url, timeout=30)
                log(f"Badge {style}/{metric}: {r.status_code}, Content-Type: {r.headers.get('Content-Type')}, size: {len(r.content)} bytes")
                
                try:
                    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
                    assert "image/svg+xml" in r.headers.get("Content-Type", ""), "Expected Content-Type: image/svg+xml"
                    assert "<svg" in r.text, "Response should contain '<svg'"
                    assert "Cache-Control" in r.headers, "Missing Cache-Control header"
                    passed += 1
                except AssertionError as e:
                    log(f"  ❌ Failed: {e}", "ERROR")
        
        # Test with icon
        total += 1
        url = f"{BASE_URL}/badge/{endpoint_id}?style=flat&metric=status&icon=1"
        r = requests.get(url, timeout=30)
        log(f"Badge with icon: {r.status_code}, size: {len(r.content)} bytes")
        try:
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            assert "image/svg+xml" in r.headers.get("Content-Type", ""), "Expected Content-Type: image/svg+xml"
            assert "<svg" in r.text, "Response should contain '<svg'"
            passed += 1
        except AssertionError as e:
            log(f"  ❌ Failed: {e}", "ERROR")
        
        log(f"Badge variants: {passed}/{total} passed")
        if passed == total:
            log("✅ PASS: GET /api/badge/{id} all variants", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: GET /api/badge/{id} - {total - passed} variants failed", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: GET /api/badge/{id} - {str(e)}", "ERROR")
        return False

def test_crud_lifecycle():
    """Test 15: Full CRUD lifecycle"""
    log("Testing full CRUD lifecycle...")
    try:
        # Get initial count
        r_before = requests.get(f"{BASE_URL}/endpoints", timeout=30)
        count_before = len(r_before.json())
        log(f"Initial endpoint count: {count_before}")
        
        # CREATE
        create_data = {
            "name": "QA Test Endpoint",
            "url": "https://httpstat.us/200",
            "expectedStatus": 200,
            "interval": 30
        }
        r_create = requests.post(f"{BASE_URL}/endpoints", json=create_data, timeout=30)
        log(f"CREATE response: {r_create.status_code} - {r_create.text[:300]}")
        assert r_create.status_code == 200, f"Expected 200, got {r_create.status_code}"
        created = r_create.json()
        assert "id" in created, "Missing 'id' in created endpoint"
        endpoint_id = created["id"]
        log(f"Created endpoint with id: {endpoint_id}")
        
        # Verify count increased
        r_after_create = requests.get(f"{BASE_URL}/endpoints", timeout=30)
        count_after_create = len(r_after_create.json())
        assert count_after_create == count_before + 1, f"Expected {count_before + 1} endpoints, got {count_after_create}"
        
        # UPDATE
        time.sleep(1)
        update_data = {"name": "QA Test Endpoint Updated"}
        r_update = requests.put(f"{BASE_URL}/endpoints/{endpoint_id}", json=update_data, timeout=30)
        log(f"UPDATE response: {r_update.status_code} - {r_update.text[:300]}")
        assert r_update.status_code == 200, f"Expected 200, got {r_update.status_code}"
        updated = r_update.json()
        assert updated["name"] == "QA Test Endpoint Updated", "Name not updated"
        log(f"Updated endpoint name")
        
        # DELETE
        time.sleep(1)
        r_delete = requests.delete(f"{BASE_URL}/endpoints/{endpoint_id}", timeout=30)
        log(f"DELETE response: {r_delete.status_code} - {r_delete.text[:200]}")
        assert r_delete.status_code == 200, f"Expected 200, got {r_delete.status_code}"
        deleted = r_delete.json()
        assert deleted.get("deleted") == True, "Expected deleted:true"
        log(f"Deleted endpoint")
        
        # Verify removed from list
        time.sleep(1)
        r_after_delete = requests.get(f"{BASE_URL}/endpoints", timeout=30)
        endpoints_after = r_after_delete.json()
        count_after_delete = len(endpoints_after)
        assert count_after_delete == count_before, f"Expected {count_before} endpoints, got {count_after_delete}"
        assert not any(e["id"] == endpoint_id for e in endpoints_after), "Deleted endpoint still in list"
        
        log("✅ PASS: Full CRUD lifecycle", "SUCCESS")
        return True
    except Exception as e:
        log(f"❌ FAIL: Full CRUD lifecycle - {str(e)}", "ERROR")
        return False

def main():
    log("=" * 80)
    log("StatusPulse v2 Backend API Test Suite")
    log("=" * 80)
    
    results = {}
    
    # Run all tests
    results["seed_idempotent"] = test_seed_idempotent()
    results["rollups"] = test_rollups()
    results["cron_ping"] = test_cron_ping()
    results["dashboard"] = test_dashboard()
    results["status"] = test_status()
    
    endpoints = test_endpoints_list()
    results["endpoints_list"] = endpoints is not None
    
    # Use first endpoint for detail tests
    if endpoints and len(endpoints) > 0:
        test_endpoint_id = endpoints[0]["id"]
        log(f"\nUsing endpoint {test_endpoint_id} for detail tests")
        
        results["endpoint_detail"] = test_endpoint_detail(test_endpoint_id)
        results["endpoint_test"] = test_endpoint_test(test_endpoint_id)
        results["pause_toggle"] = test_pause_toggle(test_endpoint_id)
        results["maintenance_toggle"] = test_maintenance_toggle(test_endpoint_id)
        results["badge_variants"] = test_badge_variants(test_endpoint_id)
    else:
        log("⚠️  No endpoints available for detail tests", "WARNING")
        results["endpoint_detail"] = False
        results["endpoint_test"] = False
        results["pause_toggle"] = False
        results["maintenance_toggle"] = False
        results["badge_variants"] = False
    
    results["test_url"] = test_test_url()
    results["check_duplicate"] = test_check_duplicate()
    results["subscribe"] = test_subscribe()
    results["crud_lifecycle"] = test_crud_lifecycle()
    
    # Summary
    log("\n" + "=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        log(f"{status}: {test_name}")
    
    log("=" * 80)
    log(f"TOTAL: {passed}/{total} tests passed")
    log("=" * 80)
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
