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
router.get('/roulette/suggestions', controller.getRestaurantSuggestions);
router.post('/website/check-status', controller.checkWebsiteStatus);
router.post('/road-trip/plan-grok', controller.planRoadTripWithGrok);
router.get('/road-trips', controller.getRoadTrips);
router.post('/restaurants/top', auth, controller.getTopRestaurants);

module.exports = router;
