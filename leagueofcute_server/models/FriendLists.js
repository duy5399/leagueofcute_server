const mongoose = require("mongoose");

const friendListSchema = new mongoose.Schema({
    username: { type: String, required: true },
    friends: {
        type: [{
            friendName : { type: String, required: true },
            status: { type: Number, required: true },
        }],
        default: null
    },
});
module.exports = mongoose.model("friendList", friendListSchema);