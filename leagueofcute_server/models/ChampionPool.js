const mongoose = require("mongoose");

const championPoolSchema = new mongoose.Schema({
    championName: String,
    tier: Number,
    buyPrice: Number,
    border: String,
    background: String,
    attackRange: Number,
    attackSpeed: Number,
    abilityPower: Number,
    mana: Number,
    startMana: Number,
    armor: Number,
    magicResistance: Number,
    critRate: Number,
    abilityName: String,
    abilityIcon: String,
    abilityDescription: String,
    level : Array
});
//championPoolSchema.index({ tier: 1 });
module.exports = mongoose.model("championPool", championPoolSchema);