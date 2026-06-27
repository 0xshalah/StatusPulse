#!/usr/bin/env python3
"""
StatusPulse Backend API Test Suite
Tests all backend endpoints for correct response shapes, status codes, and MongoDB persistence.
"""

import requests
import json
import time
from typing import Dict, Any

# Base URL from environment
BASE_URL = "https://endpoint-status-3.preview.emergentagent.com/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log_test(name: str):
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}TEST: {name}{Colors.END}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}")

def log_success(msg: str):
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")

def log_error(msg: str):
    print(f"{Colors.RED}✗ {msg}{Colors.END}")

def log_info(msg: str):
    print(f"{Colors.YELLOW}ℹ {msg}{Colors.END}")

def validate_endpoint_shape(ep: Dict[str, Any], context: str) -> bool:
    """Validate endpoint object has correct shape"""
    required = ['id', 'name', 'url', 'expectedStatus', 'interval', 'createdAt']
    for field in required:
        if field not in ep:
            log_error(f"{context}: Missing field '{field}' in endpoint")
            return False
    if '_id' in ep:
        log_error(f"{context}: MongoDB _id should not be present")
        return False
    log_success(f"{context}: Endpoint shape valid")
    return True

def validate_ping_shape(ping: Dict[str, Any], context: str) -> bool:
    """Validate ping object has correct shape"""
    required = ['id', 'endpointId', 'timestamp', 'statusCode', 'responseTime', 'verdict']
    for field in required:
        if field not in ping:
            log_error(f"{context}: Missing field '{field}' in ping")
            return False
    if '_id' in ping:
        log_error(f"{context}: MongoDB _id should not be present")
        return False
    if ping['verdict'] not in ['up', 'degraded', 'down']:
        log_error(f"{context}: Invalid verdict '{ping['verdict']}'")
        return False
    log_success(f"{context}: Ping shape valid")
    return True

# Test results tracking
test_results = {
    'passed': 0,
    'failed': 0,
    'tests': []
}

def record_test(name: str, passed: bool, details: str = ""):
    test_results['tests'].append({'name': name, 'passed': passed, 'details': details})
    if passed:
        test_results['passed'] += 1
    else:
        test_results['failed'] += 1

# ============================================================================
# TEST 1: POST /api/seed - Idempotent seeding
# ============================================================================
def test_seed():
    log_test("1. POST /api/seed - Idempotent seeding")
    
    try:
        # First call - may seed or skip if data exists
        response = requests.post(f"{BASE_URL}/seed", timeout=15)
        log_info(f"Status Code: {response.status_code}")
        log_info(f"Response: {response.text[:200]}")
        
        if response.status_code != 200:
            log_error(f"Expected 200, got {response.status_code}")
            record_test("POST /api/seed", False, f"Wrong status code: {response.status_code}")
            return False
        
        data = response.json()
        
        # Should have seeded field
        if 'seeded' not in data:
            log_error("Response missing 'seeded' field")
            record_test("POST /api/seed", False, "Missing 'seeded' field")
            return False
        
        if data['seeded']:
            log_success(f"Seeded {data.get('count', 0)} endpoints")
            if data.get('count') != 5:
                log_error(f"Expected count=5, got {data.get('count')}")
        else:
            log_success("Data already exists, skipped seeding (idempotent)")
        
        # Second call - should always skip
        response2 = requests.post(f"{BASE_URL}/seed", timeout=15)
        data2 = response2.json()
        
        if data2.get('seeded') == True:
            log_error("Second seed call should not seed again (not idempotent)")
            record_test("POST /api/seed", False, "Not idempotent")
            return False
        
        log_success("Seed endpoint is idempotent")
        record_test("POST /api/seed", True)
        return True
        
    except Exception as e:
        log_error(f"Exception: {str(e)}")
        record_test("POST /api/seed", False, str(e))
        return False

