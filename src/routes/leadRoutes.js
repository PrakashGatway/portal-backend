import express from 'express';
import {
    getAllLeads,
    getLeadById,
    createLead,
    updateLead,
    deleteLead,
    getLeadStats,
    addNoteToLead,
    bulkAddLeads,
    bulkDeleteLeads,
    getLeadStatusStats,
    bulkAssignCounselor
} from '../controllers/leadController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
    .get(protect, getAllLeads)
    .post(createLead);

router.route('/stats')
    .get(protect, getLeadStatusStats);

router.route('/:id/notes').post(protect, addNoteToLead)

router.route('/:id')
    .get(protect, getLeadById)
    .put(protect, updateLead)
    .delete(protect, authorize('admin', 'super_admin'), deleteLead);

router.route('/bulk')
    .post(protect, authorize('admin', 'super_admin'), bulkAddLeads)
    
router.route('/bulk/delete')
    .delete(protect, authorize('admin', 'super_admin'), bulkDeleteLeads)

router.route('/bulk/assign')
    .put(protect, authorize('admin', 'super_admin'), bulkAssignCounselor)

export default router;