const mongoose = require("mongoose");

const usersSchema = new mongoose.Schema({
    username: { type: String, required: [true, 'Please enter Username'] },
    password: { type: String, required: [true, 'Please enter Password'] },
    email: {
        type: String,
        match: [/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,'Please add a valid email address.',],
        required: [true, 'Please enter Email Address'],
        unique: true,
        lowercase: true,
        dropDups: true
      },
    profileImage: { 
        type: String, 
        default: 'Demacia_Crest_profileicon'},
    level: { 
        type: Number, 
        default: 1},
    rank: { 
        type: String, 
        default: 'Bronze'},
    points: { 
        type: Number, 
        default: 0},
    online: { 
        type: Boolean, 
        default: false},
    status: { 
        type: String, 
        default: 'I am the best'},
    socketID: { 
        type: String, 
        default: ''},
    lastLogin: { 
        type: String, 
        default: ''},
});
module.exports = mongoose.model("user", usersSchema);