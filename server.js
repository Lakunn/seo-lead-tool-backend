const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const analyzeRoute = require('./routes/analyze-site');
const reportRoute = require('./routes/generate-report');
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json());


connectDB();


app.use('/analyze-site', analyzeRoute);
app.use('/generate-report', reportRoute);


app.listen(5000, () => console.log('✅ Backend running on http://localhost:5000'));