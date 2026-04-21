import express from "express";
import {
  registerAdmin,
  login,
  forgotPasswordRequest,
  getMe,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register-admin", registerAdmin);
router.post("/login", login);
router.post("/forgot-password-request", forgotPasswordRequest);
router.get("/me", protect, getMe);

export default router;