import express from "express";
import {
  createBanner,
  getAllBanners,
  updateBanner,
  deleteBanner,
  getBanners
} from "../controllers/bannerController.js";

const router = express.Router();

router.post("/", createBanner);
router.get("/", getAllBanners);
router.get("/:id", getBanners);
router.put("/:id", updateBanner);
router.delete("/:id", deleteBanner);

export default router;