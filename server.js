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
    pinned: { type: Boolean, default: false } // Feature: Pin blog
}, { timestamps: true });
const Blog = mongoose.model('Blog', blogSchema);

// NEW: Comment Schema for nested comments
const commentSchema = new mongoose.Schema({
    blog: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog', required: true },
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    author: { type: String, required: true },
    content: { type: String, required: true },
}, { timestamps: true });
const Comment = mongoose.model('Comment', commentSchema);


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

// NEW: Route to get pinned blogs for index.html
app.get('/api/blogs/pinned', async (req, res) => {
    try {
        const pinnedBlogs = await Blog.find({ pinned: true }).sort({ createdAt: -1 });
        res.json(pinnedBlogs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pinned blogs' });
    }
});

// NEW: Route to toggle pin status of a blog
app.put('/api/blogs/:id/toggle-pin', verifyToken, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: 'Blog not found' });
        blog.pinned = !blog.pinned;
        await blog.save();
        res.json(blog);
    } catch (error) {
        res.status(500).json({ message: 'Error updating pin status' });
    }
});


// APPOINTMENTS (CRUD)
app.get('/api/appointments', verifyToken, async (req, res) => res.json(await Appointment.find().sort({ createdAt: -1 })));
app.post('/api/appointments', async (req, res) => res.status(201).json(await new Appointment(req.body).save()));
app.put('/api/appointments/:id', verifyToken, async (req, res) => res.json(await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true })));
app.delete('/api/appointments/:id', verifyToken, async (req, res) => res.json(await Appointment.findByIdAndDelete(req.params.id)));

// --- NEW: COMMENT ROUTES ---

// Get all comments for a blog, structured in a nested way
app.get('/api/blogs/:blogId/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ blog: req.params.blogId });
        
        // Helper function to build the nested comment tree
        const buildTree = (commentsList) => {
            const commentMap = {};
            const tree = [];

            commentsList.forEach(comment => {
                commentMap[comment._id] = { ...comment.toObject(), replies: [] };
            });

            commentsList.forEach(comment => {
                if (comment.parentComment) {
                    if(commentMap[comment.parentComment]) {
                       commentMap[comment.parentComment].replies.push(commentMap[comment._id]);
                    }
                } else {
                    tree.push(commentMap[comment._id]);
                }
            });
            return tree;
        };
        
        const commentTree = buildTree(comments);
        res.json(commentTree);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching comments' });
    }
});

// Post a new comment or a reply
app.post('/api/comments', async (req, res) => {
    try {
        const { blog, parentComment, author, content } = req.body;
        const newComment = new Comment({ blog, parentComment, author, content });
        await newComment.save();
        res.status(201).json(newComment);
    } catch (error) {
        res.status(500).json({ message: 'Error posting comment' });
    }
});

// Delete a comment and all its replies (cascading delete)
app.delete('/api/comments/:commentId', verifyToken, async (req, res) => {
    try {
        const commentId = req.params.commentId;
        
        // Helper function to find all child comments recursively
        const findChildren = async (id) => {
            let children = await Comment.find({ parentComment: id });
            let allChildren = [...children];
            for (const child of children) {
                const grandchildren = await findChildren(child._id);
                allChildren = allChildren.concat(grandchildren);
            }
            return allChildren;
        };

        const childrenToDelete = await findChildren(commentId);
        const idsToDelete = childrenToDelete.map(c => c._id);
        
        // Delete all children and then the parent
        await Comment.deleteMany({ _id: { $in: idsToDelete } });
        await Comment.findByIdAndDelete(commentId);

        res.json({ message: 'Comment and all replies deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting comment' });
    }
});


// DASHBOARD STATS
app.get('/api/stats', verifyToken, async (req, res) => {
    try {
        const [doctorCount, serviceCount, blogCount, appointmentCount, commentCount] = await Promise.all([
            Doctor.countDocuments(), Service.countDocuments(), Blog.countDocuments(), Appointment.countDocuments(), Comment.countDocuments()
        ]);
        res.json({ doctors: doctorCount, services: serviceCount, blogs: blogCount, appointments: appointmentCount, comments: commentCount });
    } catch (error) { res.status(500).json({ message: 'Error fetching stats' }); }
});

// --- Serve Static HTML files ---
app.get('/admin-login.html', (req, res) => res.sendFile(path.join(__dirname, 'admin-login.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.listen(port, () => console.log(`Server is running on port ${port}`));
