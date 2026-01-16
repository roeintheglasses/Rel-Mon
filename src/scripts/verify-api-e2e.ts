#!/usr/bin/env tsx
/**
 * End-to-End API Workflow Verification Script
 *
 * This script verifies the complete public REST API workflow including:
 * - API key authentication
 * - CRUD operations on releases
 * - Dependency management
 * - Sprint read operations
 * - Rate limiting enforcement
 * - API documentation accessibility
 * - API key revocation
 *
 * Prerequisites:
 * 1. Application running at http://localhost:3000
 * 2. Database seeded with test data (at least one team, service, and sprint)
 *
 * Usage:
 *   npm run verify-api-e2e <API_KEY>
 *
 * Or run the full workflow:
 *   npm run verify-api-e2e -- --full
 *   (This will prompt you to create an API key via the web UI)
 */

import * as https from 'https';
import * as http from 'http';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const API_KEY = process.argv[2] || process.env.API_KEY;
const FULL_WORKFLOW = process.argv.includes('--full');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [] as { name: string; passed: boolean; message?: string }[],
};

/**
 * Make HTTP request
 */
function makeRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<{ status: number; headers: Record<string, string | string[]>; body: any }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        let body;
        try {
          body = data ? JSON.parse(data) : null;
        } catch {
          body = data;
        }

        resolve({
          status: res.statusCode || 0,
          headers: res.headers as Record<string, string | string[]>,
          body,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      const bodyStr = JSON.stringify(options.body);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(bodyStr));
      req.write(bodyStr);
    }

    req.end();
  });
}

/**
 * Log test result
 */
function logTest(name: string, passed: boolean, message?: string) {
  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } else {
    results.failed++;
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    if (message) {
      console.log(`  ${colors.yellow}${message}${colors.reset}`);
    }
  }
}

/**
 * Section header
 */
function logSection(title: string) {
  console.log(`\n${colors.cyan}=== ${title} ===${colors.reset}\n`);
}

/**
 * Info message
 */
function logInfo(message: string) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

/**
 * Test 1: API Key Authentication
 */
async function testAuthentication() {
  logSection('Authentication Tests');

  if (!API_KEY) {
    logTest('Valid API key returns 200', false, 'API_KEY is not defined');
    return;
  }

  // Test 1.1: Valid API key
  try {
    const res = await makeRequest(`${API_BASE}/api/v1/releases`, {
      headers: { 'X-API-Key': API_KEY },
    });
    logTest(
      'Valid API key returns 200',
      res.status === 200,
      res.status !== 200 ? `Expected 200, got ${res.status}` : undefined
    );
  } catch (err: any) {
    logTest('Valid API key returns 200', false, err.message);
  }

  // Test 1.2: Missing API key
  try {
    const res = await makeRequest(`${API_BASE}/api/v1/releases`);
    logTest(
      'Missing API key returns 401',
      res.status === 401,
      res.status !== 401 ? `Expected 401, got ${res.status}` : undefined
    );
  } catch (err: any) {
    logTest('Missing API key returns 401', false, err.message);
  }

  // Test 1.3: Invalid API key
  try {
    const res = await makeRequest(`${API_BASE}/api/v1/releases`, {
      headers: { 'X-API-Key': 'relmon_invalid_key_12345' },
    });
    logTest(
      'Invalid API key returns 401',
      res.status === 401,
      res.status !== 401 ? `Expected 401, got ${res.status}` : undefined
    );
  } catch (err: any) {
    logTest('Invalid API key returns 401', false, err.message);
  }
}

/**
 * Test 2: Releases API CRUD
 */
