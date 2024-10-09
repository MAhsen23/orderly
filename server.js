require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const routes = require('./src/routes/routes');
const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGODB_URI, {}).then(() => console.log('Connected to MongoDB')).catch((err) => console.error('Could not connect to MongoDB', err));

app.use('/api', routes);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});