# ============================================================================
# TEST 2: GET /api/endpoints - List all endpoints
# ============================================================================
def test_get_endpoints():
    log_test("2. GET /api/endpoints - List all endpoints")
    
    try:
        response = requests.get(f"{BASE_URL}/endpoints", timeout=10)
        log_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_error(f"Expected 200, got {response.status_code}")
            record_test("GET /api/endpoints", False, f"Wrong status code: {response.status_code}")
            return None
        
        data = response.json()
        
        if not isinstance(data, list):
            log_error("Response should be an array")
            record_test("GET /api/endpoints", False, "Not an array")
            return None
        
        log_success(f"Got {len(data)} endpoints")
        
        if len(data) > 0:
            # Validate first endpoint shape
            if validate_endpoint_shape(data[0], "GET /api/endpoints"):
                log_info(f"Sample endpoint: {data[0]['name']} - {data[0]['url']}")
        
        record_test("GET /api/endpoints", True)
        return data
        
    except Exception as e:
        log_error(f"Exception: {str(e)}")
        record_test("GET /api/endpoints", False, str(e))
        return None

# ============================================================================
# TEST 3: GET /api/dashboard - Dashboard aggregation
# ============================================================================
def test_dashboard():
    log_test("3. GET /api/dashboard - Dashboard aggregation")
    
    try:
        response = requests.get(f"{BASE_URL}/dashboard", timeout=15)
        log_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_error(f"Expected 200, got {response.status_code}")
            record_test("GET /api/dashboard", False, f"Wrong status code: {response.status_code}")
            return False
        
        data = response.json()
        
        # Validate structure
        if 'endpoints' not in data or 'health' not in data:
            log_error("Missing 'endpoints' or 'health' field")
            record_test("GET /api/dashboard", False, "Missing required fields")
            return False
        
        if not isinstance(data['endpoints'], list):
            log_error("'endpoints' should be an array")
            record_test("GET /api/dashboard", False, "'endpoints' not an array")
            return False
        
        # Validate health object
        health = data['health']
        if 'healthy' not in health or 'total' not in health:
            log_error("Health object missing 'healthy' or 'total'")
            record_test("GET /api/dashboard", False, "Invalid health object")
            return False
        
        log_success(f"Health: {health['healthy']}/{health['total']} healthy")
        
        # Validate endpoint shape
        if len(data['endpoints']) > 0:
            ep = data['endpoints'][0]
            required = ['id', 'name', 'url', 'verdict', 'pings', 'latest', 'uptime24h', 'avgResponseTime']
            for field in required:
                if field not in ep:
                    log_error(f"Endpoint missing field '{field}'")
                    record_test("GET /api/dashboard", False, f"Missing field '{field}'")
                    return False
            
            # Validate verdict
            if ep['verdict'] not in ['up', 'degraded', 'down', 'unknown']:
                log_error(f"Invalid verdict: {ep['verdict']}")
                record_test("GET /api/dashboard", False, f"Invalid verdict")
                return False
            
            # Validate pings array
            if not isinstance(ep['pings'], list):
                log_error("'pings' should be an array")
                record_test("GET /api/dashboard", False, "'pings' not an array")
                return False
            
            if len(ep['pings']) > 30:
                log_error(f"Too many pings: {len(ep['pings'])} (max 30)")
                record_test("GET /api/dashboard", False, "Too many pings")
                return False
            
            # Verify pings are ascending by timestamp
            if len(ep['pings']) > 1:
                timestamps = [p['timestamp'] for p in ep['pings']]
                if timestamps != sorted(timestamps):
                    log_error("Pings not sorted ascending by timestamp")
                    record_test("GET /api/dashboard", False, "Pings not sorted")
                    return False
                log_success("Pings are sorted ascending by timestamp")
            
            log_success(f"Sample endpoint: {ep['name']} - {ep['verdict']} - {len(ep['pings'])} pings")
            log_info(f"  Uptime 24h: {ep['uptime24h']}%, Avg Response: {ep['avgResponseTime']}ms")
        
        record_test("GET /api/dashboard", True)
        return True
        
    except Exception as e:
        log_error(f"Exception: {str(e)}")
        record_test("GET /api/dashboard", False, str(e))
        return False

