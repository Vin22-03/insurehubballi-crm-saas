import express from "express";
import { getProfile, updateProfile } from "../controllers/profileController.js";
import { protect } from "../middleware/authMiddleware.js";
import uploadProfilePhoto from "../middleware/uploadProfilePhoto.js";

const router = express.Router();

/**
 * GET PROFILE
 */
router.get("/me", protect, getProfile);

/**
 * UPDATE PROFILE (TEXT + PHOTO)
 */
router.put(
  "/me",
  protect,
  uploadProfilePhoto.fields([
  { name: "photo", maxCount: 1 },
  { name: "brandLogo", maxCount: 1 },
]), // file first
  updateProfile
);

export default router;