const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RestaurantSuggestionSchema = new Schema({
    email: {
        type: String,
        default: 'anonymous@unknown.com'
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    diningPreference: { type: String },
    distance: { type: String },
    budget: { type: String },
    cuisine: { type: String, required: true },
    requestDetails: {
        type: String,
        required: true
    },
    result: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const RestaurantSuggestion = mongoose.model('RestaurantSuggestion', RestaurantSuggestionSchema);
module.exports = { RestaurantSuggestion };