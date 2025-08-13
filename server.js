const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors'); // CORS ko import karein

const app = express();
const port = process.env.PORT || 3000; // Render ke liye PORT update karein

// Middleware
app.use(cors()); // CORS ko use karein
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- Database Connection and Models ---
const MONGO_URI = 'mongodb+srv://shivamverma200423:Cf3Y83mfOBaX0ayq@doctor0.g3rm9yl.mongodb.net/?retryWrites=true&w=majority&appName=DOCTOR0'; // Apna URI yahan daalein
const JWT_SECRET = 'Cf3Y83mfOBaX0ayq'; // Apna Secret Key yahan daalein

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Admin Model
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const Admin = mongoose.model('Admin', adminSchema);

// --- DOCTOR MODEL (Yeh Naya Hai) ---
const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    specialty: { type: String, required: true },
    imageUrl: { type: String, required: true } // Doctor ki image ka URL
});
const Doctor = mongoose.model('Doctor', doctorSchema);


// --- Routes ---

// Admin Login Route
app.post('/admin/login', async (req, res) => {
    // ... aapka pehle ka login code yahan rahega ...
});

// --- Middleware to Protect Routes ---
function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(403).json({ message: 'A token is required for authentication' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
    } catch (err) {
        return res.status(401).json({ message: 'Invalid Token' });
    }
    return next();
}

// --- API Routes (Naye Routes) ---

// Naya Doctor Add Karne ke liye (Admin Panel se use hoga)
app.post('/api/doctors', verifyToken, async (req, res) => {
    try {
        const { name, specialty, imageUrl } = req.body;
        const newDoctor = new Doctor({ name, specialty, imageUrl });
        await newDoctor.save();
        res.status(201).json({ message: 'Doctor added successfully!', doctor: newDoctor });
    } catch (error) {
        res.status(500).json({ message: 'Error adding doctor', error });
    }
});

// Saare Doctors ki List Paane ke liye (Public Website par use hoga)
app.get('/api/doctors', async (req, res) => {
    try {
        const doctors = await Doctor.find();
        res.status(200).json(doctors);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching doctors', error });
    }
});


// --- Serve Static HTML files ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin-login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-login.html'));
});

// Is route ko protected rakhein
app.get('/admin.html', (req, res) => {
     res.sendFile(path.join(__dirname, 'admin.html'));
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
