import express from "express";
import {
    createEntity,
    getEntities,
    getEntityById,
    updateEntity,
    deleteEntity,
} from "../controllers/entityController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
    .get(getEntities)
    .post(protect, authorize('admin', 'super_admin'), createEntity);

router.route("/:id")
    .get(getEntityById)
    .put(protect, authorize('admin', 'super_admin'), updateEntity)
    .delete(protect, authorize('admin', 'super_admin'), deleteEntity);

export default router;