const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');

const MenstrualCycleSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cycleStartDate: {
        type: Date,
        required: true
    },
    cycleEndDate: {
        type: Date
    },
    cycleDuration: {
        type: Number
    },
    symptoms: [{
        type: String,
        enum: ['Headache', 'Cramps', 'Fatigue', 'Mood swings', 'Bloating', 'Acne', 'Breast tenderness', 'Diarrhea', 'Constipation', 'Insomnia', 'Nausea', 'Vaginal discharge', 'Urinary frequency', 'Sexual dysfunction', 'Other']
    }],
    mood: {
        type: String,
        enum: ['Happy', 'Sad', 'Angry', 'Anxious', 'Stressed', 'Calm', 'Energetic', 'Tired', 'Other']
    },
    flow: {
        type: String,
        enum: ['Light', 'Medium', 'Heavy']
    }
});

const UserSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    birthYear: {
        type: Number
    },
    averageCycleLength: {
        type: Number
    },
    averagePeriodDuration: {
        type: Number
    },
    menstrualCycle: [{
        type: String,
        enum: ['Regular', 'Irregular', 'Don\'t know']
    }],
    isProfileComplete: {
        type: Boolean,
        default: false
    }
});

UserSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8);
    }
    next();
});

const MenstrualCycle = mongoose.model('MenstrualCycle', MenstrualCycleSchema);
const User = mongoose.model('User', UserSchema);
module.exports = { MenstrualCycle, User };
