require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');           // ✅ You forgot this line
const { URL } = require('url');       // ✅ You also need this line

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// --- MIDDLEWARE SECTION ---

app.use(cors());

// ✅ These two lines fix your "req.body undefined" error:
app.use(express.urlencoded({ extended: false }));  // parse form data
app.use(express.json());                           // parse JSON data

// Serve static files (CSS, images, etc.)
app.use('/public', express.static(`${process.cwd()}/public`));

// --- SIMPLE ROUTES ---

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// --- "DATABASE" IN MEMORY ---
const urls = [];
let nextId = 1;

// --- MAIN API LOGIC ---

app.post('/api/shorturl', (req, res) => {
  const submittedUrl = req.body.url;   // ✅ Now this will no longer be undefined

  // 1) Basic check
  if (!submittedUrl) {
    return res.json({ error: 'invalid url' });
  }

  // 2) Try to parse the URL
  let parsed;
  try {
    parsed = new URL(submittedUrl);
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  // 3) Accept only http(s)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.json({ error: 'invalid url' });
  }

  // 4) DNS check to verify domain exists
  const hostname = parsed.hostname;

  dns.lookup(hostname, (dnsErr) => {
    if (dnsErr) {
      return res.json({ error: 'invalid url' });
    }

    // 5) If URL already stored, return same id
    const existing = urls.find((entry) => entry.original_url === submittedUrl);
    if (existing) {
      return res.json({
        original_url: existing.original_url,
        short_url: existing.id
      });
    }

    // 6) Create new short URL entry
    const id = nextId++;
    const record = { id, original_url: submittedUrl };
    urls.push(record);

    // 7) Return JSON response
    return res.json({
      original_url: record.original_url,
      short_url: record.id
    });
  });
});

// --- REDIRECT LOGIC ---
app.get('/api/shorturl/:short_url', (req, res) => {
  const id = Number(req.params.short_url);
  if (Number.isNaN(id)) {
    return res.json({ error: 'Wrong format' });
  }

  const record = urls.find((entry) => entry.id === id);
  if (!record) {
    return res.json({ error: 'No short URL found for the given input' });
  }

  return res.redirect(record.original_url);
});

// --- START SERVER ---
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