async function testReleasesAPI() {
  logSection('Releases API Tests');

  if (!API_KEY) {
    logTest('Releases API tests', false, 'API_KEY is not defined');
    return null;
  }

  let createdReleaseId: string | null = null;

  // Test 2.1: List releases (paginated response)
  try {
    const res = await makeRequest(`${API_BASE}/api/v1/releases`, {
      headers: { 'X-API-Key': API_KEY },
    });
    const hasPaginatedResponse = res.status === 200 && res.body?.data && Array.isArray(res.body.data) && res.body?.pagination;
    logTest(
      'GET /api/v1/releases returns 200',
      hasPaginatedResponse,
      res.status !== 200 ? `Expected 200, got ${res.status}` : !hasPaginatedResponse ? 'Response.data is not an array or missing pagination' : undefined
    );
  } catch (err: any) {
    logTest('GET /api/v1/releases returns 200', false, err.message);
  }

  // Test 2.2: Create release (get serviceId and sprintId first)
  try {
    // Try to get existing releases to extract serviceId and sprintId
    const listRes = await makeRequest(`${API_BASE}/api/v1/releases`, {
      headers: { 'X-API-Key': API_KEY },
    });

    if (listRes.body?.data && Array.isArray(listRes.body.data) && listRes.body.data.length > 0) {
      const existingRelease = listRes.body.data[0];
      const serviceId = existingRelease.service?.id;
      const sprintId = existingRelease.sprint?.id;

      if (serviceId && sprintId) {
        const createRes = await makeRequest(`${API_BASE}/api/v1/releases`, {
          method: 'POST',
          headers: { 'X-API-Key': API_KEY },
          body: {
            title: `E2E Test Release ${Date.now()}`,
            description: 'Created by E2E verification script',
            serviceId,
            sprintId,
            status: 'NOT_STARTED',
          },
        });

        const passed = createRes.status === 201 && createRes.body?.id;
        if (passed && createRes.body?.id) {
          createdReleaseId = createRes.body.id;
        }
        logTest(
          'POST /api/v1/releases creates release',
          passed,
          !passed ? `Expected 201 with id, got ${createRes.status}` : undefined
        );
      } else {
        logTest('POST /api/v1/releases creates release', false, 'No serviceId or sprintId available from existing releases');
      }
    } else {
      logTest('POST /api/v1/releases creates release', false, 'No existing releases to get serviceId and sprintId');
    }
  } catch (err: any) {
    logTest('POST /api/v1/releases creates release', false, err.message);
  }

  if (!createdReleaseId) {
    logInfo('Skipping remaining release tests (no release created)');
    return null;
  }

  // Test 2.3: Get release by ID
  try {
    const res = await makeRequest(`${API_BASE}/api/v1/releases/${createdReleaseId}`, {
      headers: { 'X-API-Key': API_KEY },
    });
    logTest(
      'GET /api/v1/releases/:id returns release',
      res.status === 200 && res.body?.id === createdReleaseId,
      res.status !== 200 ? `Expected 200, got ${res.status}` : undefined
    );
  } catch (err: any) {
    logTest('GET /api/v1/releases/:id returns release', false, err.message);
  }

  // Test 2.4: Update release
  try {
    const res = await makeRequest(`${API_BASE}/api/v1/releases/${createdReleaseId}`, {
      method: 'PATCH',
      headers: { 'X-API-Key': API_KEY },
      body: {
        status: 'IN_DEVELOPMENT',
        description: 'Updated by E2E verification script',
      },
    });
    logTest(
      'PATCH /api/v1/releases/:id updates release',
      res.status === 200 && res.body?.status === 'IN_DEVELOPMENT',
      res.status !== 200 ? `Expected 200, got ${res.status}` : undefined
    );
  } catch (err: any) {
    logTest('PATCH /api/v1/releases/:id updates release', false, err.message);
  }

  return createdReleaseId;
}

/**
 * Test 3: Dependencies API
 */
