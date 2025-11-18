import express from 'express';
import {
    getAllTickets,
    getTicketById,
    createTicket,
    updateTicket,
    deleteTicket,
    addReply,
    closeTicket,
    getUserTickets,
    getTicketStats
} from '../controllers/supportController.js';
import {  authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// User routes
router.route('/')
    .get(getAllTickets)
    .post(createTicket);

router.get('/my-tickets', getUserTickets);
router.use('/admin', authorize(['admin', 'support']));

router.get('/admin/stats', getTicketStats);
router.get('/admin/:id', getTicketById);
router.put('/admin/:id', updateTicket);
router.delete('/admin/:id', deleteTicket);
router.put('/admin/:id/close', closeTicket);

router.get('/:id', getTicketById);
router.put('/:id/reply', addReply);
router.put('/:id/close', closeTicket);

export default router;