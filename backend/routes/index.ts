import express from "express";
const router = express.Router();

/* GET home page. */
router.get("/", function (_req, res, _next) {
  res.json({ response: "Success" });
});

export default router;
