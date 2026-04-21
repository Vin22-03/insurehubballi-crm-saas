import express from "express";
import {
  createAdvisor,
  getPasswordResetRequests,
  completePasswordResetRequest,
  rejectPasswordResetRequest,
  getAllCompanies,
  getAllAdvisors,
  createTemplate,
  getAllTemplates,
  updateAdvisor,
resetAdvisorPassword,
toggleAdvisorStatus,
updateTemplate,
toggleTemplateStatus,
deleteTemplate,
getAdvisorPerformance,
getAdvisorLeadsForAdmin,
} from "../controllers/adminController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/advisors", protect, adminOnly, createAdvisor);
router.get("/advisors", protect, adminOnly, getAllAdvisors);
router.post("/templates", protect, adminOnly, createTemplate);
router.get("/templates", protect, adminOnly, getAllTemplates);
router.get("/advisors/performance", protect, adminOnly, getAdvisorPerformance);
router.get(
  "/advisors/:advisorId/leads",
  protect,
  adminOnly,
  getAdvisorLeadsForAdmin
);


router.get("/companies", protect, adminOnly, getAllCompanies);

router.get("/password-reset-requests", protect, adminOnly, getPasswordResetRequests);
router.patch(
  "/password-reset-requests/:requestId/complete",
  protect,
  adminOnly,
  completePasswordResetRequest
);
router.patch(
  "/password-reset-requests/:requestId/reject",
  protect,
  adminOnly,
  rejectPasswordResetRequest
);
router.patch("/advisors/:advisorId", protect, adminOnly, updateAdvisor);
router.patch("/advisors/:advisorId/password", protect, adminOnly, resetAdvisorPassword);
router.patch("/advisors/:advisorId/status", protect, adminOnly, toggleAdvisorStatus);
router.patch("/templates/:templateId", protect, adminOnly, updateTemplate);
router.patch("/templates/:templateId/status", protect, adminOnly, toggleTemplateStatus);
router.delete("/templates/:templateId", protect, adminOnly, deleteTemplate);
export default router;