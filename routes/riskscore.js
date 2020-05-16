const router = require("express").Router();
const RiskScore = require("../models/RiskScore");

router.get("/riskscore", async (req, res) => {
  try {
    const result = await RiskScore.find().lean();
    // If no nominator found
    if (!(result.length > 0)) {
      res.json([]);
      return;
    }

    res.json(result);
  } catch (err) {
    res.status(400).send({ error: "Error", err });
  }
});

module.exports = router;
