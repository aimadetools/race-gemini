const fetch = require('node-fetch');

const API_ENDPOINT = 'http://localhost:3000/api/send-audit-report';

async function runTests() {
    console.log('Running tests for /api/send-audit-report...');

    // Test Case 1: Successful request
    await testSuccessfulRequest();

    // Test Case 2: Missing email
    await testMissingEmail();

    // Test Case 3: Missing auditResults
    await testMissingAuditResults();

    console.log('All tests finished.');
}

async function testSuccessfulRequest() {
    console.log('--- Test Case 1: Successful Request ---');
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@example.com',
                auditResults: {
                    altAttributes: { missing: 5 },
                    pageLoadTime: { score: 85 }
                }
            }),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 200 && data.message === 'Audit report request received successfully.') {
            console.log('✅ Test Case 1 Passed: Successful request received expected response.');
        } else {
            console.error('❌ Test Case 1 Failed: Unexpected response for successful request.');
        }
    } catch (error) {
        console.error('❌ Test Case 1 Failed: Error during successful request:', error.message);
    }
}

async function testMissingEmail() {
    console.log('--- Test Case 2: Missing Email ---');
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                auditResults: {
                    altAttributes: { missing: 5 },
                    pageLoadTime: { score: 85 }
                }
            }),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 400 && data.message === 'Email and audit results are required.') {
            console.log('✅ Test Case 2 Passed: Missing email handled correctly.');
        } else {
            console.error('❌ Test Case 2 Failed: Unexpected response for missing email.');
        }
    } catch (error) {
        console.error('❌ Test Case 2 Failed: Error during missing email test:', error.message);
    }
}

async function testMissingAuditResults() {
    console.log('--- Test Case 3: Missing Audit Results ---');
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@example.com'
            }),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 400 && data.message === 'Email and audit results are required.') {
            console.log('✅ Test Case 3 Passed: Missing audit results handled correctly.');
        } else {
            console.error('❌ Test Case 3 Failed: Unexpected response for missing audit results.');
        }
    } catch (error) {
        console.error('❌ Test Case 3 Failed: Error during missing audit results test:', error.message);
    }
}

// Ensure a local development server (e.g., `vercel dev`) is running on port 3000 before executing tests.
runTests();
