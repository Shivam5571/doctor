const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://shivamverma200423:Cf3Y83mfOBaX0ayq@doctor0.g3rm9yl.mongodb.net/?retryWrites=true&w=majority&appName=DOCTOR0'; 
const JWT_SECRET = process.env.JWT_SECRET || 'Cf3Y83mfOBaX0ayq';

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Schemas & Models ---
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const Admin = mongoose.model('Admin', adminSchema);

// UPDATED DOCTOR SCHEMA TO MATCH YOUR FORM
const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    specialty: String,
    qualification: String,
    bio: String,
    education: String,
    phone: String,
    email: String,
    location: String,
    linkedin: String,
    hours: { mf: String, sat: String, sun: String },
    imageUrl: String 
});
const Doctor = mongoose.model('Doctor', doctorSchema);

const serviceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    icon: { type: String, required: true },
    description: { type: String, required: true }
});
const Service = mongoose.model('Service', serviceSchema);

const blogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    content: { type: String, required: true },
    excerpt: String,
    tags: [String],
    imageUrl: String,
    pinned: { type: Boolean, default: false }
}, { timestamps: true });
const Blog = mongoose.model('Blog', blogSchema);

const appointmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    doctor: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    message: String,
    status: { type: String, default: 'Pending' }
}, { timestamps: true });
const Appointment = mongoose.model('Appointment', appointmentSchema);

// --- Middleware to Verify Token ---
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(403).json({ message: 'Token is required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(401).json({ message: 'Invalid Token' });
        req.user = user;
        next();
    });
}

// --- API Routes ---
app.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username });
        if (!admin || !await bcrypt.compare(password, admin.password)) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// DOCTORS (CRUD)
app.get('/api/doctors', async (req, res) => res.json(await Doctor.find()));
app.post('/api/doctors', verifyToken, async (req, res) => res.status(201).json(await new Doctor(req.body).save()));
app.put('/api/doctors/:id', verifyToken, async (req, res) => res.json(await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true })));
app.delete('/api/doctors/:id', verifyToken, async (req, res) => res.json(await Doctor.findByIdAndDelete(req.params.id)));

// SERVICES (CRUD)
app.get('/api/services', async (req, res) => res.json(await Service.find()));
app.post('/api/services', verifyToken, async (req, res) => res.status(201).json(await new Service(req.body).save()));
app.put('/api/services/:id', verifyToken, async (req, res) => res.json(await Service.findByIdAndUpdate(req.params.id, req.body, { new: true })));
app.delete('/api/services/:id', verifyToken, async (req, res) => res.json(await Service.findByIdAndDelete(req.params.id)));

// BLOGS (CRUD)
app.get('/api/blogs', async (req, res) => res.json(await Blog.find().sort({ createdAt: -1 })));
app.post('/api/blogs', verifyToken, async (req, res) => res.status(201).json(await new Blog(req.body).save()));
app.put('/api/blogs/:id', verifyToken, async (req, res) => res.json(await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true })));
app.delete('/api/blogs/:id', verifyToken, async (req, res) => res.json(await Blog.findByIdAndDelete(req.params.id)));

// APPOINTMENTS (CRUD)
app.get('/api/appointments', verifyToken, async (req, res) => res.json(await Appointment.find().sort({ createdAt: -1 })));
app.post('/api/appointments', async (req, res) => res.status(201).json(await new Appointment(req.body).save()));
app.put('/api/appointments/:id', verifyToken, async (req, res) => res.json(await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true })));
app.delete('/api/appointments/:id', verifyToken, async (req, res) => res.json(await Appointment.findByIdAndDelete(req.params.id)));

// DASHBOARD STATS
app.get('/api/stats', verifyToken, async (req, res) => {
    try {
        const [doctorCount, serviceCount, blogCount, appointmentCount] = await Promise.all([
            Doctor.countDocuments(), Service.countDocuments(), Blog.countDocuments(), Appointment.countDocuments()
        ]);
        res.json({ doctors: doctorCount, services: serviceCount, blogs: blogCount, appointments: appointmentCount });
    } catch (error) { res.status(500).json({ message: 'Error fetching stats' }); }
});

// --- Serve Static HTML files ---
app.get('/admin-login.html', (req, res) => res.sendFile(path.join(__dirname, 'admin-login.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.listen(port, () => console.log(`Server is running on port ${port}`));
