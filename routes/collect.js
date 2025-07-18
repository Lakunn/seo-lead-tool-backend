const express = require("express");
const puppeteer = require("puppeteer");

const router = express.Router();

/* 🔥 Fonction : compter syllabes pour score Flesch */
function countSyllables(word) {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/* 🔥 Fonction : calculer le score Flesch Reading Ease */
function fleschReadingEase(text) {
  const sentences = text.split(/[.!?]/).filter(Boolean).length || 1;
  const words = text.split(/\s+/).filter(Boolean);
  const syllables = words.reduce((acc, word) => acc + countSyllables(word), 0);
  return 206.835 - (1.015 * (words.length / sentences)) - (84.6 * (syllables / words.length));
}

/* 🔥 Extraction des données brutes avec Puppeteer */
async function extractPageData(url) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

  // ✅ Supprimer header/footer/nav/aside
  await page.evaluate(() => {
    document.querySelectorAll("header, footer, nav, aside").forEach(el => el.remove());
  });

  // ✅ Récupérer texte brut
  const rawText = await page.$eval("body", body => body.innerText);

  // ✅ Analyse
  const words = rawText
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim()
    .split(" ")
    .filter(Boolean);

  const uniqueWords = new Set(words);

  const data = await page.evaluate(() => {
    const tagCounts = {};
    document.querySelectorAll("*").forEach(el => {
      const tag = el.tagName.toLowerCase();
      if (!["script", "style", "noscript", "svg"].includes(tag)) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    });

    const internalLinks = Array.from(document.querySelectorAll("a[href]"))
      .filter(a => a.href.startsWith(location.origin)).length;

    const externalLinks = Array.from(document.querySelectorAll("a[href]"))
      .filter(a => !a.href.startsWith(location.origin)).length;

    return {
      tagCounts,
      internalLinks,
      externalLinks,
      h1Count: document.querySelectorAll("h1").length,
      h2Count: document.querySelectorAll("h2").length,
      hasMetaDescription: !!document.querySelector("meta[name='description']")
    };
  });

  await browser.close();

  return {
    originality: {
      totalWords: words.length,
      uniqueWordRatio: uniqueWords.size / Math.max(words.length, 1),
    },
    clarity: {
      fleschScore: fleschReadingEase(rawText)
    },
    extractibility: data
  };
}

/* ✅ Route POST /collect */
router.post("/", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Aucune URL fournie" });

  try {
    const pageData = await extractPageData(url);
    res.json({ url, data: pageData });
  } catch (e) {
    console.error("Erreur collecte:", e.message);
    res.status(500).json({ error: "Impossible d'analyser la page" });
  }
});

module.exports = router;
