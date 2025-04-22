const express = require('express');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(require('cors')());

// Load cookies properly
let cookiesArray = [];
try {
  const cookiesPath = path.join(__dirname, 'cookies.json');
  const cookiesData = fs.readFileSync(cookiesPath, 'utf8');
  cookiesArray = JSON.parse(cookiesData);
  console.log(
    'Cookies loaded successfully:',
    cookiesArray.length,
    'cookies found'
  );
} catch (error) {
  console.error('Error loading cookies:', error.message);
}

app.get('/download', async (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) {
    return res.status(400).send({ error: 'Video ID is required' });
  }

  try {
    // Use a random delay before processing request
    const delay = Math.floor(Math.random() * 1500) + 500;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Create a ytdl-compatible cookie jar
    const cookieString = cookiesArray
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');

    const options = {
      requestOptions: {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          Referer: 'https://www.youtube.com/',
          Origin: 'https://www.youtube.com',
          Cookie: cookieString,
        },
      },
    };

    console.log(`Attempting to fetch info for video ${videoId}...`);
    const metaInfo = await ytdl.getInfo(
      `https://www.youtube.com/watch?v=${videoId}`,
      options
    );

    console.log(
      `Success! Found ${metaInfo.formats.length} formats for video ${videoId}`
    );
    let data = {
      url: 'https://www.youtube.com/embed/' + videoId,
      info: metaInfo.formats,
      title: metaInfo.videoDetails.title,
    };

    return res.send(data);
  } catch (error) {
    console.error('Error in download route:', error.message);
    // Check if it's an HTTP error and pass the status code
    let statusCode = 500;
    let errorMessage = error.message;

    if (error.message.includes('Status code:')) {
      const match = error.message.match(/Status code: (\d+)/);
      if (match && match[1]) {
        statusCode = parseInt(match[1]);
      }
    }

    return res.status(statusCode).send({
      error: errorMessage,
      message:
        'YouTube rejected the request. This might be due to rate limiting or cookie issues.',
    });
  }
});

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 4001;
  app.listen(PORT, () => {
    console.log(`Server is running on PORT: ${PORT}`);
  });
}

// Export for Vercel
module.exports = app;