async function testDependenciesAPI(releaseId: string) {
  logSection('Dependencies API Tests');

  if (!API_KEY) {
    logTest('Dependencies API tests', false, 'API_KEY is not defined');
    return;
  }

  // Get another release to create a dependency
  let dependencyReleaseId: string | null = null;
  try {
    const listRes = await makeRequest(`${API_BASE}/api/v1/releases`, {
      headers: { 'X-API-Key': API_KEY },
    });

    if (listRes.body?.data && Array.isArray(listRes.body.data)) {
      const otherRelease = listRes.body.data.find((r: any) => r.id !== releaseId);
      if (otherRelease) {
        dependencyReleaseId = otherRelease.id;
      }
    }
  } catch (err: any) {
    logInfo(`Could not find another release for dependency test: ${err.message}`);
  }

  if (!dependencyReleaseId) {
    logInfo('Skipping dependency tests (no other releases available)');
    return;
  }

  // Test 3.1: Create dependency
  let createdDependencyId: string | null = null;
  try {
    const res = await makeRequest(
      `${API_BASE}/api/v1/releases/${releaseId}/dependencies`,
      {
        method: 'POST',
        headers: { 'X-API-Key': API_KEY },
        body: {
          blockingReleaseId: dependencyReleaseId,
          type: 'BLOCKS',
          description: 'E2E test dependency',
        },
      }
    );
    const passed = res.status === 201 && res.body?.id;
    if (passed && res.body?.id) {
      createdDependencyId = res.body.id;
    }
    logTest(
      'POST /api/v1/releases/:id/dependencies creates dependency',
      passed,
      !passed ? `Expected 201 with id, got ${res.status}` : undefined
    );
  } catch (err: any) {
    logTest('POST /api/v1/releases/:id/dependencies creates dependency', false, err.message);
  }

  // Test 3.2: List dependencies
  try {
    const res = await makeRequest(
      `${API_BASE}/api/v1/releases/${releaseId}/dependencies`,
      {
        headers: { 'X-API-Key': API_KEY },
      }
    );
    logTest(
      'GET /api/v1/releases/:id/dependencies lists dependencies',
      res.status === 200 && res.body?.dependsOn && res.body?.dependents,
      res.status !== 200 ? `Expected 200, got ${res.status}` : undefined
    );
  } catch (err: any) {
    logTest('GET /api/v1/releases/:id/dependencies lists dependencies', false, err.message);
  }

  if (createdDependencyId) {
    // Test 3.3: Update dependency
    try {
      const res = await makeRequest(
        `${API_BASE}/api/v1/releases/${releaseId}/dependencies/${createdDependencyId}`,
        {
          method: 'PATCH',
          headers: { 'X-API-Key': API_KEY },
          body: {
            description: 'Updated E2E test dependency',
          },
        }
      );
      logTest(
        'PATCH /api/v1/releases/:id/dependencies/:depId updates dependency',
        res.status === 200,
        res.status !== 200 ? `Expected 200, got ${res.status}` : undefined
      );
    } catch (err: any) {
      logTest('PATCH /api/v1/releases/:id/dependencies/:depId updates dependency', false, err.message);
    }

    // Test 3.4: Delete dependency
    try {
      const res = await makeRequest(
        `${API_BASE}/api/v1/releases/${releaseId}/dependencies/${createdDependencyId}`,
        {
          method: 'DELETE',
          headers: { 'X-API-Key': API_KEY },
        }
      );
      logTest(
        'DELETE /api/v1/releases/:id/dependencies/:depId removes dependency',
        res.status === 200,
        res.status !== 200 ? `Expected 200, got ${res.status}` : undefined
      );
    } catch (err: any) {
      logTest('DELETE /api/v1/releases/:id/dependencies/:depId removes dependency', false, err.message);
    }
  }
}

/**
 * Test 4: Sprints API
 */
