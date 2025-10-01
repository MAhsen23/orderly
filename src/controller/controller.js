const { User } = require('../models/model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendOTPEmail, generateOTP } = require('../utils/otpUtils');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { RestaurantSuggestion } = require('../models/restaurantSuggestion');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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


/*export const getSuggestedRestaurant = async (req, res) => {
    try {
        const { lat, lng, diningPreference, distance, budget, cuisine } = req.body;
        const distanceMap = {
            walkable: 500,
            "1mile": 1600,
            "3mile": 4800,
            "5mile": 8000,
            "10mile": 16000,
        };
        const radius = distanceMap[distance] || 3000;
        const budgetMap = {
            "under15": 1,
            "15-30": 2,
            "30-60": 3,
            "60-100": 4,
        };

        const apiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=restaurant&keyword=${encodeURIComponent(cuisine)}&key=${process.env.GOOGLE_PLACES_KEY}`;
        const resp = await fetch(apiUrl);
        const data = await resp.json();

        if (!data.results || data.results.length === 0) {
            return res.status(404).json({ success: false, message: "No restaurants found for this cuisine" });
        }

        let filtered = data.results;
        if (budget) {
            filtered = filtered.filter(r => r.price_level === budgetMap[budget]);
        }

        if (filtered.length === 0) {
            return res.status(404).json({ sucess: false, message: "No restaurants found for this cuisine and budget" });
        }

        const randomRestaurant = filtered[Math.floor(Math.random() * filtered.length)];
        const prompt = `Give me one popular ${cuisine} dish that is most likely served at the restaurant "${randomRestaurant.name}" located in ${randomRestaurant.vicinity}. 
        Return only the dish name, nothing else.`;

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        const selectedFood = result.response.text().trim();

        res.status(200).json({
            sucess: true,
            restaurant: {
                name: randomRestaurant.name,
                address: randomRestaurant.vicinity,
                rating: randomRestaurant.rating,
                cuisine,
                priceRange: budget,
                diningOption: diningPreference,
            },
            selectedFood,
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
*/

async function getCityAndCountry(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`;

    const res = await fetch(url, {
        headers: {
            "User-Agent": "Orderly/1.0",
        },
    });
    const data = await res.json();
    const city =
        data.address.city ||
        data.address.town ||
        data.address.village ||
        data.address.hamlet ||
        "Unknown";
    const country = data.address.country || "Unknown";
    return { city, country };
}

exports.getSuggestedRestaurant = async (req, res) => {
    try {
        const { lat, lng, diningPreference, distance, budget, cuisine, email, includeChains } = req.body;
        const { city, country } = await getCityAndCountry(lat, lng);
        const budgetString = Array.isArray(budget) && budget.length > 0 ? budget.join(', ') : 'any';
        const chainInstruction = `Regarding chain restaurants: ${includeChains ? "well-known chain restaurants are acceptable suggestions." : "exclude well-known national or international chain restaurants from the suggestions."}`;
        const requestDetails = {
            latitude: lat,
            longitude: lng,
            diningPreference: diningPreference || 'any',
            distance: distance || 'any',
            budget: budget || ['any'],
            cuisine: cuisine,
            includeChains: includeChains || false,
            email: email || null,
            city: city,
            country: country,
            timestamp: new Date().toISOString()
        };

        const makeApiCall = async (prompt) => {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            let text = result.response.text().trim();

            if (text.startsWith("```")) {
                text = text.replace(/```json/g, "").replace(/```/g, "").trim();
            }

            try {
                const data = JSON.parse(text);
                if ((data.name && data.address) || (data.mainSuggestion && data.mainSuggestion.name && data.mainSuggestion.address)) {
                    return data;
                }
                return null;
            } catch (e) {
                return null;
            }
        };

        const strictPrompt = `
            You are a restaurant recommendation assistant.
            A user is located at latitude ${lat}, longitude ${lng}, which is in ${city}, ${country}.
            They are looking for a ${cuisine} restaurant.

            User preferences:
            - Dining preference: ${diningPreference || "any"}
            - Acceptable budget ranges: ${budgetString}
            - Distance: ${distance || "any"}
            - ${chainInstruction}

            Strict requirements for the suggestion:
            1.  The restaurant must be a real, verifiable establishment located in ${city}, ${country}.
            2.  The rating must be 4.0 or higher.
            3.  It must have more than 100 reviews.
            4.  It must have a valid, working phone number. Do not return "Not available".
            5.  It must have an official, working, and accessible website. Please verify the URL is correct and not a broken link.
            6.  The restaurant must be open for business at the current time of this request.

            ${includeChains
                ? `Please suggest one primary restaurant that is the best match for the user's criteria. This can be an independent restaurant or a chain. Additionally, provide a list of 2-3 alternative popular chain restaurants that also match the cuisine type and are located nearby.`
                : `Please suggest EXACTLY ONE restaurant that meets ALL of these strict criteria.`
            }

            Respond ONLY in raw JSON (no markdown, no explanation) with the following structure:
            ${includeChains
                ? `{
                "mainSuggestion": {
                    "name": "Restaurant name",
                    "address": "Full street address",
                    "rating": "4.5",
                    "reviewCount": "Number of reviews (e.g., 250+)",
                    "cuisine": "${cuisine}",
                    "priceRange": "${budgetString}",
                    "diningOption": "${diningPreference || "any"}",
                    "selectedFood": "Dish name",
                    "website": "https://restaurant-website.com",
                    "phone": "+1-555-123-4567",
                    "description": "A short description of the restaurant",
                    "isOpen": true
                },
                "chainAlternatives": [
                    {
                        "name": "Chain Restaurant Name",
                        "address": "Full street address",
                        "cuisine": "${cuisine}"
                    }
                ]
            }`
                : `{
                "name": "Restaurant name",
                "address": "Full street address",
                "rating": "4.5",
                "reviewCount": "Number of reviews (e.g., 250+)",
                "cuisine": "${cuisine}",
                "priceRange": "${budgetString}",
                "diningOption": "${diningPreference || "any"}",
                "selectedFood": "Dish name",
                "website": "https://restaurant-website.com",
                "phone": "+1-555-123-4567",
                "description": "A short description of the restaurant",
                "isOpen": true
            }`
            }
            `;

        let restaurantData = await makeApiCall(strictPrompt);

        if (!restaurantData) {
            const relaxedPrompt = `
                You are a restaurant recommendation assistant. A user's initial search returned no results. Please try again with more flexible criteria.
                The user is located at latitude ${lat}, longitude ${lng}, in ${city}, ${country}. They are looking for a ${cuisine} restaurant.

                Original preferences (these can be relaxed):
                - Dining preference: ${diningPreference || "any"}
                - Budget: ${budgetString}
                - Distance: ${distance || "any"}
                - ${chainInstruction}

                Relaxed search instructions:
                1. Find the best possible match even if it doesn't perfectly fit the budget or distance.
                2. Strongly prefer restaurants that are open for business at the current time.
                3. Slightly expand the search radius or consider adjacent budget categories if no direct match is found.

                Strict requirements that CANNOT be relaxed:
                1. The restaurant must be a real, verifiable establishment in ${city}, ${country}.
                2. The rating must be 4.0 or higher.
                3. It must have more than 100 reviews.
                4. It must have a valid, working phone number.
                5. It must have an official, working, and accessible website. Please verify the URL.

                ${includeChains
                    ? `Please suggest one primary restaurant that is the best match, even if it deviates from the original preferences. Also provide 2-3 alternative popular chain restaurants.`
                    : `Please suggest EXACTLY ONE restaurant that meets the strict requirements, even if it deviates from the original preferences.`
                }

                Respond ONLY in raw JSON (no markdown, no explanation) with the same structure as before.
                `;
            restaurantData = await makeApiCall(relaxedPrompt);
        }

        if (!restaurantData) {
            return res.status(404).json({
                success: false,
                message: "We couldn't find a suitable restaurant that meets our quality standards, even with a broader search. Please try different criteria.",
            });
        }

        const restaurantSuggestionData = new RestaurantSuggestion({
            email: email || 'anonymous@unknown.com',
            latitude: lat,
            longitude: lng,
            diningPreference: diningPreference || null,
            distance: distance || null,
            budget: budget && budget.length > 0 ? budget : null,
            cuisine: cuisine,
            includeChains: includeChains || false,
            requestDetails: JSON.stringify(requestDetails),
            result: JSON.stringify(restaurantData)
        });

        await restaurantSuggestionData.save();

        if (includeChains && restaurantData.mainSuggestion) {
            res.status(200).json({
                success: true,
                restaurant: restaurantData.mainSuggestion,
                chainAlternatives: restaurantData.chainAlternatives,
                suggestionId: restaurantSuggestionData._id
            });
        } else {
            res.status(200).json({
                success: true,
                restaurant: restaurantData,
                suggestionId: restaurantSuggestionData._id
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSuggestedRestaurantKimi = async (req, res) => {
    try {
        const { lat, lng, diningPreference, distance, budget, cuisine, email, includeChains } = req.body;
        const { city, country } = await getCityAndCountry(lat, lng);
        const budgetString = Array.isArray(budget) && budget.length > 0 ? budget.join(', ') : 'any';
        const chainInstruction = `Regarding chain restaurants: ${includeChains ? "well-known chain restaurants are acceptable suggestions." : "exclude well-known national or international chain restaurants from the suggestions."}`;

        const requestDetails = {
            latitude: lat,
            longitude: lng,
            diningPreference: diningPreference || 'any',
            distance: distance || 'any',
            budget: budget || ['any'],
            cuisine: cuisine,
            includeChains: includeChains || false,
            email: email || null,
            city: city,
            country: country,
            timestamp: new Date().toISOString()
        };

        const makeApiCall = async (prompt) => {
            const payload = {
                model: "moonshotai/kimi-k2:free",
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            };

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.KIMIK2_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            let text = data.choices[0].message.content.trim();

            if (text.startsWith("```")) {
                text = text.replace(/```json/g, "").replace(/```/g, "").trim();
            }

            try {
                const jsonData = JSON.parse(text);
                if ((jsonData.name && jsonData.address) || (jsonData.mainSuggestion && jsonData.mainSuggestion.name && jsonData.mainSuggestion.address)) {
                    return jsonData;
                }
                return null;
            } catch (e) {
                return null;
            }
        };

        const strictPrompt = `
            You are a restaurant recommendation assistant.
            A user is located at latitude ${lat}, longitude ${lng}, which is in ${city}, ${country}.
            They are looking for a ${cuisine} restaurant.

            User preferences:
            - Dining preference: ${diningPreference || "any"}
            - Acceptable budget ranges: ${budgetString}
            - Distance: ${distance || "any"}
            - ${chainInstruction}

            Strict requirements for the suggestion:
            1.  The restaurant must be a real, verifiable establishment located in ${city}, ${country}.
            2.  The rating must be 4.0 or higher.
            3.  It must have more than 100 reviews.
            4.  It must have a valid, working phone number. Do not return "Not available".
            5.  It must have an official, working, and accessible website. Please verify the URL is correct and not a broken link.
            6.  The restaurant must be open for business at the current time of this request.

            ${includeChains
                ? `Please suggest one primary restaurant that is the best match for the user's criteria. This can be an independent restaurant or a chain. Additionally, provide a list of 2-3 alternative popular chain restaurants that also match the cuisine type and are located nearby.`
                : `Please suggest EXACTLY ONE restaurant that meets ALL of these strict criteria.`
            }

            Respond ONLY in raw JSON (no markdown, no explanation) with the following structure:
            ${includeChains
                ? `{
                "mainSuggestion": {
                    "name": "Restaurant name",
                    "address": "Full street address",
                    "rating": "4.5",
                    "reviewCount": "Number of reviews (e.g., 250+)",
                    "cuisine": "${cuisine}",
                    "priceRange": "${budgetString}",
                    "diningOption": "${diningPreference || "any"}",
                    "selectedFood": "Dish name",
                    "website": "https://restaurant-website.com",
                    "phone": "+1-555-123-4567",
                    "description": "A short description of the restaurant",
                    "isOpen": true
                },
                "chainAlternatives": [
                    {
                        "name": "Chain Restaurant Name",
                        "address": "Full street address",
                        "cuisine": "${cuisine}"
                    }
                ]
            }`
                : `{
                "name": "Restaurant name",
                "address": "Full street address",
                "rating": "4.5",
                "reviewCount": "Number of reviews (e.g., 250+)",
                "cuisine": "${cuisine}",
                "priceRange": "${budgetString}",
                "diningOption": "${diningPreference || "any"}",
                "selectedFood": "Dish name",
                "website": "https://restaurant-website.com",
                "phone": "+1-555-123-4567",
                "description": "A short description of the restaurant",
                "isOpen": true
            }`
            }
            `;

        let restaurantData = await makeApiCall(strictPrompt);

        if (!restaurantData) {
            const relaxedPrompt = `
                You are a restaurant recommendation assistant. A user's initial search returned no results. Please try again with more flexible criteria.
                The user is located at latitude ${lat}, longitude ${lng}, in ${city}, ${country}. They are looking for a ${cuisine} restaurant.

                Original preferences (these can be relaxed):
                - Dining preference: ${diningPreference || "any"}
                - Budget: ${budgetString}
                - Distance: ${distance || "any"}
                - ${chainInstruction}

                Relaxed search instructions:
                1. Find the best possible match even if it doesn't perfectly fit the budget or distance.
                2. Strongly prefer restaurants that are open for business at the current time.
                3. Slightly expand the search radius or consider adjacent budget categories if no direct match is found.

                Strict requirements that CANNOT be relaxed:
                1. The restaurant must be a real, verifiable establishment in ${city}, ${country}.
                2. The rating must be 4.0 or higher.
                3. It must have more than 100 reviews.
                4. It must have a valid, working phone number.
                5. It must have an official, working, and accessible website. Please verify the URL.

                ${includeChains
                    ? `Please suggest one primary restaurant that is the best match, even if it deviates from the original preferences. Also provide 2-3 alternative popular chain restaurants.`
                    : `Please suggest EXACTLY ONE restaurant that meets the strict requirements, even if it deviates from the original preferences.`
                }

                Respond ONLY in raw JSON (no markdown, no explanation) with the same structure as before.
                `;
            restaurantData = await makeApiCall(relaxedPrompt);
        }

        if (!restaurantData) {
            return res.status(404).json({
                success: false,
                message: "We couldn't find a suitable restaurant that meets our quality standards, even with a broader search. Please try different criteria.",
            });
        }

        const restaurantSuggestionData = new RestaurantSuggestion({
            email: email || 'anonymous@unknown.com',
            latitude: lat,
            longitude: lng,
            diningPreference: diningPreference || null,
            distance: distance || null,
            budget: budget && budget.length > 0 ? budget : null,
            cuisine: cuisine,
            includeChains: includeChains || false,
            requestDetails: JSON.stringify(requestDetails),
            result: JSON.stringify(restaurantData)
        });

        await restaurantSuggestionData.save();

        if (includeChains && restaurantData.mainSuggestion) {
            res.status(200).json({
                success: true,
                restaurant: restaurantData.mainSuggestion,
                chainAlternatives: restaurantData.chainAlternatives,
                suggestionId: restaurantSuggestionData._id
            });
        } else {
            res.status(200).json({
                success: true,
                restaurant: restaurantData,
                suggestionId: restaurantSuggestionData._id
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getRestaurantSuggestions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const { email } = req.query;

        const filter = {};
        if (email) {
            filter.email = email;
        }

        const totalCount = await RestaurantSuggestion.countDocuments(filter);
        const totalPages = Math.ceil(totalCount / limit);

        const suggestions = await RestaurantSuggestion.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-__v')
            .lean();

        const parsedSuggestions = suggestions.map(suggestion => ({
            _id: suggestion._id,
            email: suggestion.email,
            latitude: suggestion.latitude,
            longitude: suggestion.longitude,
            diningPreference: suggestion.diningPreference,
            distance: suggestion.distance,
            budget: suggestion.budget,
            cuisine: suggestion.cuisine,
            requestDetails: JSON.parse(suggestion.requestDetails),
            result: JSON.parse(suggestion.result),
            createdAt: suggestion.createdAt
        }));

        res.status(200).json({
            success: true,
            data: parsedSuggestions,
            currentPage: page,
            totalPages: totalPages,
            totalCount: totalCount,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            limit: limit
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch restaurant suggestions',
            error: error.message
        });
    }
};
