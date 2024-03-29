const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
    username: { type: String, required: true },
    gold: { 
        type: Number, 
        default: 0},
    crystal: { 
        type: Number, 
        default: 0},
    tacticians: { 
        type: [String], 
        default: ['petavatar']},
    arenaSkins: { 
        type: [String], 
        default: ['battlefield1']},
    booms: { 
        type: [String], 
        default: ['boomArcadeBomb']}, 
    tacticianEquip: { 
        type: String, 
        default: 'petavatar'},  
    arenaSkinEquip: { 
        type: String, 
        default: 'battlefield1'},  
    boomEquip: { 
        type: String, 
        default: 'boomArcadeBomb'},    
});
module.exports = mongoose.model("inventory", inventorySchema);