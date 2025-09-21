import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import routes from './src/routes/routes.js';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3002;
app.use(cors());

//mongoose.connect(process.env.MONGODB_URI, {}).then(() => console.log('MongoDB Connected')).catch((err) => console.error('Could not connect to MongoDB', err));

app.use('/api', routes);
app.get('/', (req, res) => {
    res.status(200).send("🌟 Welcome to Orderly! Your API is running smoothly.");
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});