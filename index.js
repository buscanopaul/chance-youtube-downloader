const express = require('express');
const youtubeDl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

const cache = new Map();
const CACHE_TTL = 3600000;

const app = express();
app.use(require('cors')());

// Path to your Netscape formatted cookies file
const cookiesPath = path.join(__dirname, 'cookies.txt');

app.get('/', (req, res) => {
  res.send('YouTube to MP4 API is running');
});

// Endpoint to check if cookies are available
app.get('/cookie-status', (req, res) => {
  if (fs.existsSync(cookiesPath)) {
    const stats = fs.statSync(cookiesPath);
    const fileSize = stats.size;
    const lastModified = stats.mtime;

    res.json({
      status: 'available',
      fileSize: fileSize + ' bytes',
      lastModified: lastModified,
      format: 'Netscape',
    });
  } else {
    res.json({
      status: 'unavailable',
      message: 'No cookies file found',
    });
  }
});

app.get('/download', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).send({ error: 'URL is required' });
    }

    const cacheKey = url;
    if (cache.has(cacheKey)) {
      const cachedData = cache.get(cacheKey);
      if (Date.now() - cachedData.timestamp < CACHE_TTL) {
        return res.send(cachedData.data);
      }
    }

    // Check if cookies file exists
    if (!fs.existsSync(cookiesPath)) {
      return res.status(400).send({
        error: 'Cookies file not found',
        tip: 'Please convert your cookies to Netscape format and place them in cookies.txt',
      });
    }

    // Options for youtube-dl with cookies
    const options = {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
      noCheckCertificates: true,
      skipDownload: true,
      cookies: cookiesPath, // Using the Netscape formatted cookies file
    };

    // Get video info using youtube-dl with cookies
    const output = await youtubeDl(url, options);

    const videoId = url.includes('v=')
      ? url.split('v=')[1].split('&')[0]
      : output.id;

    let data = {
      url: 'https://www.youtube.com/embed/' + videoId,
      info: output.formats,
      status: 'success',
    };

    cache.set(cacheKey, {
      timestamp: Date.now(),
      data: data,
    });

    return res.send(data);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send({
      error: error.message,
      tip: 'Authentication required. Ensure cookies are in Netscape format.',
    });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
