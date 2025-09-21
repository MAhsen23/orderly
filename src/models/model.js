const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');

const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    otp: { type: String },
    otpExpires: { type: Date },
    isVerified: { type: Boolean, default: false },
    birthYear: { type: Number },
    averageCycleLength: { type: Number },
    averagePeriodDuration: { type: Number },
    cycleType: { type: String, enum: ['Regular', 'Irregular', 'Don\'t know'] },
    menstrualCycles: [{
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        duration: { type: Number },
        mood: { type: String, enum: ['Happy', 'Sad', 'Angry', 'Anxious', 'Stressed', 'Calm', 'Energetic', 'Tired', 'Other'] },
        flow: { type: String, enum: ['Light', 'Medium', 'Heavy'] }
    }],
    isProfileComplete: { type: Boolean, default: false },
    notes: [{
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }]
});

UserSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8);
    }
    next();
});

const User = mongoose.model('User', UserSchema);
module.exports = { User };
