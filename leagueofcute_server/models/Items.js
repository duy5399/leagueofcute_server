const mongoose = require("mongoose");

const itemsSchema = new mongoose.Schema({
    type: String,
    id: String,
    name: String,
    icon: String,
    stats: Array,
    description: String,
    typeItem: String,
    slotRequired: Number,
    isUnique: Boolean,
    recipe: Object
});
module.exports = mongoose.model("items", itemsSchema);