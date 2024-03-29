const mongoose = require("mongoose");

const traitsSchema = new mongoose.Schema({
    type: String,
    id: String,
    name: String,
    description: String,
    buffOn: String,
    breakpoint: Array,
    activeAtTheStartOfCombat: Boolean
});
module.exports = mongoose.model("traits", traitsSchema);