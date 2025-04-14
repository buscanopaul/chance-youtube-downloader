const express = require('express');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');
const https = require('https');

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

// Create a custom https agent with longer timeout
const customAgent = new https.Agent({
  keepAlive: true,
  timeout: 30000,
  maxSockets: 1, // Limit concurrent connections
});

app.get('/download', async (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) {
    return res.status(400).send({ error: 'Video ID is required' });
  }

  try {
    // Use a random delay before processing request
    const delay = Math.floor(Math.random() * 1500) + 500;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Convert cookies to the format expected by ytdl
    const cookieJar = cookiesArray.map((cookie) => {
      return {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain || '.youtube.com',
        path: cookie.path || '/',
        expires: cookie.expirationDate
          ? new Date(cookie.expirationDate * 1000)
          : undefined,
      };
    });

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
          'Sec-Ch-Ua':
            '"Chromium";v="122", "Google Chrome";v="122", "Not:A-Brand";v="99"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
        },
        agent: customAgent,
      },
    };

    // Properly create a cookie string and add to headers
    if (cookieJar.length > 0) {
      const cookieString = cookieJar
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');
      options.requestOptions.headers.Cookie = cookieString;
    }

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