# ============================================================================
# TEST 4: GET /api/status - Public status page
# ============================================================================
def test_status():
    log_test("4. GET /api/status - Public status with uptime windows and incidents")
    
    try:
        response = requests.get(f"{BASE_URL}/status", timeout=15)
        log_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_error(f"Expected 200, got {response.status_code}")
            record_test("GET /api/status", False, f"Wrong status code: {response.status_code}")
            return False
        
        data = response.json()
        
        # Validate structure
        required_fields = ['endpoints', 'incidents', 'overall', 'health', 'updatedAt']
        for field in required_fields:
            if field not in data:
                log_error(f"Missing field '{field}'")
                record_test("GET /api/status", False, f"Missing field '{field}'")
                return False
        
        log_success("All required fields present")
        
        # Validate overall status
        if data['overall'] not in ['up', 'degraded', 'down', 'unknown']:
            log_error(f"Invalid overall status: {data['overall']}")
            record_test("GET /api/status", False, "Invalid overall status")
            return False
        
        log_success(f"Overall status: {data['overall']}")
        
        # Validate endpoints
        if len(data['endpoints']) > 0:
            ep = data['endpoints'][0]
            required_ep = ['id', 'name', 'url', 'verdict', 'uptime']
            for field in required_ep:
                if field not in ep:
                    log_error(f"Endpoint missing field '{field}'")
                    record_test("GET /api/status", False, f"Missing field '{field}'")
                    return False
            
            # Validate uptime windows
            uptime = ep['uptime']
            if not isinstance(uptime, dict):
                log_error("'uptime' should be an object")
                record_test("GET /api/status", False, "'uptime' not an object")
                return False
            
            for window in ['h24', 'd7', 'd30']:
                if window not in uptime:
                    log_error(f"Uptime missing window '{window}'")
                    record_test("GET /api/status", False, f"Missing uptime window '{window}'")
                    return False
                
                val = uptime[window]
                if val is not None and not isinstance(val, (int, float)):
                    log_error(f"Uptime {window} should be number or null, got {type(val)}")
                    record_test("GET /api/status", False, f"Invalid uptime type")
                    return False
            
            log_success(f"Sample endpoint: {ep['name']} - Uptime 24h: {uptime['h24']}%, 7d: {uptime['d7']}%, 30d: {uptime['d30']}%")
        
        # Validate incidents
        if not isinstance(data['incidents'], list):
            log_error("'incidents' should be an array")
            record_test("GET /api/status", False, "'incidents' not an array")
            return False
        
        log_success(f"Found {len(data['incidents'])} incidents")
        
        if len(data['incidents']) > 0:
            inc = data['incidents'][0]
            required_inc = ['endpointName', 'start', 'resolved', 'durationMs']
            for field in required_inc:
                if field not in inc:
                    log_error(f"Incident missing field '{field}'")
                    record_test("GET /api/status", False, f"Missing incident field '{field}'")
                    return False
            
            # 'end' should be present (can be null for unresolved)
            if 'end' not in inc:
                log_error("Incident missing 'end' field")
                record_test("GET /api/status", False, "Missing incident 'end' field")
                return False
            
            log_info(f"Sample incident: {inc['endpointName']} - Resolved: {inc['resolved']} - Duration: {inc['durationMs']}ms")
        
        record_test("GET /api/status", True)
        return True
        
    except Exception as e:
        log_error(f"Exception: {str(e)}")
        record_test("GET /api/status", False, str(e))
        return False

# ============================================================================
# TEST 5: POST /api/ping-all - Ping all endpoints
# ============================================================================
def test_ping_all():
    log_test("5. POST /api/ping-all - Ping all endpoints")
    
    try:
        response = requests.post(f"{BASE_URL}/ping-all", timeout=30)
        log_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_error(f"Expected 200, got {response.status_code}")
            record_test("POST /api/ping-all", False, f"Wrong status code: {response.status_code}")
            return False
        
        data = response.json()
        
        if 'pinged' not in data or 'total' not in data:
            log_error("Missing 'pinged' or 'total' field")
            record_test("POST /api/ping-all", False, "Missing required fields")
            return False
        
        log_success(f"Pinged {data['pinged']}/{data['total']} endpoints")
        log_info("Note: External URLs may time out or be deduplicated, that's expected")
        
        record_test("POST /api/ping-all", True)
        return True
        
    except Exception as e:
        log_error(f"Exception: {str(e)}")
        record_test("POST /api/ping-all", False, str(e))
        return False

