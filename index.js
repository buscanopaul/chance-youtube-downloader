const express = require('express');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');

const app = express();
var cors = require('cors');
app.use(cors());

// Load cookies once at startup
let cookies;
try {
  cookies = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'cookies.json'), 'utf8')
  );
  console.log('Cookies loaded successfully');
} catch (error) {
  console.error('Error loading cookies:', error.message);
  cookies = [];
}

// Queue system to limit concurrent requests
const requestQueue = [];
let processingRequest = false;

async function processQueue() {
  if (processingRequest || requestQueue.length === 0) return;

  processingRequest = true;
  const { videoId, res, retryCount } = requestQueue.shift();

  try {
    await handleDownload(videoId, res, retryCount);
  } catch (error) {
    console.error('Error processing queued request:', error);
  } finally {
    processingRequest = false;
    setTimeout(processQueue, 1000); // Add delay between requests
  }
}

async function handleDownload(videoId, res, retryCount = 0) {
  try {
    // Create agent with cookies
    const agent = ytdl.createAgent(cookies);

    // Add delay for retry attempts
    if (retryCount > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryCount * 2000));
    }

    const metaInfo = await ytdl.getInfo(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        agent,
        requestOptions: {
          headers: {
            // Add headers to appear more like a browser
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            Connection: 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
        },
      }
    );

    let data = {
      url: 'https://www.youtube.com/embed/' + videoId,
      info: metaInfo.formats,
    };
    return res.send(data);
  } catch (error) {
    console.error(
      `Error in download route (attempt ${retryCount + 1}):`,
      error.message
    );

    // Retry logic for 429 errors
    if (error.message.includes('429') && retryCount < 3) {
      console.log(
        `Retrying request for videoId ${videoId}, attempt ${retryCount + 1}`
      );
      requestQueue.push({ videoId, res, retryCount: retryCount + 1 });
      processQueue();
    } else {
      return res.status(500).send({
        error: error.message,
        message:
          'Failed to fetch video info after retries or encountered a non-429 error',
      });
    }
  }
}

app.get('/download', async (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) {
    return res.status(400).send({ error: 'Video ID is required' });
  }

  // Add request to queue
  requestQueue.push({ videoId, res, retryCount: 0 });
  processQueue();
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
