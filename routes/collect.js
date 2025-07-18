const express = require("express");
const axios = require("axios");
const { JSDOM } = require("jsdom");

const router = express.Router();

/* 🔥 Extraction des données brutes */
function extractPageData(dom, url) {
  const text = dom.body.textContent || "";
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  const uniqueWords = new Set(words);

  const metaDate = dom.querySelector("meta[name*='date'], meta[property*='date'], meta[itemprop*='date']")?.content;
  const urlDateMatch = url.match(/(20\d{2})\/(\d{2})\/(\d{2})/);
  const date = metaDate ? new Date(metaDate) :
              urlDateMatch ? new Date(`${urlDateMatch[1]}-${urlDateMatch[2]}-${urlDateMatch[3]}`) :
              null;

  return {
    freshness: {
      foundDate: date ? date.toISOString() : null,
      daysOld: date ? Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)) : null
    },
    extractibility: {
      h1Count: dom.querySelectorAll("h1").length,
      h2Count: dom.querySelectorAll("h2").length,
      hasSchemaOrg: !!dom.querySelector("script[type='application/ld+json']"),
      hasMetaDescription: !!dom.querySelector("meta[name='description']")
    },
    originality: {
      totalWords: words.length,
      uniqueWordRatio: uniqueWords.size / Math.max(words.length, 1)
    },
    clarity: {
      avgSentenceLength: text.split(/[.!?]/).reduce((acc, s) => acc + s.trim().split(/\s+/).length, 0) /
                        Math.max(text.split(/[.!?]/).length, 1),
      listCount: dom.querySelectorAll("ul,ol").length
    }
  };
}

/* ✅ Route POST /collect */
router.post("/", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Aucune URL fournie" });

  try {
    const apiRes = await axios.get(url, { timeout: 10000 });
    const dom = new JSDOM(apiRes.data).window.document;
    const data = extractPageData(dom, url);

    res.json({
      url,
      data // ✅ Données brutes
    });
  } catch (e) {
    console.error("Erreur collecte:", e.message);
    res.status(500).json({ error: "Impossible d'analyser la page" });
  }
});

module.exports = router;
