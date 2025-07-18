const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ Backend API is running!");
});

app.post("/analyze", (req, res) => {
  const { url } = req.body;
  res.json({
    url,
    scores: {
      visibility: 80,
      freshness: 70,
      extractability: 90,
      originality: 60,
      clarity: 75,
    },
    globalScore: 75,
  });
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
