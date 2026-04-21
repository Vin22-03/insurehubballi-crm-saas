import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createLead,
  getLeads,
  getLeadActivities,
  getMyLeads,
  updateLead,
  createLeadActivity,
} from "../controllers/leadController.js";

const router = express.Router();

router.post("/", protect, createLead);
router.get("/", protect, getLeads);

router.get("/my", protect, getMyLeads);
router.patch("/:leadId", protect, updateLead);

router.post("/:leadId/activities", protect, createLeadActivity);
router.get("/:leadId/activities", protect, getLeadActivities);

export default router;