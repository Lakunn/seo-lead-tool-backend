const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());             // ✅ Autorise les requêtes cross-origin
app.use(express.json());     // ✅ Permet de lire les JSON dans req.body
app.use(express.urlencoded({ extended: true })); // ✅ Supporte aussi les formulaires

// ✅ Importer les routes
const collectRoute = require("./routes/collect");
const computeRoute = require("./routes/compute");
const pagesRoute = require("./routes/pages");

// ✅ Utiliser les routes
app.use("/collect", collectRoute);
app.use("/compute", computeRoute);
app.use("/pages", pagesRoute);

app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));