// 📁 backend/routes/discover.js
const express = require("express");
const puppeteer = require("puppeteer");
const { URL } = require("url");

const router = express.Router();

// 🔍 Filtre les URLs non intéressantes
const excludedPaths = ["mentions", "contact", "legal", "privacy", "politique", "terms", "conditions"];

function isPageRelevant(urlPath) {
  return !excludedPaths.some(keyword => urlPath.toLowerCase().includes(keyword));
}

// 🔥 Fonction pour découvrir les pages du site (homepage + 1er niveau de liens internes)
async function discoverPages(baseUrl) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: 20000 });

  // Extraire tous les liens internes de la homepage
  let urls = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href]")).map(a => a.href);
  });

  // Nettoyage des URLs (uniquement le même domaine, sans doublons, sans ancres)
  const baseDomain = new URL(baseUrl).hostname;
  const filtered = [...new Set(urls)]
    .filter(link => {
      try {
        const parsed = new URL(link);
        return parsed.hostname.endsWith(baseDomain) && isPageRelevant(parsed.pathname);
      } catch {
        return false;
      }
    })
    .slice(0, 25); // limiter pour rapidité

  const pageDetails = [];

  for (const link of filtered) {
    try {
      const p = await browser.newPage();
      await p.goto(link, { waitUntil: "domcontentloaded", timeout: 15000 });
      const wordCount = await p.evaluate(() => document.body.innerText.split(/\s+/).length);
      const h1Count = await p.evaluate(() => document.querySelectorAll("h1").length);
      const hasForm = await p.evaluate(() => !!document.querySelector("form, input[type='submit'], button"));
      await p.close();
      pageDetails.push({ url: link, wordCount, h1Count, hasForm });
    } catch {
      continue;
    }
  }

  await browser.close();

  // 🧠 Sélectionner 10 pages : 5 avec beaucoup de texte, 5 avec un formulaire ou CTA
  const infoPages = pageDetails
    .filter(p => !p.hasForm)
    .sort((a, b) => b.wordCount - a.wordCount)
    .slice(0, 5);

  const conversionPages = pageDetails
    .filter(p => p.hasForm)
    .slice(0, 5);

  return [...infoPages, ...conversionPages];
}

// ✅ Route POST /discover
router.post("/", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Aucune URL fournie" });

  try {
    const formattedUrl = url.startsWith("http") ? url : `https://${url}`;
    const pages = await discoverPages(formattedUrl);
    res.json({ pages });
  } catch (e) {
    console.error("Erreur /discover:", e.message);
    res.status(500).json({ error: "Échec de la découverte des pages" });
  }
});

module.exports = router;
