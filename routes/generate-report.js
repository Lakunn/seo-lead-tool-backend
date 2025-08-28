const express = require('express');
const { OpenAI } = require('openai');
const Report = require('../models/Report');
const router = express.Router();


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


router.post('/', async (req, res) => {
const { domain, pages, lead } = req.body;
try {
const prompt = `Tu es un expert SEO. Tu reçois des données analytiques pour 10 pages du site ${domain}. Voici les données : ${JSON.stringify(pages)}.
1. Déduis si le site est un e-commerce, SaaS, blog ou portfolio.
2. Devine l'industrie principale.
3. Attribue un score de 0 à 10 pour les critères : originalité, clarté, extractibilité, fraîcheur.
4. Génère un score global.
5. Donne 5 recommandations SEO spécifiques au type de site et à ses pages.`;


const completion = await openai.chat.completions.create({
model: 'gpt-4o',
messages: [{ role: 'user', content: prompt }],
});


const output = completion.choices[0].message.content;
const parsed = JSON.parse(output);


const report = new Report({
domain,
siteType: parsed.siteType,
industry: parsed.industry,
globalScore: parsed.globalScore,
criteriaScores: parsed.criteriaScores,
recommendations: parsed.recommendations,
analyzedPages: pages,
lead
});
await report.save();


res.json({ success: true, report });
} catch (e) {
console.error(e.message);
res.status(500).json({ error: "Erreur lors de la génération du rapport" });
}
});


module.exports = router;