# ============================================================================
# TEST 6: CRUD Lifecycle
# ============================================================================
def test_crud_lifecycle():
    log_test("6. CRUD Lifecycle - Create, Update, Ping, Get Pings, Delete")
    
    created_id = None
    
    try:
        # 6a. POST /api/endpoints - Create new endpoint
        log_info("\n6a. Creating new endpoint...")
        new_endpoint = {
            "name": "Production API Gateway",
            "url": "https://httpstat.us/200",
            "expectedStatus": 200,
            "interval": 60
        }
        
        response = requests.post(f"{BASE_URL}/endpoints", json=new_endpoint, timeout=15)
        log_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_error(f"Expected 200, got {response.status_code}")
            record_test("POST /api/endpoints (create)", False, f"Wrong status code: {response.status_code}")
            return False
        
        created = response.json()
        
        if not validate_endpoint_shape(created, "POST /api/endpoints"):
            record_test("POST /api/endpoints (create)", False, "Invalid shape")
            return False
        
        if created['name'] != new_endpoint['name']:
            log_error(f"Name mismatch: expected '{new_endpoint['name']}', got '{created['name']}'")
            record_test("POST /api/endpoints (create)", False, "Name mismatch")
            return False
        
        created_id = created['id']
        log_success(f"Created endpoint with ID: {created_id}")
        record_test("POST /api/endpoints (create)", True)
        
        # Wait a moment for the immediate ping to complete
        time.sleep(2)
        
        # 6b. PUT /api/endpoints/:id - Update endpoint
        log_info("\n6b. Updating endpoint...")
        update_data = {"name": "Production API Gateway (Updated)"}
        
        response = requests.put(f"{BASE_URL}/endpoints/{created_id}", json=update_data, timeout=10)
        log_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_error(f"Expected 200, got {response.status_code}")
            record_test("PUT /api/endpoints/:id", False, f"Wrong status code: {response.status_code}")
            return False
        
        updated = response.json()
        
        if updated['name'] != update_data['name']:
            log_error(f"Name not updated: expected '{update_data['name']}', got '{updated['name']}'")
            record_test("PUT /api/endpoints/:id", False, "Name not updated")
            return False
        
        log_success(f"Updated endpoint name to: {updated['name']}")
        record_test("PUT /api/endpoints/:id", True)
        
        # 6c. POST /api/ping/:id - Ping single endpoint
        log_info("\n6c. Pinging endpoint...")
        
        response = requests.post(f"{BASE_URL}/ping/{created_id}", timeout=15)
        log_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_error(f"Expected 200, got {response.status_code}")
            record_test("POST /api/ping/:id", False, f"Wrong status code: {response.status_code}")
            return False
        
        ping_result = response.json()
        
        if 'ping' not in ping_result or 'skipped' not in ping_result:
            log_error("Missing 'ping' or 'skipped' field")
            record_test("POST /api/ping/:id", False, "Missing required fields")
            return False
        
        if ping_result['ping'] and not ping_result['skipped']:
            if validate_ping_shape(ping_result['ping'], "POST /api/ping/:id"):
                log_success(f"Ping successful: {ping_result['ping']['verdict']} - {ping_result['ping']['responseTime']}ms")
        elif ping_result['skipped']:
            log_info("Ping skipped (deduplication)")
        
        record_test("POST /api/ping/:id", True)
        
        # Wait for ping to be stored
        time.sleep(1)
        
        # 6d. GET /api/endpoints/:id/pings - Get pings
        log_info("\n6d. Getting pings for endpoint...")
        
        response = requests.get(f"{BASE_URL}/endpoints/{created_id}/pings?limit=30", timeout=10)
        log_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_error(f"Expected 200, got {response.status_code}")
            record_test("GET /api/endpoints/:id/pings", False, f"Wrong status code: {response.status_code}")
            return False
        
        pings = response.json()
        
        if not isinstance(pings, list):
            log_error("Response should be an array")
            record_test("GET /api/endpoints/:id/pings", False, "Not an array")
            return False
        
        log_success(f"Got {len(pings)} pings")
        
        if len(pings) > 0:
            # Verify pings are ascending by timestamp
            timestamps = [p['timestamp'] for p in pings]
            if timestamps != sorted(timestamps):
                log_error("Pings not sorted ascending by timestamp")
                record_test("GET /api/endpoints/:id/pings", False, "Pings not sorted")
                return False
            
            log_success("Pings are sorted ascending by timestamp")
            validate_ping_shape(pings[0], "GET /api/endpoints/:id/pings")
        
        record_test("GET /api/endpoints/:id/pings", True)
        
        # 6e. DELETE /api/endpoints/:id - Delete endpoint
        log_info("\n6e. Deleting endpoint...")
        
        response = requests.delete(f"{BASE_URL}/endpoints/{created_id}", timeout=10)
        log_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_error(f"Expected 200, got {response.status_code}")
            record_test("DELETE /api/endpoints/:id", False, f"Wrong status code: {response.status_code}")
            return False
        
        delete_result = response.json()
        
        if not delete_result.get('deleted') or delete_result.get('id') != created_id:
            log_error("Invalid delete response")
            record_test("DELETE /api/endpoints/:id", False, "Invalid response")
            return False
        
        log_success(f"Deleted endpoint {created_id}")
        
        # 6f. Verify deletion - endpoint should not exist
        log_info("\n6f. Verifying deletion...")
        
        response = requests.get(f"{BASE_URL}/endpoints", timeout=10)
        endpoints = response.json()
        
        if any(ep['id'] == created_id for ep in endpoints):
            log_error("Endpoint still exists after deletion")
            record_test("DELETE /api/endpoints/:id", False, "Endpoint not deleted")
            return False
        
        log_success("Endpoint successfully removed from database")
        record_test("DELETE /api/endpoints/:id", True)
        
        return True
        
    except Exception as e:
        log_error(f"Exception: {str(e)}")
        record_test("CRUD Lifecycle", False, str(e))
        return False

