import express from "express";

import {
  getAllCompanies,
  getAllAdvisors,
  createAdvisor,
  updateAdvisor,
  resetAdvisorPassword,
  toggleAdvisorStatus,

  getPasswordResetRequests,
  completePasswordResetRequest,
  rejectPasswordResetRequest,

  createTemplate,
  getAllTemplates,
  updateTemplate,
  toggleTemplateStatus,
  deleteTemplate,

  getAdvisorPerformance,
  getAdvisorLeadsForAdmin,
} from "../controllers/adminController.js";

import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   COMPANY
========================= */
router.get("/companies", protect, adminOnly, getAllCompanies);

/* =========================
   ADVISOR MANAGEMENT
========================= */
router.get("/advisors", protect, adminOnly, getAllAdvisors);
router.post("/advisors", protect, adminOnly, createAdvisor);
router.put("/advisors/:advisorId", protect, adminOnly, updateAdvisor);
router.patch("/advisors/:advisorId/password", protect, adminOnly, resetAdvisorPassword);
router.patch("/advisors/:advisorId/toggle", protect, adminOnly, toggleAdvisorStatus);

/* =========================
   PASSWORD RESET REQUESTS
========================= */
router.get("/password-requests", protect, adminOnly, getPasswordResetRequests);
router.post("/password-requests/:requestId/complete", protect, adminOnly, completePasswordResetRequest);
router.post("/password-requests/:requestId/reject", protect, adminOnly, rejectPasswordResetRequest);

/* =========================
   TEMPLATE MANAGEMENT
========================= */
router.get("/templates", protect, adminOnly, getAllTemplates);
router.post("/templates", protect, adminOnly, createTemplate);
router.put("/templates/:templateId", protect, adminOnly, updateTemplate);
router.patch("/templates/:templateId/toggle", protect, adminOnly, toggleTemplateStatus);
router.delete("/templates/:templateId", protect, adminOnly, deleteTemplate);

/* =========================
   PERFORMANCE
========================= */
router.get("/advisor-performance", protect, adminOnly, getAdvisorPerformance);
router.get("/advisor-leads/:advisorId", protect, adminOnly, getAdvisorLeadsForAdmin);
router.get("/advisors/:advisorId/leads", protect, adminOnly, getAdvisorLeadsForAdmin);
router.get("/advisor-performance", protect, adminOnly, getAdvisorPerformance);
router.get("/advisors/performance", protect, adminOnly, getAdvisorPerformance);
export default router;