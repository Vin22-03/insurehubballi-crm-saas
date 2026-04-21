import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getTemplatesForAdvisor } from "../controllers/templateController.js";

const router = express.Router();

router.get("/", protect, getTemplatesForAdvisor);

export default router;