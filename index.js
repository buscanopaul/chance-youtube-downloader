const express = require('express');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');

const app = express();
var cors = require('cors');
app.use(cors());

app.get('/download', async (req, res) => {
  try {
    const videoId = req.query.videoId;

    const agent = ytdl.createAgent(JSON.parse(fs.readFileSync('cookies.json')));

    const metaInfo = await ytdl.getInfo(
      `http://www.youtube.com/watch?v=${videoId}`,
      { agent }
    );
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
