const { MenstrualCycle, User } = require('../models/model');
const moment = require('moment');

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
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'error', error: 'User not found' });
        }
        const { name, email, averageCycleLength, averagePeriodDuration, isProfileComplete } = user;
        res.status(200).json({
            message: 'success',
            user: { name, email, averageCycleLength, averagePeriodDuration, isProfileComplete }
        });
    } catch (error) {
        res.status(500).json({ message: 'error', error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        if (!user) {
            return res.status(401).json({ message: 'error', error: 'Invalid email or password' });
        }
        res.status(200).json({ message: 'success', user: user._id, isProfileComplete: user.isProfileComplete });
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

exports.predict = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const cycles = await MenstrualCycle.find({ user: userId }).sort({ cycleStartDate: -1 }).limit(6);

        if (cycles.length < 3) {
            return res.status(400).json({ message: 'Insufficient cycle data for accurate prediction' });
        }

        const cycleLengths = cycles.slice(0, -1).map((cycle, index) =>
            moment(cycle.cycleStartDate).diff(moment(cycles[index + 1].cycleStartDate), 'days')
        );

        const validCycleLengths = cycleLengths.filter(length => length >= 21 && length <= 35);
        const averageCycleLength = validCycleLengths.length > 0
            ? Math.round(validCycleLengths.reduce((a, b) => a + b, 0) / validCycleLengths.length)
            : user.averageCycleLength || 28;

        const lastCycle = moment(cycles[0].cycleStartDate);
        const nextCycle = lastCycle.clone().add(averageCycleLength, 'days');
        const currentDate = moment();

        let remainingDays;
        if (nextCycle.isAfter(currentDate)) {
            remainingDays = nextCycle.diff(currentDate, 'days');
        } else {
            const daysPassed = currentDate.diff(nextCycle, 'days');
            remainingDays = averageCycleLength - (daysPassed % averageCycleLength);
        }

        const result = {
            lastCycle: lastCycle.toDate(),
            nextCycle: nextCycle.toDate(),
            remainingDays: remainingDays
        };
        res.status(200).json({ result });
    } catch (error) {
        console.error('Error in cycle prediction:', error);
        res.status(500).json({ message: 'An error occurred while predicting the next cycle', error: error.message });
    }
};