const mockUsers = [];
let nextId = 1;

export const mockQuery = async (text, params) => {
    if (text.startsWith('SELECT id FROM users WHERE email = $1')) {
        const email = params[0];
        const existingUser = mockUsers.find(user => user.email === email);
        return { rows: existingUser ? [{ id: existingUser.id }] : [] };
    } else if (text.startsWith('INSERT INTO users (email, hashed_password, credits) VALUES ($1, $2, $3) RETURNING id') || text.startsWith('INSERT INTO users (id, email, hashed_password, credits) VALUES ($1, $2, $3, $4) RETURNING id')) {
        let newUser;
        if (text.startsWith('INSERT INTO users (id, email, hashed_password, credits)')) {
            const [id, email, hashedPassword, credits] = params;
            newUser = { id, email, hashed_password: hashedPassword, credits };
        } else {
            const [email, hashedPassword, credits] = params;
            newUser = { id: (nextId++).toString(), email, hashed_password: hashedPassword, credits };
        }
        mockUsers.push(newUser);
        return { rows: [{ id: newUser.id }] };
    } else if (text.startsWith('SELECT id, email, hashed_password, credits FROM users WHERE email = $1')) {
        const email = params[0];
        const user = mockUsers.find(u => u.email === email);
        return { rows: user ? [user] : [] };
    } else if (text.startsWith('UPDATE users SET credits = credits + $1 WHERE id = $2')) {
        const [amount, userId] = params;
        const userIndex = mockUsers.findIndex(u => u.id === userId);
        if (userIndex > -1) {
            mockUsers[userIndex].credits += amount;
            return { rows: [{ credits: mockUsers[userIndex].credits }] };
        }
        return { rows: [] };
    } else if (text.startsWith('SELECT credits FROM users WHERE id = $1')) {
        const userId = params[0];
        const user = mockUsers.find(u => u.id === userId);
        return { rows: user ? [{ credits: user.credits }] : [] };
    } else if (text.startsWith('SELECT * FROM users WHERE id = $1')) {
        const userId = params[0];
        const user = mockUsers.find(u => u.id === userId);
        return { rows: user ? [user] : [] };
    }
    // Add other query mocks as needed
    return { rows: [] };
};

export const getMockUsers = () => {
    return mockUsers;
};

export const addMockUser = (user) => {
    mockUsers.push(user);
};

export const clearMockUsers = () => {
    mockUsers.length = 0;
    nextId = 1;
};

// Mock the bcrypt hash function since it's used in signup.js
export const mockBcrypt = {
    hash: (password, saltRounds) => Promise.resolve(`mock-hashed-${password}`),
    compare: (password, hashedPassword) => Promise.resolve(hashedPassword === `mock-hashed-${password}`),
};
