import express from "express";
import { getProfile, updateProfile } from "../controllers/profileController.js";
import { protect } from "../middleware/authMiddleware.js";
import uploadProfilePhoto from "../middleware/uploadProfilePhoto.js";

const router = express.Router();

router.get("/me", protect, getProfile);
router.put("/me", protect, uploadProfilePhoto.single("photo"), updateProfile);

export default router;