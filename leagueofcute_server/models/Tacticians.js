const mongoose = require("mongoose");

const tacticianSchema = new mongoose.Schema({
    itemID: { type: String, required: true },
    itemClass: { type: String, required: true },
    displayName: { type: String, required: true },
    displayImage: { type: String, required: true },
    price: { 
        currency: { type: String },
        amount: { type: Number } },    
});
module.exports = mongoose.model("tactician", tacticianSchema);