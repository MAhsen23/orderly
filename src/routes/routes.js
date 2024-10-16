const express = require('express');
const router = express.Router();
const controller = require('../controller/controller');
const { auth } = require('../middleware/auth');

router.post('/users', controller.createUser);
router.get('/users/:id', auth, controller.getUser);
router.post('/login', controller.login);
router.post('/users/notes', auth, controller.addNotes);
router.post('/setup', controller.profileSetup);
module.exports = router;
