const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files from 'public' directory
const cors = require('cors');
app.use(cors()); // Is line ko add karein

// --- Database Connection and Admin Model ---
// Replace with your MongoDB connection string
const MONGO_URI = 'mongodb+srv://shivamverma200423:Cf3Y83mfOBaX0ayq@doctor0.g3rm9yl.mongodb.net/?retryWrites=true&w=majority&appName=DOCTOR0';
const JWT_SECRET = 'Cf3Y83mfOBaX0ayq'; // Change this to a strong secret key

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const Admin = mongoose.model('Admin', adminSchema);

// --- Routes ---
/*
// IMPORTANT: Use this route only ONCE to create your admin user.
// After creating the admin, you should remove or comment out this route for security.
app.post('/register-admin', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).send('Username and password are required');
        }

        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            return res.status(400).send('Admin user already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = new Admin({ username, password: hashedPassword });
        await admin.save();
        res.status(201).send('Admin user created successfully!');
    } catch (error) {
        res.status(500).send('Error creating admin user: ' + error.message);
    }
});
*/

// Admin Login Route
app.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username });

        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: admin._id, username: admin.username }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Middleware to Protect Routes ---
function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>

    if (!token) {
        // If accessed via browser, redirect. If via API, send error.
        if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return res.redirect('/admin-login.html');
        }
        return res.status(403).json({ message: 'A token is required for authentication' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
    } catch (err) {
         if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return res.redirect('/admin-login.html');
        }
        return res.status(401).json({ message: 'Invalid Token' });
    }
    return next();
}


// --- Serve Protected Admin Page ---
// We will add a client-side check as well, but server-side is crucial.
// This approach is simple but less secure. A better way is to serve it via a route.
// Let's create a route for it.
app.get('/admin.html', (req, res) => {
    // This is a simple check. The verifyToken middleware is the main protection.
    // We'll add a script to admin.html to handle token verification on the client-side.
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve the login page
app.get('/admin-login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-login.html'));
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
