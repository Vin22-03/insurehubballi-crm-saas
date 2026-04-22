import express from "express";
import {
  createResource,
  getAdminResources,
  getAdvisorResources,
  updateResourceStatus,
  deleteResource,
  updateResource,
} from "../controllers/resourceController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import uploadResourceFile from "../middleware/uploadResourceFile.js";

const router = express.Router();

router.get("/advisor", protect, getAdvisorResources);

router.get("/admin", protect, adminOnly, getAdminResources);
router.post(
  "/admin",
  protect,
  adminOnly,
  uploadResourceFile.single("file"),
  createResource
);
router.patch("/admin/:id/status", protect, adminOnly, updateResourceStatus);
router.delete("/admin/:id", protect, adminOnly, deleteResource);
router.patch("/admin/:id", protect, adminOnly, updateResource);
export default router;