const express = require('express');
const youtubeDl = require('youtube-dl-exec');

const app = express();
app.use(require('cors')());

app.get('/', (req, res) => {
  res.send('YouTube to MP4 API is running');
});

app.get('/download', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).send({ error: 'URL is required' });
    }

    // Get video info using youtube-dl
    const output = await youtubeDl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
    });

    const videoId = url.includes('v=')
      ? url.split('v=')[1].split('&')[0]
      : output.id;

    let data = {
      url: 'https://www.youtube.com/embed/' + videoId,
      info: output.formats,
    };

    return res.send(data);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
