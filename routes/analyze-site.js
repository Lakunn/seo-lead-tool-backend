const express = require('express');
const puppeteer = require('puppeteer');
const router = express.Router();


async function extractPages(domain) {
const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '');


try {
await page.goto(`https://${cleanDomain}`, { waitUntil: 'domcontentloaded' });
const links = await page.evaluate(() =>
Array.from(document.querySelectorAll("a"))
.map((a) => a.href)
.filter((href) => href.includes(location.hostname))
);


const uniqueFilteredLinks = Array.from(new Set(links))
.filter(link => !/(mentions|contact|terms|login|admin|privacy)/i.test(link))
.slice(0, 10);


const pageData = [];
for (const link of uniqueFilteredLinks) {
await page.goto(link, { waitUntil: 'domcontentloaded' });
const text = await page.$eval('body', (el) => el.innerText);
const wordCount = text.split(/\s+/).filter(Boolean).length;
pageData.push({ url: link, wordCount });
}


await browser.close();
return pageData;
} catch (e) {
console.error('Scraping error:', e);
await browser.close();
return null;
}
}


router.post('/', async (req, res) => {
const { domain } = req.body;
if (!domain) return res.status(400).json({ error: 'Aucun domaine fourni' });


const pages = await extractPages(domain);
if (!pages) return res.status(500).json({ error: "Impossible d'analyser le site" });


res.json({ domain, pages });
});


module.exports = router;