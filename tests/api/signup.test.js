const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const API_ENDPOINT = 'http://localhost:3000/api/signup';

async function runTests() {
    console.log('Running tests for /api/signup...');

    // Clean up KV entries created by tests if necessary (manual step for now)
    console.log('NOTE: For a truly clean test run, ensure your Vercel KV store is cleared of test emails before running these tests.');

    // Test Case 1: Successful signup
    await testSuccessfulSignup();

    // Test Case 2: Missing email
    await testMissingEmail();

    // Test Case 3: Missing password
    await testMissingPassword();

    // Test Case 4: Both email and password missing
    await testBothMissing();

    // Test Case 5: Email already exists
    await testEmailAlreadyExists();

    console.log('All tests finished for /api/signup.');
}

async function generateUniqueEmail() {
    return `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@example.com`;
}

async function testSuccessfulSignup() {
    console.log('
--- Test Case 1: Successful Signup ---');
    const email = await generateUniqueEmail();
    const password = 'securepassword123';
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 201 && data.message === 'User registered successfully!' && data.userId) {
            console.log('✅ Test Case 1 Passed: Successful signup received expected response.');
        } else {
            console.error('❌ Test Case 1 Failed: Unexpected response for successful signup.');
        }
    } catch (error) {
        console.error('❌ Test Case 1 Failed: Error during successful signup test:', error.message);
    }
}

async function testMissingEmail() {
    console.log('
--- Test Case 2: Missing Email ---');
    const password = 'securepassword123';
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password }),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 400 && data.message === 'Email and password are required.') {
            console.log('✅ Test Case 2 Passed: Missing email handled correctly.');
        } else {
            console.error('❌ Test Case 2 Failed: Unexpected response for missing email.');
        }
    } catch (error) {
        console.error('❌ Test Case 2 Failed: Error during missing email test:', error.message);
    }
}

async function testMissingPassword() {
    console.log('
--- Test Case 3: Missing Password ---');
    const email = await generateUniqueEmail();
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 400 && data.message === 'Email and password are required.') {
            console.log('✅ Test Case 3 Passed: Missing password handled correctly.');
        } else {
            console.error('❌ Test Case 3 Failed: Unexpected response for missing password.');
        }
    } catch (error) {
        console.error('❌ Test Case 3 Failed: Error during missing password test:', error.message);
    }
}

async function testBothMissing() {
    console.log('
--- Test Case 4: Both Email and Password Missing ---');
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 400 && data.message === 'Email and password are required.') {
            console.log('✅ Test Case 4 Passed: Both email and password missing handled correctly.');
        } else {
            console.error('❌ Test Case 4 Failed: Unexpected response for both missing.');
        }
    } catch (error) {
        console.error('❌ Test Case 4 Failed: Error during both missing test:', error.message);
    }
}

async function testEmailAlreadyExists() {
    console.log('
--- Test Case 5: Email Already Exists ---');
    const email = await generateUniqueEmail();
    const password = 'anothersecurepassword';
    try {
        // First, successfully sign up the user
        await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        // Then, try to sign up with the same email again
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'differentpassword' }), // Password doesn't matter here
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 409 && data.message === 'User with this email already exists.') {
            console.log('✅ Test Case 5 Passed: Email already exists handled correctly.');
        } else {
            console.error('❌ Test Case 5 Failed: Unexpected response for email already exists.');
        }
    } catch (error) {
        console.error('❌ Test Case 5 Failed: Error during email already exists test:', error.message);
    }
}

// Ensure a local development server (e.g., `vercel dev`) is running on port 3000 before executing tests.
runTests();
