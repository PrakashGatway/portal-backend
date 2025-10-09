import express from 'express';
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateUserStatus
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All routes require authentication

router.route('/')
  .get(authorize('admin', 'super_admin'), getUsers);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(authorize('admin', 'super_admin'), deleteUser);


router.put('/:id/status', authorize('admin', 'super_admin'), updateUserStatus)

export default router;