import express from "express";
import {
  createBanner,
  getAllBanners,
  updateBanner,
  deleteBanner,
} from "../controllers/bannerController.js";

const router = express.Router();

router.post("/", createBanner);
router.get("/", getAllBanners);
router.put("/:id", updateBanner);
router.delete("/:id", deleteBanner);

export default router;