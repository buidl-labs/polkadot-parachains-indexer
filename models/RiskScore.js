const mongoose = require("mongoose");

const RiskScore = new mongoose.Schema(
  {
    stashId: {
        type: String,
        maxlength: 255
    },
    riskScore: Number,
    slashCount: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("riskscore", RiskScore);
