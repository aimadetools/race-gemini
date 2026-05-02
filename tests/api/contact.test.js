const fetch = require('node-fetch');

const API_ENDPOINT = 'http://localhost:3000/api/contact';

async function runTests() {
    console.log('Running tests for /api/contact...');

    await testSuccessfulSubmission();
    await testMissingName();
    await testMissingEmail();
    await testMissingMessage();
    await testInvalidEmail();

    console.log('All tests finished for /api/contact.');
}

async function testSuccessfulSubmission() {
    console.log('--- Test Case 1: Successful Submission ---');
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'Test User',
                email: 'test@example.com',
                message: 'This is a test message.',
            }),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 200 && data.message === 'Message received successfully.') {
            console.log('✅ Test Case 1 Passed: Successful submission received expected response.');
        } else {
            console.error('❌ Test Case 1 Failed: Unexpected response for successful submission.');
        }
    } catch (error) {
        console.error('❌ Test Case 1 Failed: Error during successful submission test:', error.message);
    }
}

async function testMissingName() {
    console.log('--- Test Case 2: Missing Name ---');
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@example.com',
                message: 'This is a test message.',
            }),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 400 && data.message === 'All fields are required. Please fill them out.') {
            console.log('✅ Test Case 2 Passed: Missing name handled correctly.');
        } else {
            console.error('❌ Test Case 2 Failed: Unexpected response for missing name.');
        }
    } catch (error) {
        console.error('❌ Test Case 2 Failed: Error during missing name test:', error.message);
    }
}

async function testMissingEmail() {
    console.log('--- Test Case 3: Missing Email ---');
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'Test User',
                message: 'This is a test message.',
            }),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 400 && data.message === 'All fields are required. Please fill them out.') {
            console.log('✅ Test Case 3 Passed: Missing email handled correctly.');
        } else {
            console.error('❌ Test Case 3 Failed: Unexpected response for missing email.');
        }
    } catch (error) {
        console.error('❌ Test Case 3 Failed: Error during missing email test:', error.message);
    }
}

async function testMissingMessage() {
    console.log('--- Test Case 4: Missing Message ---');
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'Test User',
                email: 'test@example.com',
            }),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 400 && data.message === 'All fields are required. Please fill them out.') {
            console.log('✅ Test Case 4 Passed: Missing message handled correctly.');
        } else {
            console.error('❌ Test Case 4 Failed: Unexpected response for missing message.');
        }
    } catch (error) {
        console.error('❌ Test Case 4 Failed: Error during missing message test:', error.message);
    }
}

async function testInvalidEmail() {
    console.log('--- Test Case 5: Invalid Email Format ---');
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'Test User',
                email: 'invalid-email',
                message: 'This is a test message.',
            }),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 400 && data.message === 'Please enter a valid email address.') {
            console.log('✅ Test Case 5 Passed: Invalid email format handled correctly.');
        } else {
            console.error('❌ Test Case 5 Failed: Unexpected response for invalid email format.');
        }
    } catch (error) {
        console.error('❌ Test Case 5 Failed: Error during invalid email format test:', error.message);
    }
}

// Ensure a local development server (e.g., `vercel dev`) is running on port 3000 before executing tests.
runTests();
