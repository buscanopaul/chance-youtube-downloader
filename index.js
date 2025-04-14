const express = require('express');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');

const app = express();
var cors = require('cors');
app.use(cors());

// Load cookies from cookies.json file
let cookiesString = '';
try {
  const cookiesPath = path.join(__dirname, 'cookies.json');
  const cookiesJson = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));

  // Convert cookies JSON to string format ytdl-core expects
  if (Array.isArray(cookiesJson)) {
    cookiesString = cookiesJson
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');
  } else {
    // Handle if cookies.json has a different structure
    cookiesString = JSON.stringify(cookiesJson);
  }
  console.log('Cookies loaded successfully');
} catch (error) {
  console.error('Error loading cookies:', error.message);
}

app.get('/download', async (req, res) => {
  try {
    const url = req.query.url;
    const videoId = await ytdl.getURLVideoID(url);

    // Pass cookies in the request options
    const requestOptions = {
      requestOptions: {
        headers: {
          Cookie: cookiesString,
        },
      },
    };

    const metaInfo = await ytdl.getInfo(url, requestOptions);
    let data = {
      url: 'https://www.youtube.com/embed/' + videoId,
      info: metaInfo.formats,
    };
    return res.send(data);
  } catch (error) {
    console.error('Error in download route:', error.message);
    return res.status(500).send({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
