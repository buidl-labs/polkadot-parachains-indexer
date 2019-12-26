const mongoose = require("mongoose");

const Intention = new mongoose.Schema({
    intentions: [String],
    validatorsAndIntentions: [String],
}, {timestamp: true});

module.exports = mongoose.model("intentions", Intention);