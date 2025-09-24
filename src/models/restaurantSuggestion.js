const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RestaurantSuggestionSchema = new Schema({
    email: {
        type: String,
        default: 'anonymous@unknown.com'
    },
    latitude: { type: Number },
    longitude: { type: Number },
    diningPreference: { type: String },
    distance: { type: String },
    budget: { type: [String] },
    cuisine: { type: String },
    requestDetails: {
        type: String
    },
    result: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const RestaurantSuggestion = mongoose.model('RestaurantSuggestion', RestaurantSuggestionSchema);
module.exports = { RestaurantSuggestion };