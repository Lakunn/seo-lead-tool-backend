const mongoose = require('mongoose');


const reportSchema = new mongoose.Schema({
domain: String,
siteType: String,
industry: String,
globalScore: Number,
criteriaScores: Object,
recommendations: [String],
analyzedPages: Array,
lead: {
name: String,
email: String
},
createdAt: {
type: Date,
default: Date.now
}
});


module.exports = mongoose.model('Report', reportSchema);