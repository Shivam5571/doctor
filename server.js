require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.PORT || 3000;

// ====== ENV ======
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://shivamverma200423:Cf3Y83mfOBaX0ayq@doctor0.g3rm9yl.mongodb.net/?retryWrites=true&w=majority&appName=DOCTOR0';
const JWT_SECRET = process.env.JWT_SECRET || 'Cf3Y83mfOBaX0ayq';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'https://doctordemo1.netlify.app/'; // Netlify URL

// Trust proxy so secure cookies work on Render
app.set('trust proxy', 1);

// ====== Core Middleware ======
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CORS for cross-site cookie auth
app.use(
  cors({
    origin: [CLIENT_ORIGIN],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Serve only public assets (no admin here)
app.use('/public', express.static(path.join(__dirname, 'public')));

// ====== DB ======
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// ====== Schemas & Models ======
const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }, // hashed
});
const Admin = mongoose.model('Admin', adminSchema);

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialty: { type: String },
  qualification: { type: String },
  bio: { type: String },
  education: { type: String },
  phone: { type: String },
  email: { type: String },
  location: { type: String },
  linkedin: { type: String },
  hours: { mf: String, sat: String, sun: String },
  imageUrl: { type: String },
});
const Doctor = mongoose.model('Doctor', doctorSchema);

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String, required: true },
  description: { type: String, required: true },
});
const Service = mongoose.model('Service', serviceSchema);

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    content: { type: String, required: true },
    excerpt: { type: String },
    tags: { type: [String] },
    imageUrl: { type: String },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const Blog = mongoose.model('Blog', blogSchema);

const appointmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    doctor: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    message: { type: String },
    status: { type: String, default: 'Pending' },
  },
  { timestamps: true }
);
const Appointment = mongoose.model('Appointment', appointmentSchema);

// ====== Auth Helpers ======
const cookieOpts = {
  httpOnly: true,
  secure: true, // requires HTTPS; Render provides HTTPS
  sameSite: 'none', // needed for cross-site cookies (Netlify -> Render)
  maxAge: 8 * 60 * 60 * 1000, // 8h
  path: '/',
};

function verifyToken(req, res, next) {
  // Prefer cookie, fallback to bearer header
  const token = req.cookies?.adminToken || (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(403).json({ message: 'Token is required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ message: 'Invalid Token' });
    req.user = user;
    next();
  });
}

// Used to protect the admin HTML page itself
function requireAuthForPage(req, res, next) {
  const token = req.cookies?.adminToken || (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.redirect('/admin-login');
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.redirect('/admin-login');
    req.user = user;
    next();
  });
}

// ====== Seed Admin (first time only) ======
(async () => {
  try {
    const count = await Admin.countDocuments();
    if (count === 0 && process.env.ADMIN_USER && process.env.ADMIN_PASS) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASS, 10);
      await Admin.create({ username: process.env.ADMIN_USER, password: hash });
      console.log('Seeded default admin:', process.env.ADMIN_USER);
    }
  } catch (e) {
    console.error('Admin seed error:', e.message);
  }
})();

// ====== Auth Routes ======
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id, username: admin.username }, JWT_SECRET, { expiresIn: '8h' });

    // Set cookie for cross-site usage
    res.cookie('adminToken', token, cookieOpts);
    res.json({ token, message: 'Logged in' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/admin/logout', (req, res) => {
  res.clearCookie('adminToken', { ...cookieOpts, maxAge: 0 });
  res.json({ message: 'Logged out' });
});

// ====== API Routes ======
app.get('/api/doctors', async (req, res) => res.json(await Doctor.find()));
app.post('/api/doctors', verifyToken, async (req, res) => res.status(201).json(await new Doctor(req.body).save()));
app.put('/api/doctors/:id', verifyToken, async (req, res) => res.json(await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true })));
app.delete('/api/doctors/:id', verifyToken, async (req, res) => res.json(await Doctor.findByIdAndDelete(req.params.id)));

app.get('/api/services', async (req, res) => res.json(await Service.find()));
app.post('/api/services', verifyToken, async (req, res) => res.status(201).json(await new Service(req.body).save()));
app.put('/api/services/:id', verifyToken, async (req, res) => res.json(await Service.findByIdAndUpdate(req.params.id, req.body, { new: true })));
app.delete('/api/services/:id', verifyToken, async (req, res) => res.json(await Service.findByIdAndDelete(req.params.id)));

app.get('/api/blogs', async (req, res) => res.json(await Blog.find().sort({ createdAt: -1 })));
app.post('/api/blogs', verifyToken, async (req, res) => res.status(201).json(await new Blog(req.body).save()));
app.put('/api/blogs/:id', verifyToken, async (req, res) => res.json(await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true })));
app.delete('/api/blogs/:id', verifyToken, async (req, res) => res.json(await Blog.findByIdAndDelete(req.params.id)));

app.get('/api/appointments', verifyToken, async (req, res) => res.json(await Appointment.find().sort({ createdAt: -1 })));
app.post('/api/appointments', async (req, res) => res.status(201).json(await new Appointment(req.body).save()));
app.put('/api/appointments/:id', verifyToken, async (req, res) => res.json(await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true })));
app.delete('/api/appointments/:id', verifyToken, async (req, res) => res.json(await Appointment.findByIdAndDelete(req.params.id)));

app.get('/api/stats', verifyToken, async (req, res) => {
  const [doctors, services, blogs, appointments] = await Promise.all([
    Doctor.countDocuments(),
    Service.countDocuments(),
    Blog.countDocuments(),
    Appointment.countDocuments(),
  ]);
  res.json({ doctors, services, blogs, appointments });
});

// ====== Admin HTML (Protected) ======
// Keep admin.html outside public; serve it here only if authenticated
app.get(['/admin', '/admin.html'], requireAuthForPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'private', 'admin.html'));
});

// Optional: backend-served login page (if you ever want it)
app.get(['/admin-login', '/admin-login.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'private', 'admin-login.html'));
});

app.listen(port, () => console.log(`Server is running on port ${port}`));