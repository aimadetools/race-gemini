import fetch from 'node-fetch';
try {
  console.log('Sending request to http://localhost:3005/api/login...');
  const res = await fetch('http://localhost:3005/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'referrer-test@test.com', password: 'password123' })
  });
  console.log('Response status:', res.status);
  const text = await res.text();
  console.log('Response body:', text);
} catch (err) {
  console.error('Fetch failed:', err);
}
