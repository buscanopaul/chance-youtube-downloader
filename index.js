const express = require('express');
const ytdl = require('@distube/ytdl-core');

const app = express();
var cors = require('cors');
app.use(cors());

app.get('/download', async (req, res) => {
  try {
    const url = req.query.url;
    const videoId = await ytdl.getURLVideoID(url);
    const metaInfo = await ytdl.getInfo(url);
    let data = {
      url: 'https://www.youtube.com/embed/' + videoId,
      info: metaInfo.formats,
    };
    return res.send(data);
  } catch (error) {
    return res.status(500);
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