async function testSprintsAPI() {
  logSection('Sprints API Tests');

  if (!API_KEY) {
    logTest('Sprints API tests', false, 'API_KEY is not defined');
    return;
  }

  // Test 4.1: List sprints
  try {
    const res = await makeRequest(`${API_BASE}/api/v1/sprints`, {
      headers: { 'X-API-Key': API_KEY },
    });
    logTest(
      'GET /api/v1/sprints returns sprints',
      res.status === 200 && Array.isArray(res.body),
      res.status !== 200 ? `Expected 200, got ${res.status}` : !Array.isArray(res.body) ? 'Response is not an array' : undefined
    );

    // Test 4.2: Get sprint by ID
    if (res.body && Array.isArray(res.body) && res.body.length > 0) {
      const sprintId = res.body[0].id;
      const detailRes = await makeRequest(`${API_BASE}/api/v1/sprints/${sprintId}`, {
        headers: { 'X-API-Key': API_KEY },
      });
      logTest(
        'GET /api/v1/sprints/:id returns sprint',
        detailRes.status === 200 && detailRes.body?.id === sprintId,
        detailRes.status !== 200 ? `Expected 200, got ${detailRes.status}` : undefined
      );
    } else {
      logInfo('Skipping sprint detail test (no sprints available)');
    }
  } catch (err: any) {
    logTest('GET /api/v1/sprints returns sprints', false, err.message);
  }
}

/**
 * Test 5: Rate Limiting
 */
async function testRateLimiting() {
  logSection('Rate Limiting Tests');

  if (!API_KEY) {
    logTest('Rate limiting tests', false, 'API_KEY is not defined');
    return;
  }

  logInfo('Testing rate limiting (this will make 101 requests)...');

  try {
    let rateLimitTriggered = false;
    let lastHeaders: Record<string, string | string[]> = {};

    // Make 101 requests to trigger rate limit
    for (let i = 1; i <= 101; i++) {
      const res = await makeRequest(`${API_BASE}/api/v1/releases`, {
        headers: { 'X-API-Key': API_KEY },
      });

      lastHeaders = res.headers;

      if (res.status === 429) {
        rateLimitTriggered = true;
        logTest(
          'Rate limit triggers after 100 requests',
          true,
          `Rate limited at request ${i}`
        );

        // Check rate limit headers
        const hasHeaders =
          !!res.headers['x-ratelimit-limit'] &&
          !!res.headers['x-ratelimit-remaining'] &&
          !!res.headers['x-ratelimit-reset'] &&
          !!res.headers['retry-after'];

        logTest(
          'Rate limit response includes proper headers',
          hasHeaders,
          !hasHeaders ? `Missing headers: ${JSON.stringify(res.headers)}` : undefined
        );
        break;
      }

      // Small delay to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    if (!rateLimitTriggered) {
      logTest(
        'Rate limit triggers after 100 requests',
        false,
        'Made 101 requests without triggering rate limit'
      );
    }

    // Check that successful requests have rate limit headers
    const hasRateLimitHeaders =
      lastHeaders['x-ratelimit-limit'] !== undefined &&
      lastHeaders['x-ratelimit-remaining'] !== undefined &&
      lastHeaders['x-ratelimit-reset'] !== undefined;

    logTest(
      'Successful responses include rate limit headers',
      hasRateLimitHeaders,
      !hasRateLimitHeaders ? 'Expected X-RateLimit-* headers in response' : undefined
    );
  } catch (err: any) {
    logTest('Rate limiting test', false, err.message);
  }
}

/**
 * Test 6: API Documentation
 */
async function testAPIDocumentation() {
  logSection('API Documentation Tests');

  // Test 6.1: OpenAPI spec accessible
  try {
    const res = await makeRequest(`${API_BASE}/openapi.json`);
    const isValid = res.status === 200 && res.body?.openapi && res.body.openapi.startsWith('3.0');
    logTest(
      'OpenAPI spec accessible at /openapi.json',
      isValid,
      !isValid ? `Expected 200 with valid OpenAPI spec, got ${res.status}` : undefined
    );

    if (isValid) {
      const hasAllPaths =
        !!res.body?.paths?.['/api/v1/releases'] &&
        !!res.body?.paths?.['/api/v1/sprints'] &&
        !!res.body?.paths?.['/api/v1/releases/{id}/dependencies'];

      logTest(
        'OpenAPI spec includes all endpoints',
        hasAllPaths,
        !hasAllPaths ? 'Missing expected paths in OpenAPI spec' : undefined
      );
    }
  } catch (err: any) {
    logTest('OpenAPI spec accessible at /openapi.json', false, err.message);
  }

  // Test 6.2: API docs page accessible
  try {
    const res = await makeRequest(`${API_BASE}/api-docs`);
    logTest(
      'API documentation page accessible at /api-docs',
      res.status === 200,
      res.status !== 200 ? `Expected 200, got ${res.status}` : undefined
    );
  } catch (err: any) {
    logTest('API documentation page accessible at /api-docs', false, err.message);
  }
}

