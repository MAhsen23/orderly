import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import routes from './src/routes/routes.js';

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGODB_URI, {}).then(() => console.log('MongoDB Connected')).catch((err) => console.error('Could not connect to MongoDB', err));

app.use('/api', routes);
app.get('/', (req, res) => {
    res.status(200).send("🌟 Welcome to Orderly! Your API is running smoothly.");
});
module.exports = app;