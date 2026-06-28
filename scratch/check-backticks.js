import fs from 'fs';
const content = fs.readFileSync('api/widget.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('`')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
