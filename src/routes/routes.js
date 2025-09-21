import express from 'express';
import { auth } from '../middleware/auth.js';
import { createUser, getSuggestedRestaurant, login, notes, profileSetup, verifyOTP } from '../controller/controller.js';

const router = express.Router();

router.post('/users', createUser);
router.post('/login', login);
router.post('/verify/:id', verifyOTP);
router.post('/profile-setup', auth, profileSetup);
router.post('/users/notes', auth, notes);
router.post('/roulette/suggest-restaurant', getSuggestedRestaurant);

export default router;
