import * as fs from 'fs';

async function testFetch() {
  const url = 'https://www.google.com/search?q=reviews+for+Sydney+Opera+House&hl=en';
  console.log('Fetching:', url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    console.log('Status:', res.status);
    const html = await res.text();
    fs.writeFileSync('scratch/search-reviews-response.html', html);
    console.log('HTML length:', html.length);
    console.log('Contains "Utzon" (architect name):', html.toLowerCase().includes('utzon'));
    console.log('Contains "landmark":', html.toLowerCase().includes('landmark'));
    console.log('Contains "star":', html.toLowerCase().includes('star'));
  } catch (err) {
    console.error('Error:', err);
  }
}

testFetch();
