const express = require('express');
const router = express.Router();
const controller = require('../controller/controller');

router.post('/users', controller.createUser);
router.get('/users/:id', controller.getUser);
router.post('/login', controller.login);
router.post('/setup', controller.profileSetup);

router.get('/predict/:id', controller.predict);
module.exports = router;
