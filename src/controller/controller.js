const { User } = require('../models/model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendOTPEmail, generateOTP } = require('../utils/otpUtils');

exports.createUser = async (req, res) => {
    try {
        let { name, email, password } = req.body;
        name = name?.trim();
        email = email?.trim();

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required',
            });
        }
        const user = await User.create({ name, email, password });
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        const emailResult = await sendOTPEmail(email, otp);
        console.log("What is the email result ", emailResult);

        if (emailResult.success) {
            user.otp = otp;
            user.otpExpires = otpExpires;
            await user.save();
        }
        res.status(201).json({
            success: true,
            message: 'User registered successfully. Please check email for OTP.',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isProfileComplete: user.isProfileComplete,
                isVerified: user.isVerified
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'No user found with this email address.', });
        }
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'User account has not been verified.',
            });
        }
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res
                .status(404)
                .json({ success: false, message: 'Invalid Credentials' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: "30d",
        });
        const notesContent = user.notes?.map(note => note.content);
        res.status(200).json({
            success: true,
            message: 'Login successful. Welcome back!',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isProfileComplete: user.isProfileComplete,
                isVerified: user.isVerified,
                birthYear: user.birthYear,
                averageCycleLength: user.averageCycleLength,
                averagePeriodDuration: user.averagePeriodDuration,
                cycleType: user.cycleType,
            },
            notes: notesContent,
            menstrualCycles: user.menstrualCycles,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.verifyOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        const { id: userId } = req.params;
        const user = await User.findById(userId);
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: 'No user found with this email address.' });
        }
        if (user.otp !== otp) {
            return res
                .status(400)
                .json({ success: false, message: 'The OTP entered is invalid. Please try again.' });
        }
        if (user.otpExpires && user.otpExpires < new Date()) {
            return res
                .status(400)
                .json({ success: false, message: 'The OTP has expired. Please request a new one.' });
        }
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: "30d",
        });
        res.status(200).json({
            success: true,
            message: 'Your account has been successfully verified.',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isProfileComplete: user.isProfileComplete,
                isVerified: user.isVerified,
            },
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.profileSetup = async (req, res) => {
    try {
        const userId = req.user._id;
        const { birthYear, cycleType, averageCycleLength, lastPeriodStartDate, averagePeriodDuration } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found', });
        }
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'User account has not been verified.',
            });
        }
        user.birthYear = birthYear;
        user.averageCycleLength = averageCycleLength;
        user.averagePeriodDuration = averagePeriodDuration;
        user.cycleType = cycleType;

        user.menstrualCycles.push({
            startDate: lastPeriodStartDate,
            duration: averagePeriodDuration,
        });

        user.isProfileComplete = true;
        await user.save();

        const notesContent = user.notes?.map(note => note.content);

        res.status(200).json({
            success: true,
            message: 'Profile setup successfully.',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isProfileComplete: user.isProfileComplete,
                isVerified: user.isVerified,
                birthYear: user.birthYear,
                averageCycleLength: user.averageCycleLength,
                averagePeriodDuration: user.averagePeriodDuration,
                cycleType: user.cycleType,
            },
            notes: notesContent,
            menstrualCycles: user.menstrualCycles,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.notes = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        const { notes } = req.body;
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'User account has not been verified.',
            });
        }
        if (!Array.isArray(notes)) {
            return res.status(400).json({ success: false, message: 'Notes should be an array' });
        }
        if (notes.length > 5) {
            return res.status(400).json({ success: false, message: 'You can only save up to 5 notes' });
        }
        user.notes = notes.map(note => ({
            content: note,
            createdAt: new Date(),
        }));
        await user.save();
        res.status(200).json({ success: true, message: 'Notes updated successfully', notes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