/**
 * Test 7: Cleanup (Delete created release)
 */
async function cleanupRelease(releaseId: string) {
  logSection('Cleanup');

  if (!API_KEY) {
    logTest('Cleanup', false, 'API_KEY is not defined');
    return;
  }

  try {
    const res = await makeRequest(`${API_BASE}/api/v1/releases/${releaseId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': API_KEY },
    });
    logTest(
      'DELETE /api/v1/releases/:id removes release',
      res.status === 200,
      res.status !== 200 ? `Expected 200, got ${res.status}` : undefined
    );
  } catch (err: any) {
    logTest('DELETE /api/v1/releases/:id removes release', false, err.message);
  }
}

/**
 * Display final results
 */
function displayResults() {
  logSection('Test Results');

  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Total: ${results.tests.length}\n`);

  if (results.failed > 0) {
    console.log(`${colors.yellow}Failed Tests:${colors.reset}`);
    results.tests
      .filter((t) => !t.passed)
      .forEach((t) => {
        console.log(`  ${colors.red}✗${colors.reset} ${t.name}`);
        if (t.message) {
          console.log(`    ${t.message}`);
        }
      });
    console.log();
  }

  const passRate = results.tests.length > 0
    ? ((results.passed / results.tests.length) * 100).toFixed(1)
    : '0.0';
  console.log(`Pass Rate: ${passRate}%\n`);

  process.exit(results.failed > 0 ? 1 : 0);
}

/**
 * Main execution
 */
async function main() {
  console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║  Public REST API E2E Verification     ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);

  if (FULL_WORKFLOW) {
    console.log(`${colors.yellow}FULL WORKFLOW MODE${colors.reset}\n`);
    console.log('Please follow these manual steps:\n');
    console.log('1. Open your browser and navigate to http://localhost:3000');
    console.log('2. Sign in with Clerk authentication');
    console.log('3. Navigate to the API Keys management page');
    console.log('4. Create a new API key with all scopes enabled');
    console.log('5. Copy the API key (it will only be shown once)');
    console.log('6. Run this script again with the API key:\n');
    console.log(`   ${colors.cyan}npm run verify-api-e2e <YOUR_API_KEY>${colors.reset}\n`);
    console.log('7. After verification completes, revoke the API key via the web UI');
    console.log('8. Run one more request to verify 401 response\n');
    return;
  }

  if (!API_KEY) {
    console.log(`${colors.red}Error: API_KEY is required${colors.reset}\n`);
    console.log('Usage:');
    console.log(`  ${colors.cyan}npm run verify-api-e2e <API_KEY>${colors.reset}`);
    console.log(`  ${colors.cyan}npm run verify-api-e2e -- --full${colors.reset} (for full workflow)\n`);
    process.exit(1);
  }

  logInfo(`Using API key: ${API_KEY.substring(0, 15)}...`);
  logInfo(`API base URL: ${API_BASE}\n`);

  // Run tests
  await testAuthentication();
  const releaseId = await testReleasesAPI();

  if (releaseId) {
    await testDependenciesAPI(releaseId);
  }

  await testSprintsAPI();
  await testRateLimiting();
  await testAPIDocumentation();

  if (releaseId) {
    await cleanupRelease(releaseId);
  }

  displayResults();
}

// Run the script
main().catch((err) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
