const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ✅ Importer les routes
const collectRoute = require("./routes/collect");
const computeRoute = require("./routes/compute");

// ✅ Utiliser les routes
app.use("/collect", collectRoute);
app.use("/compute", computeRoute);

app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));
