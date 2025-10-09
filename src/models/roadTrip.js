const mongoose = require('mongoose');

const roadTripSchema = new mongoose.Schema({
    email: {
        type: String,
        trim: true,
        lowercase: true,
    },
    start: {
        type: String,
        required: true,
    },
    end: {
        type: String,
        required: true,
    },
    startCords: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
    },
    endCords: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
    },
    numberOfStops: {
        type: String,
        required: true,
    },
    stopDuration: {
        type: String,
        required: true,
    },
    activity: {
        type: String,
        required: true,
    },
    costPreference: {
        type: String,
        required: true,
    },
    requestDetails: {
        type: String,
        required: true,
    },
    result: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

const RoadTrip = mongoose.model('RoadTrip', roadTripSchema);

module.exports = { RoadTrip };
