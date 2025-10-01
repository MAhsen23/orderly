const express = require('express');
const router = express.Router();
const controller = require('../controller/controller');
const { auth } = require('../middleware/auth');

router.post('/users', controller.createUser);
router.post('/login', controller.login);
router.post('/verify/:id', controller.verifyOTP);
router.post('/profile-setup', auth, controller.profileSetup);
router.post('/users/notes', auth, controller.notes);
router.post('/roulette/suggest-restaurant', controller.getSuggestedRestaurant);
router.post('/roulette/suggest-restaurant-kimi', controller.getSuggestedRestaurantKimi);
router.get('/roulette/suggestions', controller.getRestaurantSuggestions);
module.exports = router;
