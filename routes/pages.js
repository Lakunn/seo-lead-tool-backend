const express = require("express");
const puppeteer = require("puppeteer");

const router = express.Router();

/* 🔥 Liste noire de mots-clés pour exclure les pages inutiles */
const blacklist = [
  "mentions", "cgu", "cgv", "cookie", "privacy",
  "legal", "terms", "conditions", "contact", "admin", "login"
];

/* ✅ Fonction pour filtrer les liens */
function isRelevantUrl(url, domain) {
  if (!url.startsWith(domain)) return false;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl === domain || lowerUrl === domain + "/") return false;
  return !blacklist.some(keyword => lowerUrl.includes(keyword));
}

/* ✅ Fonction pour normaliser le domaine */
function normalizeDomain(input) {
  let domain = input.trim();
  if (!domain.startsWith("http://") && !domain.startsWith("https://")) {
    domain = "https://" + domain;
  }
  if (domain.endsWith("/")) {
    domain = domain.slice(0, -1);
  }
  return domain;
}

/* ✅ Fonction principale : récupérer les liens */
async function getLinksWithPuppeteer(domain) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto(domain, { waitUntil: "networkidle2", timeout: 20000 });

  // ✅ Récupérer tous les liens <a>
  const links = await page.$$eval("a[href]", anchors =>
    anchors.map(a => a.href)
  );

  await browser.close();

  // ✅ Supprimer doublons et filtrer les liens
  const uniqueLinks = [...new Set(links)];
  const relevantLinks = uniqueLinks.filter(url => isRelevantUrl(url, domain));

  return relevantLinks.slice(0, 10); // ✅ Limiter à 10 pages
}

/* ✅ Route POST /pages */
router.post("/", async (req, res) => {
  const rawInput = req.body.domain || req.body.url;
  if (!rawInput) return res.status(400).json({ error: "Aucun domaine fourni" });

  const domain = normalizeDomain(rawInput);
  console.log("✅ Domaine normalisé :", domain);

  try {
    const pages = await getLinksWithPuppeteer(domain);
    console.log("✅ Pages sélectionnées :", pages);

    res.json({ pages });
  } catch (e) {
    console.error("Erreur collecte des pages :", e.message);
    res.status(500).json({ error: "Impossible de récupérer les pages du domaine" });
  }
});

module.exports = router;
