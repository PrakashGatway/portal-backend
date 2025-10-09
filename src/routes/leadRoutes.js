import express from 'express';
import {
    getAllLeads,
    getLeadById,
    createLead,
    updateLead,
    deleteLead,
    getLeadStats,
    addNoteToLead
} from '../controllers/leadController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
    .get(protect, getAllLeads)
    .post(createLead);

router.route('/stats')
    .get(protect, getLeadStats);

router.route('/:id/notes').post(protect,addNoteToLead)

router.route('/:id')
    .get(protect, getLeadById)
    .put(protect, updateLead)
    .delete(protect, deleteLead);

export default router;