const { MenstrualCycle, User } = require('../models/model');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.createUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = new User({ name, email, password });
        await user.save();
        res.status(201).json({ message: 'success', user: user._id });
    } catch (error) {
        res.status(500).json({ message: 'error', error: error.message });
    }
};

exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'error', error: 'User not found' });
        }
        const lastCycle = await MenstrualCycle.findOne({ user: req.params.id }).sort({ cycleStartDate: -1 });
        const { name, email, birthYear, averageCycleLength, averagePeriodDuration, isProfileComplete } = user;
        const lastPeriodStartDate = lastCycle ? lastCycle.cycleStartDate : null;

        res.status(200).json({
            message: 'success',
            user: { name, email, birthYear, averageCycleLength, averagePeriodDuration, isProfileComplete, lastPeriodStartDate }
        });
    } catch (error) {
        res.status(500).json({ message: 'error', error: error.message });
    }
};

exports.login = async (req, res) => {
    console.log("what is the data in login", req.body)
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        console.log(user)
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'error', error: "Invalid credentials" });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.status(200).json({ message: 'success', token, user: user._id, isProfileComplete: user.isProfileComplete });
    } catch (error) {
        res.status(500).json({ message: 'error', error: error.message });
    }
};


exports.profileSetup = async (req, res) => {
    try {
        const { userId, birthYear, menstrualCycle, averageCycleLength, lastPeriodStartDate, averagePeriodDuration } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'error', error: 'User not found' });
        }
        user.birthYear = birthYear;
        user.averageCycleLength = averageCycleLength;
        user.averagePeriodDuration = averagePeriodDuration;
        user.menstrualCycle = menstrualCycle;
        user.isProfileComplete = true;
        await user.save();
        const newCycle = new MenstrualCycle({
            user: userId,
            cycleStartDate: lastPeriodStartDate,
            cycleDuration: averagePeriodDuration
        });
        await newCycle.save();
        res.status(200).json({ message: 'success', user: user._id, isProfileComplete: true });
    } catch (error) {
        res.status(500).json({ message: 'error', error: error.message });
    }
};