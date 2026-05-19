import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000'; // Assuming the app runs on port 3000



describe('Referral Program E2E Test', () => {
  let referrer = {
    email: `referrer-${Date.now()}@test.com`,
    password: 'password123',
    referralCode: null,
    cookie: null,
  };

  let referred = {
    email: `referred-${Date.now()}@test.com`,
    password: 'password123',
  };

  it('should create a new referrer user', async () => {
    console.log('Creating referrer user...');
    const res = await fetch(`${API_URL}/api/referral-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: referrer.email, password: referrer.password }),
    });
    console.log('Referrer user creation response:', res.status);
    expect(res.status).toBe(201);
  });

  it('should login the referrer and get their referral code', async () => {
    console.log('Logging in referrer...');
    const res = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: referrer.email, password: referrer.password }),
    });
    console.log('Referrer login response:', res.status);
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie');
    expect(cookie).toBeDefined();
    referrer.cookie = cookie;

    console.log('Fetching referrer data...');
    const dataRes = await fetch(`${API_URL}/api/user-referral-data`, {
        headers: { Cookie: referrer.cookie },
    });
    console.log('Referrer data response:', dataRes.status);
    expect(dataRes.status).toBe(200);
    const data = await dataRes.json();
    expect(data.referralCode).toBeDefined();
    referrer.referralCode = data.referralCode;
    console.log('Referrer referral code:', referrer.referralCode);
  });

  it(`should create a new referred user with the referrer's code`, async () => {
    console.log('Creating referred user...');
    const res = await fetch(`${API_URL}/api/referral-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: referred.email,
        password: referred.password,
        referralCode: referrer.referralCode,
      }),
    });
    console.log('Referred user creation response:', res.status);
    expect(res.status).toBe(201);
  });

  it(`should show the referred user in the referrer's dashboard`, async () => {
    console.log('Fetching referrer data again...');
    const dataRes = await fetch(`${API_URL}/api/user-referral-data`, {
      headers: { Cookie: referrer.cookie },
    });
    console.log('Referrer data response (after referral):', dataRes.status);
    expect(dataRes.status).toBe(200);
    const data = await dataRes.json();
    console.log('Referrer data:', data);
    expect(data.signups).toBe(1);
    expect(data.referredUsers.length).toBe(1);
    expect(data.referredUsers[0].email).toBe(referred.email);
  });
});
