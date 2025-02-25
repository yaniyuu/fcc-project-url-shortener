require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
const bodyParser = require('body-parser');
const validUrl = require('valid-url');


const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;
// middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended : false }));

//connect MongoDB
mongoose
  .connect(process.env.MONGO_URI, { dbName: "fcc-urlshortener" })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

  //url schema
  const urlSchema = new mongoose.Schema({
    original_url: { type: String, required: true },
    short_url: { type: Number, required: true, unique: true },
  });

  const Url = mongoose.model("Url", urlSchema);


app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// handle POST
app.post("/api/shorturl", async (req, res) => {
  const { url } = req.body;

  if (!validUrl.isWebUri(url)) {
    return res.json({ error: "invalid url"});
  }
// DNS LOOKUP
try {
  const urlObj = new URL(url);
  dns.lookup(urlObj.hostname, async (err) => {
    if (err) {
      return res.json({ error: "Invalid url"});
    }

    try {
      const existingUrl = await Url.findOne({ original_url: url });
      if (existingUrl) {
        return res.json({
          original_url: existingUrl.original_url,
          short_url: existingUrl.short_url,
        });
      }

      const count = await Url.countDocuments();
      const newUrl = new Url({ original_url: url, short_url: count + 1 });
      await newUrl.save();

      res.json({ original_url: newUrl.original_url, short_url: newUrl.short_url });
    } catch (dbError) {
      res.json({ error: "Server error" });
    }
  });
} catch (error) {
  return res.json({ error: "Invalid url"});
}
});

app.get("/api/shorturl/:short_url", async (req, res) => {
  const { short_url } = req.params;

  try {
    const foundUrl = await Url.findOne({ short_url: parseInt(short_url) });

    if (!foundUrl) {
      return res.json({ error: "No short URL found" });
    }

    res.redirect(foundUrl.original_url);
  } catch (err) {
    res.json({ error: "Server error" });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
