const express = require("express");
const puppeteer = require("puppeteer");
const { URL } = require("url");

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

function fleschReadingEase(text) {
  const sentences = text.split(/[.!?]/).filter(Boolean).length || 1;
  const words = text.split(/\s+/).filter(Boolean);
  const syllables = words.reduce((acc, word) => acc + countSyllables(word), 0);
  return 206.835 - (1.015 * (words.length / sentences)) - (84.6 * (syllables / words.length));
}

/* 🧠 Fonction pour récupérer les pages pertinentes */
async function discoverRelevantPages(domain) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  const fullUrl = domain.startsWith("http") ? domain : `https://${domain}`;

  await page.goto(fullUrl, { waitUntil: "networkidle2", timeout: 30000 });

  const links = await page.$$eval("a[href]", anchors =>
    anchors
      .map(a => a.href)
      .filter(href =>
        href.startsWith("http") &&
        !href.includes("mailto:") &&
        !href.includes("tel:") &&
        !href.includes("javascript:") &&
        !href.includes("#") &&
        !href.match(/(mentions-legales|cookies|privacy|politique|login|contact|faq)/i)
      )
  );

  // Nettoyage + dédoublonnage
  const urlObj = new URL(fullUrl);
  const baseDomain = urlObj.hostname.replace(/^www\./, "");
  const sameDomainLinks = [...new Set(links)].filter(link => link.includes(baseDomain));

  await browser.close();

  return sameDomainLinks.slice(0, 10); // Top 10
}

/* 🔎 Fonction : analyse d'une page unique */
async function analyzePage(url) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

  // Supprimer les éléments non informatifs
  await page.evaluate(() => {
    document.querySelectorAll("header, footer, nav, aside").forEach(el => el.remove());
  });

  // Texte brut
  const rawText = await page.$eval("body", body => body.innerText);

  const words = rawText
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim()
    .split(" ")
    .filter(Boolean);
  const uniqueWords = new Set(words);

  const stats = await page.evaluate(() => {
    const tagCounts = {};
    document.querySelectorAll("*").forEach(el => {
      const tag = el.tagName.toLowerCase();
      if (!["script", "style", "noscript", "svg"].includes(tag)) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    });

    const internalLinks = Array.from(document.querySelectorAll("a[href]"))
      .filter(a => a.href.startsWith(location.origin)).length;

    const subdomainLinks = Array.from(document.querySelectorAll("a[href]"))
      .filter(a =>
        new URL(a.href).hostname.endsWith(location.hostname) &&
        new URL(a.href).hostname !== location.hostname
      ).length;

    const externalLinks = Array.from(document.querySelectorAll("a[href]"))
      .filter(a => !a.href.includes(location.hostname)).length;

    const schemaTags = Array.from(document.querySelectorAll("[type='application/ld+json']"))
      .map(el => {
        try {
          return JSON.parse(el.textContent);
        } catch {
          return null;
        }
      }).filter(Boolean);

    const modifiedMeta =
      document.querySelector("meta[property='article:modified_time']") ||
      document.querySelector("meta[name='lastmod']") ||
      document.querySelector("meta[name='last-modified']");

    return {
      tagCounts,
      internalLinks,
      externalLinks,
      subdomainLinks,
      h1Count: document.querySelectorAll("h1").length,
      h2Count: document.querySelectorAll("h2").length,
      hasMetaDescription: !!document.querySelector("meta[name='description']"),
      schemaTypes: schemaTags.map(s => s["@type"] || "unknown"),
      lastModified: modifiedMeta?.content || null
    };
  });

  await browser.close();

  const fleschScore = fleschReadingEase(rawText);
  const freshnessScore = stats.lastModified
    ? new Date().getTime() - new Date(stats.lastModified).getTime()
    : null;

  return {
    url,
    readability: {
      fleschScore,
      level: fleschScore > 60 ? "Bon" : fleschScore > 30 ? "Moyen" : "Faible"
    },
    originality: {
      totalWords: words.length,
      uniqueWordRatio: uniqueWords.size / Math.max(words.length, 1)
    },
    structure: {
      ...stats
    },
    freshness: {
      lastModified: stats.lastModified || "inconnue",
      score: freshnessScore !== null
        ? freshnessScore > 15552000000 ? "Mauvais" // > 180j
        : freshnessScore > 7776000000 ? "Moyen" // > 90j
        : "Bon"
        : "Inconnu"
    }
  };
}

/* ✅ Route POST /analyze-site */
router.post("/", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Aucune URL fournie" });

  try {
    const relevantPages = await discoverRelevantPages(url);

    if (!relevantPages.length) {
      return res.status(404).json({ error: "Aucune page pertinente trouvée" });
    }

    const results = [];
    for (const pageUrl of relevantPages) {
      try {
        const data = await analyzePage(pageUrl);
        results.push(data);
      } catch (err) {
        results.push({ url: pageUrl, error: "Échec de l'analyse" });
      }
    }

    res.json({ domaine: url, total: results.length, analyses: results });
  } catch (err) {
    console.error("Erreur dans /analyze-site:", err);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

module.exports = router;
