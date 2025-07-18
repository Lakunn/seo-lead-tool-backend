const express = require("express");
const router = express.Router();

/* 🔥 Calcul des scores */
function computeScores(data) {
  function computeFreshnessScore() {
    if (!data.freshness.foundDate) return 20;
    const days = data.freshness.daysOld;
    if (days <= 30) return 90;
    if (days <= 365) return 70;
    if (days <= 1095) return 50;
    return 20;
  }

  function computeExtractibilityScore() {
    let score = 0;
    if (data.extractibility.h1Count >= 1) score += 20;
    if (data.extractibility.h2Count >= 2) score += 20;
    if (data.extractibility.hasSchemaOrg) score += 30;
    if (data.extractibility.hasMetaDescription) score += 30;
    return Math.min(score, 100);
  }

  function computeOriginalityScore() {
    const ratio = data.originality.uniqueWordRatio;
    if (ratio > 0.7) return 90;
    if (ratio > 0.5) return 70;
    if (ratio > 0.3) return 50;
    return 20;
  }

  function computeClarityScore() {
    const avgSentence = data.clarity.avgSentenceLength;
    if (avgSentence <= 15) return 90;
    if (avgSentence <= 20) return 70;
    if (avgSentence <= 30) return 50;
    return 30;
  }

  const freshness = computeFreshnessScore();
  const extractibility = computeExtractibilityScore();
  const originality = computeOriginalityScore();
  const clarity = computeClarityScore();
  const global = Math.round((freshness + extractibility + originality + clarity) / 4);

  return { freshness, extractibility, originality, clarity, global };
}

/* ✅ Route POST /compute */
router.post("/", (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: "Pas de données fournies" });

  const scores = computeScores(data);
  res.json({
    scores // ✅ Scores calculés
  });
});

module.exports = router;
