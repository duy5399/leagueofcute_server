const mongoose = require("mongoose");

const rerollProbabilitySchema = new mongoose.Schema({
    level: Number,
    tier1: Number,
    tier2: Number,
    tier3: Number,
    tier4: Number,
    tier5: Number
});
//rerollProbabilitySchema.index({ level: 1});
module.exports = mongoose.model("rerollProbability", rerollProbabilitySchema);