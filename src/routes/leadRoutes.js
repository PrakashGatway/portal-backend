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
    bulkDeleteLeads
} from '../controllers/leadController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
    .get(protect, getAllLeads)
    .post(createLead);

router.route('/stats')
    .get(protect, getLeadStats);

router.route('/:id/notes').post(protect, addNoteToLead)

router.route('/:id')
    .get(protect, getLeadById)
    .put(protect, updateLead)
    .delete(protect, authorize('admin', 'super_admin'), deleteLead);

router.route('/bulk')
    .post(protect, authorize('admin', 'super_admin'), bulkAddLeads)
    
router.route('/bulk/delete')
    .delete(protect, authorize('admin', 'super_admin'), bulkDeleteLeads)

export default router;