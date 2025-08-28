const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());             // ✅ Autorise les requêtes cross-origin
app.use(express.json());     // ✅ Permet de lire les JSON dans req.body
app.use(express.urlencoded({ extended: true })); // ✅ Supporte aussi les formulaires

// ✅ Importer les routes
const computeRoute = require("./routes/compute");
const pagesRoute = require("./routes/pages");
const analyzeRoute = require("./routes/analyze-site");
const discoverRoute = require("./routes/discover");


// ✅ Utiliser les routes
app.use("/compute", computeRoute);
app.use("/pages", pagesRoute);
app.use("/analyze-site", analyzeRoute);
app.use("/discover", discoverRoute);


app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));