# ============================================================================
# TEST 7: GET /api/badge/:id - SVG Badge
# ============================================================================
def test_badge(endpoints):
    log_test("7. GET /api/badge/:id - Dynamic SVG badge")
    
    if not endpoints or len(endpoints) == 0:
        log_error("No endpoints available for badge test")
        record_test("GET /api/badge/:id", False, "No endpoints available")
        return False
    
    try:
        endpoint_id = endpoints[0]['id']
        log_info(f"Testing badge for endpoint: {endpoints[0]['name']} ({endpoint_id})")
        
        response = requests.get(f"{BASE_URL}/badge/{endpoint_id}", timeout=10)
        log_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_error(f"Expected 200, got {response.status_code}")
            record_test("GET /api/badge/:id", False, f"Wrong status code: {response.status_code}")
            return False
        
        # Verify Content-Type
        content_type = response.headers.get('Content-Type', '')
        if 'image/svg+xml' not in content_type:
            log_error(f"Expected Content-Type 'image/svg+xml', got '{content_type}'")
            record_test("GET /api/badge/:id", False, f"Wrong Content-Type: {content_type}")
            return False
        
        log_success(f"Content-Type: {content_type}")
        
        # Verify Cache-Control header
        cache_control = response.headers.get('Cache-Control', '')
        if not cache_control:
            log_error("Missing Cache-Control header")
            record_test("GET /api/badge/:id", False, "Missing Cache-Control header")
            return False
        
        log_success(f"Cache-Control: {cache_control}")
        
        # Verify SVG content
        svg_content = response.text
        if '<svg' not in svg_content:
            log_error("Response does not contain '<svg'")
            record_test("GET /api/badge/:id", False, "Not valid SVG")
            return False
        
        log_success("Response contains valid SVG")
        log_info(f"SVG length: {len(svg_content)} bytes")
        
        record_test("GET /api/badge/:id", True)
        return True
        
    except Exception as e:
        log_error(f"Exception: {str(e)}")
        record_test("GET /api/badge/:id", False, str(e))
        return False

# ============================================================================
# Main Test Runner
# ============================================================================
def main():
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}StatusPulse Backend API Test Suite{Colors.END}")
    print(f"{Colors.BLUE}Base URL: {BASE_URL}{Colors.END}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}")
    
    # Run tests in order
    test_seed()
    endpoints = test_get_endpoints()
    test_dashboard()
    test_status()
    test_ping_all()
    test_crud_lifecycle()
    
    if endpoints:
        test_badge(endpoints)
    
    # Print summary
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}TEST SUMMARY{Colors.END}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}")
    
    total = test_results['passed'] + test_results['failed']
    print(f"\nTotal Tests: {total}")
    print(f"{Colors.GREEN}Passed: {test_results['passed']}{Colors.END}")
    print(f"{Colors.RED}Failed: {test_results['failed']}{Colors.END}")
    
    if test_results['failed'] > 0:
        print(f"\n{Colors.RED}Failed Tests:{Colors.END}")
        for test in test_results['tests']:
            if not test['passed']:
                print(f"  {Colors.RED}✗ {test['name']}{Colors.END}")
                if test['details']:
                    print(f"    {test['details']}")
    
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}\n")
    
    return test_results['failed'] == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
