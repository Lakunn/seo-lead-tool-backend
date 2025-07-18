const express = require("express");
const router = express.Router();

function computeScores(data) {
  // ✅ Pondération
  function computeFreshnessScore() {
    if (!data.freshness.foundDate) return 10;
    const days = data.freshness.daysOld;
    if (days <= 90) return 90;
    if (days <= 180) return 60;
    return 30;
  }

  function computeExtractibilityScore() {
    let score = 0;
    if (data.extractibility.schemaCount > 0) score += 30;
    if (data.extractibility.h1Count >= 1) score += 20;
    if (data.extractibility.h2Count >= 2) score += 20;
    if (data.extractibility.hasMetaDescription) score += 30;
    return Math.min(score, 100);
  }

  function computeOriginalityScore() {
    if (data.originality.keywordStuffingDetected) return 20; // ❌ Mauvais
    const ratio = data.originality.uniqueWordRatio;
    if (ratio > 0.7) return 90;
    if (ratio > 0.5) return 70;
    return 40;
  }

  function computeClarityScore() {
    const flesch = data.clarity.fleschScore;
    if (flesch >= 80) return 90;
    if (flesch >= 60) return 70;
    if (flesch >= 40) return 50;
    return 30;
  }

  const freshness = computeFreshnessScore();
  const extractibility = computeExtractibilityScore();
  const originality = computeOriginalityScore();
  const clarity = computeClarityScore();

  // ✅ Pondération
  const global = Math.round(
    (freshness * 0.2 + extractibility * 0.2 + originality * 0.3 + clarity * 0.3)
  );

  return {
    freshness,
    extractibility,
    originality,
    clarity,
    global,
    labels: {
      freshness: getScoreLabel(freshness),
      extractibility: getScoreLabel(extractibility),
      originality: getScoreLabel(originality),
      clarity: getScoreLabel(clarity),
      global: getScoreLabel(global)
    }
  };
}

function getScoreLabel(score) {
  if (score >= 90) return "Excellent ✅";
  if (score >= 70) return "Bon 👍";
  if (score >= 50) return "Moyen ⚠️";
  return "À améliorer ❌";
}

router.post("/", (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: "Pas de données fournies" });

  const scores = computeScores(data);
  res.json({ scores });
});

module.exports = router;
