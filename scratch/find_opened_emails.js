import fs from 'fs';

const openMessageIds = [
  '83520ed7-dd70-4142-800e-e22a4a142187',
  'f215a72f-2c54-4c9a-9257-0ea1e9c6278e',
  '43f3f867-2373-48ea-b54e-6d4a804e3577',
  '56e9d5e3-c734-4c7e-b4d7-8d3a23159c48',
  'ed955c36-0ec1-4b7f-9e4e-8fd49ef198b0'
];

function main() {
  const filepath = './generated_outreach_emails.txt';
  if (!fs.existsSync(filepath)) {
    console.log('generated_outreach_emails.txt does not exist.');
    return;
  }

  const content = fs.readFileSync(filepath, 'utf8');
  console.log('File size:', content.length, 'characters');

  // Let's split content by email block. Typically, generated_outreach_emails.txt contains email records.
  // Let's see if we can find each messageId in the text and print surrounding context (e.g., 500 chars before and after).
  for (const msgId of openMessageIds) {
    const idx = content.indexOf(msgId);
    if (idx !== -1) {
      console.log(`\n================ FOUND messageId: ${msgId} ================`);
      const start = Math.max(0, idx - 400);
      const end = Math.min(content.length, idx + 400);
      console.log(content.substring(start, end));
    } else {
      console.log(`\n================ NOT FOUND messageId: ${msgId} ================`);
    }
  }
}

main();
