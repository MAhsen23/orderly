require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const routes = require('./src/routes/routes');
const PORT = process.env.PORT || 3002;

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGODB_URI, {}).then(() => console.log('MongoDB Connected')).catch((err) => console.error('Could not connect to MongoDB', err));

app.use('/api', routes);
app.get('/', (req, res) => {
    res.status(200).send("🌟 Welcome to Orderly! Your API is running smoothly.");
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});