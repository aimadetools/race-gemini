import fs from 'fs';
const content = fs.readFileSync('api/widget.js', 'utf8');
const lines = content.split('\n');
for (let i = 633; i < 1205; i++) {
    const line = lines[i];
    if (line.includes('\\')) {
        console.log(`Line ${i + 1}: ${line.trim()}`);
    }
}
