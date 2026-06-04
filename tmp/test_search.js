
const axios = require('axios');
const cheerio = require('cheerio');

async function testSearch() {
  const query = 'microsoft stock';
  const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  try {
    const resp = await axios.get('https://duckduckgo.com/lite/', {
      params: { q: query, kl: 'us-en' },
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(resp.data);
    $('.result-link').each((_, el) => {
      const titleLink = $(el);
      let url = titleLink.attr('href') ?? '';
      console.log('Original URL:', url);

      if (url.startsWith('//duckduckgo.com/l/?') || url.startsWith('/l/?')) {
        try {
          const uStr = url.startsWith('//') ? 'https:' + url : 'https://duckduckgo.com' + url;
          console.log('Constructed URL:', uStr);
          const u = new URL(uStr);
          const decoded = decodeURIComponent(u.searchParams.get('uddg') ?? url);
          console.log('Decoded URL:', decoded);
        } catch (e) {
          console.log('Error decoding:', e.message);
        }
      }
    });
  } catch (err) {
    console.error('Search failed:', err.message);
  }
}

testSearch();
