const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Environment Configuration (with local fallback defaults for lab evaluation)
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campus_lost_found';
const JWT_SECRET = process.env.JWT_SECRET || 'jiit_findit_jwt_secret_key_2026';

// ==========================================
// 1. MONGOOSE MODELS (3 Core Models)
// ==========================================

// Model 1: User Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  rollNo: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student'
  },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Model 2: Item Model (handles lost items, found items, and faculty notices)
const itemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: {
    type: String,
    required: true,
    enum: ['Electronics', 'ID Cards', 'Books/Notes', 'Accessories', 'Announcement', 'Other'],
    default: 'Other'
  },
  description: { type: String, required: true, trim: true },
  type: {
    type: String,
    required: true,
    enum: ['lost', 'found', 'notice']
  },
  location: {
    type: String,
    required: function () {
      return this.type === 'lost' || this.type === 'found';
    },
    default: 'Campus-Wide',
    trim: true
  },
  date: { type: Date, default: Date.now },
  contactInfo: {
    type: String,
    required: function () {
      return this.type === 'lost';
    },
    default: '',
    trim: true
  },
  dropOffPoint: {
    type: String,
    required: function () {
      return this.type === 'found';
    },
    default: '',
    trim: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  priority: {
    type: String,
    enum: ['normal', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['Lost', 'Found', 'Claimed', 'Recovered', 'Closed'],
    default: 'Lost'
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now }
});

const Item = mongoose.model('Item', itemSchema);

// Model 3: Claim Model
const claimSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  claimantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownershipProof: { type: String, required: true, trim: true },
  identifyingMarks: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  receiverName: { type: String, default: '', trim: true },
  receiverRollNo: { type: String, default: '', trim: true },
  handoverDate: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

const Claim = mongoose.model('Claim', claimSchema);

// ==========================================
// 2. INITIAL ADMIN & FACULTY SEEDING (US11, US19)
// ==========================================
async function seedInitialAccounts() {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@jiit.ac.in').toLowerCase();
    const adminRollNo = process.env.ADMIN_ROLL_NO || 'ADMIN001';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'JIIT Security Desk Officer';

    const existingAdmin = await User.findOne({ $or: [{ email: adminEmail }, { role: 'admin' }] });
    if (!existingAdmin) {
      const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: adminName,
        rollNo: adminRollNo,
        email: adminEmail,
        password: hashedAdminPassword,
        role: 'admin'
      });
      console.log(`Initial Admin created: ${adminEmail} (Roll/ID: ${adminRollNo})`);
    }

    const facultyEmail = (process.env.FACULTY_EMAIL || 'faculty@jiit.ac.in').toLowerCase();
    const facultyRollNo = process.env.FACULTY_ROLL_NO || 'FAC101';
    const facultyPassword = process.env.FACULTY_PASSWORD || 'faculty123';
    const facultyName = process.env.FACULTY_NAME || 'Dr. Rajesh Kumar';

    const existingFaculty = await User.findOne({ email: facultyEmail });
    if (!existingFaculty) {
      const hashedFacultyPassword = await bcrypt.hash(facultyPassword, 10);
      await User.create({
        name: facultyName,
        rollNo: facultyRollNo,
        email: facultyEmail,
        password: hashedFacultyPassword,
        role: 'faculty'
      });
      console.log(`Initial Faculty account created: ${facultyEmail} (ID: ${facultyRollNo})`);
    }
  } catch (error) {
    console.error('Error seeding initial accounts:', error.message);
  }
}

// ==========================================
// 3. AUTHENTICATION & RBAC MIDDLEWARE
// ==========================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token. Please log in again.' });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions.' });
    }
    next();
  };
}

// ==========================================
// 4. AUTHENTICATION ROUTES (US01, US11, US19)
// ==========================================

// Register a Student or Faculty member (Admin self-registration is strictly blocked)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, rollNo, email, password, role } = req.body;

    if (!name || !rollNo || !email || !password) {
      return res.status(400).json({ message: 'All fields (name, roll number, email, password) are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    // US19: Never allow visitors to register themselves as administrators
    if (role === 'admin') {
      return res.status(403).json({ message: 'Administrator registration is not permitted.' });
    }

    const assignedRole = role === 'faculty' ? 'faculty' : 'student';
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRoll = rollNo.trim();

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { rollNo: normalizedRoll }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email or roll number already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: name.trim(),
      rollNo: normalizedRoll,
      email: normalizedEmail,
      password: hashedPassword,
      role: assignedRole
    });

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role, name: newUser.name, rollNo: newUser.rollNo },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful.',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        rollNo: newUser.rollNo,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
});

// Login for Student, Faculty, and Admin
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email/roll number and password.' });
    }

    const identifier = email.trim();
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { rollNo: identifier }]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. User not found.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials. Incorrect password.' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, rollNo: user.rollNo },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        rollNo: user.rollNo,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
});

// ==========================================
// 5. ITEM ROUTES (US02-US06, US08, US10, US12, US14, US26, US27)
// ==========================================

// Create a Lost or Found Item Report (US02, US03, US12)
app.post('/api/items', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      type,
      location,
      date,
      contactInfo,
      dropOffPoint,
      priority
    } = req.body;

    if (!title || !category || !description || !type || !location) {
      return res.status(400).json({ message: 'Title, category, type, location, and description are required.' });
    }

    if (!['lost', 'found'].includes(type)) {
      return res.status(400).json({ message: 'Item type must be either lost or found.' });
    }

    if (type === 'lost' && (!contactInfo || !contactInfo.trim())) {
      return res.status(400).json({ message: 'Contact information is required when reporting a lost item.' });
    }

    if (type === 'found' && (!dropOffPoint || !dropOffPoint.trim())) {
      return res.status(400).json({ message: 'Drop-off point is required when reporting a found item.' });
    }

    // Faculty and Admin can mark items as urgent directly (US12, US14)
    const itemPriority =
      (req.user.role === 'faculty' || req.user.role === 'admin') && priority === 'urgent'
        ? 'urgent'
        : 'normal';

    // New item reports start as pending approval (US22), unless created by Admin
    const initialApproval = req.user.role === 'admin' ? 'approved' : 'pending';

    const newItem = await Item.create({
      title: title.trim(),
      category,
      description: description.trim(),
      type,
      location: location.trim(),
      date: date || Date.now(),
      contactInfo: contactInfo ? contactInfo.trim() : '',
      dropOffPoint: dropOffPoint ? dropOffPoint.trim() : '',
      reportedBy: req.user.id,
      priority: itemPriority,
      status: type === 'lost' ? 'Lost' : 'Found',
      approvalStatus: initialApproval
    });

    const populatedItem = await Item.findById(newItem._id).populate('reportedBy', 'name rollNo email role');

    res.status(201).json({
      message:
        initialApproval === 'pending'
          ? 'Item report submitted and is pending admin verification.'
          : 'Item report published.',
      item: populatedItem
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create item report.', error: error.message });
  }
});

// Get All Approved Items with Filtering and Keyword Search (US04, US05, US06)
app.get('/api/items', async (req, res) => {
  try {
    const { status, category, type, location, priority, search } = req.query;

    const filter = { approvalStatus: 'approved' };

    if (status && status !== 'All') filter.status = status;
    if (category && category !== 'All') filter.category = category;
    if (type && type !== 'All') filter.type = type;
    if (priority && priority !== 'All') filter.priority = priority;
    if (location && location !== 'All') {
      filter.location = { $regex: location.trim(), $options: 'i' };
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: regex },
        { description: regex },
        { location: regex },
        { category: regex }
      ];
    }

    const items = await Item.find(filter)
      .populate('reportedBy', 'name rollNo email role')
      .sort({ priority: -1, createdAt: -1 });

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch items.', error: error.message });
  }
});

// Get Logged-in User's Reported Items (US08)
app.get('/api/items/my-reports', authenticateToken, async (req, res) => {
  try {
    const myItems = await Item.find({ reportedBy: req.user.id })
      .populate('reportedBy', 'name rollNo email role')
      .sort({ createdAt: -1 });

    res.json(myItems);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your reported items.', error: error.message });
  }
});

// Get Potential Lost-and-Found Match Suggestions for an Item (US27)
app.get('/api/items/:id/matches', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item || item.type === 'notice') {
      return res.json([]);
    }

    const oppositeType = item.type === 'lost' ? 'found' : 'lost';
    const activeStatus = oppositeType === 'found' ? 'Found' : 'Lost';

    const matches = await Item.find({
      _id: { $ne: item._id },
      type: oppositeType,
      category: item.category,
      status: activeStatus,
      approvalStatus: 'approved'
    })
      .populate('reportedBy', 'name rollNo email role')
      .sort({ priority: -1, createdAt: -1 })
      .limit(4);

    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch matching suggestions.', error: error.message });
  }
});

// Get Single Item by ID
app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('reportedBy', 'name rollNo email role');
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch item details.', error: error.message });
  }
});

// Update Item (US10: Mark Recovered/Closed; US14: Flag Urgent; US26: Edit Own Report Details)
app.put('/api/items/:id', authenticateToken, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    const isOwner = item.reportedBy.toString() === req.user.id;
    const isFaculty = req.user.role === 'faculty';
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isFaculty && !isAdmin) {
      return res.status(403).json({ message: 'You can only update your own reported items.' });
    }

    // US14: Faculty can flag/unflag urgent priority on items owned by others
    if (isFaculty && !isOwner) {
      if (req.body.priority && ['normal', 'urgent'].includes(req.body.priority)) {
        item.priority = req.body.priority;
        await item.save();
        const updated = await Item.findById(item._id).populate('reportedBy', 'name rollNo email role');
        return res.json({ message: `Item priority updated to ${item.priority}.`, item: updated });
      }
      return res.status(403).json({ message: 'Faculty can only update priority on reports owned by others.' });
    }

    // Owner or Admin updates (US10: mark lost item as Recovered/Closed; US26: edit report details)
    const { title, category, description, location, contactInfo, dropOffPoint, status, priority } = req.body;

    if (title) item.title = title.trim();
    if (category) item.category = category;
    if (description) item.description = description.trim();
    if (location) item.location = location.trim();
    if (contactInfo !== undefined) item.contactInfo = contactInfo.trim();
    if (dropOffPoint !== undefined) item.dropOffPoint = dropOffPoint.trim();

    if (status && ['Lost', 'Found', 'Claimed', 'Recovered', 'Closed'].includes(status)) {
      item.status = status;
    }

    if ((isFaculty || isAdmin) && priority && ['normal', 'urgent'].includes(priority)) {
      item.priority = priority;
    }

    await item.save();
    const updatedItem = await Item.findById(item._id).populate('reportedBy', 'name rollNo email role');

    res.json({ message: 'Item updated successfully.', item: updatedItem });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update item.', error: error.message });
  }
});

// Delete Own Item (Student/Faculty owner or Admin)
app.delete('/api/items/:id', authenticateToken, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    const isOwner = item.reportedBy.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You are only allowed to delete your own item reports.' });
    }

    await Claim.deleteMany({ itemId: item._id });
    await Item.findByIdAndDelete(item._id);

    res.json({ message: 'Item report and related claims deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete item.', error: error.message });
  }
});

// ==========================================
// 6. CLAIM ROUTES (US07, US09, US17, US20, US21, US23, US26)
// ==========================================

// Submit a Claim Request (US07 for Students, US17 for Faculty Departmental Claims)
app.post('/api/claims', authenticateToken, async (req, res) => {
  try {
    const { itemId, ownershipProof, identifyingMarks } = req.body;

    if (!itemId || !ownershipProof || !identifyingMarks) {
      return res.status(400).json({
        message: 'Item ID, ownership proof, and identifying marks are required to submit a claim.'
      });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    if (item.type !== 'found') {
      return res.status(400).json({ message: 'Claims can only be submitted for Found item reports.' });
    }

    if (['Claimed', 'Recovered', 'Closed'].includes(item.status)) {
      return res.status(400).json({ message: `This item is already marked as ${item.status}.` });
    }

    // Prevent duplicate active claim by the same user for the same item
    const existingClaim = await Claim.findOne({
      itemId,
      claimantId: req.user.id,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingClaim) {
      return res.status(400).json({ message: 'You already have a pending or approved claim for this item.' });
    }

    const newClaim = await Claim.create({
      itemId,
      claimantId: req.user.id,
      ownershipProof: ownershipProof.trim(),
      identifyingMarks: identifyingMarks.trim(),
      status: 'pending'
    });

    const populatedClaim = await Claim.findById(newClaim._id)
      .populate('itemId', 'title category location status type dropOffPoint')
      .populate('claimantId', 'name rollNo email role');

    res.status(201).json({
      message: 'Claim request submitted successfully.',
      claim: populatedClaim
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit claim.', error: error.message });
  }
});

// Get Logged-in User's Claims (US09, US17)
app.get('/api/claims/my-claims', authenticateToken, async (req, res) => {
  try {
    const claims = await Claim.find({ claimantId: req.user.id })
      .populate('itemId', 'title category location date status type dropOffPoint')
      .sort({ createdAt: -1 });

    res.json(claims);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your claim requests.', error: error.message });
  }
});

// Withdraw a Pending Claim Request (US26 - Claimant or Admin)
app.delete('/api/claims/:id', authenticateToken, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ message: 'Claim request not found.' });
    }

    const isClaimant = claim.claimantId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isClaimant && !isAdmin) {
      return res.status(403).json({ message: 'You can only withdraw your own claim requests.' });
    }

    if (claim.status !== 'pending' && !isAdmin) {
      return res.status(400).json({ message: 'Only pending claim requests can be withdrawn.' });
    }

    await Claim.findByIdAndDelete(claim._id);
    res.json({ message: 'Pending claim request withdrawn successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to withdraw claim request.', error: error.message });
  }
});

// Get All Incoming Claims for Admin / Security Desk (US20)
app.get('/api/claims', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const claims = await Claim.find()
      .populate('itemId', 'title category location date status type dropOffPoint priority')
      .populate('claimantId', 'name rollNo email role')
      .sort({ createdAt: -1 });

    res.json(claims);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch claims.', error: error.message });
  }
});

// Approve or Reject a Claim (US21 - Admin Only)
app.put('/api/claims/:id/status', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Claim status must be approved or rejected.' });
    }

    const claim = await Claim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found.' });
    }

    const item = await Item.findById(claim.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Associated item not found.' });
    }

    if (status === 'approved') {
      // Prevent approving if another claim is already approved for this item
      const alreadyApproved = await Claim.findOne({
        itemId: item._id,
        _id: { $ne: claim._id },
        status: 'approved'
      });

      if (alreadyApproved) {
        return res.status(400).json({
          message: 'Another claim has already been approved for this item.'
        });
      }

      claim.status = 'approved';
      await claim.save();

      // Update item status to Claimed
      item.status = 'Claimed';
      await item.save();

      // Reject other pending claims for the same item automatically
      await Claim.updateMany(
        { itemId: item._id, _id: { $ne: claim._id }, status: 'pending' },
        { $set: { status: 'rejected' } }
      );
    } else {
      claim.status = 'rejected';
      await claim.save();

      // Keep item available (Found) if no other approved claim exists
      const otherApproved = await Claim.findOne({
        itemId: item._id,
        _id: { $ne: claim._id },
        status: 'approved'
      });
      if (!otherApproved && item.status === 'Claimed') {
        item.status = 'Found';
        await item.save();
      }
    }

    const updatedClaim = await Claim.findById(claim._id)
      .populate('itemId', 'title category location date status type dropOffPoint')
      .populate('claimantId', 'name rollNo email role');

    res.json({
      message: `Claim has been ${status}.`,
      claim: updatedClaim
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update claim status.', error: error.message });
  }
});

// Record Physical Handover (US23 - Admin Only)
app.put('/api/claims/:id/handover', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { receiverName, receiverRollNo, handoverDate, itemStatus } = req.body;

    if (!receiverName || !receiverRollNo) {
      return res.status(400).json({ message: 'Receiver name and roll number are required for handover.' });
    }

    const claim = await Claim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ message: 'Claim record not found.' });
    }

    if (claim.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved claims can proceed to physical handover.' });
    }

    claim.receiverName = receiverName.trim();
    claim.receiverRollNo = receiverRollNo.trim();
    claim.handoverDate = handoverDate ? new Date(handoverDate) : new Date();
    await claim.save();

    const item = await Item.findById(claim.itemId);
    if (item) {
      item.status = itemStatus === 'Closed' ? 'Closed' : 'Recovered';
      await item.save();
    }

    const updatedClaim = await Claim.findById(claim._id)
      .populate('itemId', 'title category location date status type dropOffPoint')
      .populate('claimantId', 'name rollNo email role');

    res.json({
      message: 'Physical handover recorded and item marked as Recovered.',
      claim: updatedClaim
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to record physical handover.', error: error.message });
  }
});

// ==========================================
// 7. FACULTY ROUTES (US12-US16, US18, US28)
// ==========================================

// View Active Campus Reports & Filter by Academic Block (US13, US16)
app.get('/api/faculty/items', authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
  try {
    const { location, type, priority, status, search } = req.query;
    const filter = { approvalStatus: 'approved' };

    if (type && type !== 'All') filter.type = type;
    if (priority && priority !== 'All') filter.priority = priority;
    if (status && status !== 'All') filter.status = status;
    if (location && location !== 'All') {
      filter.location = { $regex: location.trim(), $options: 'i' };
    }
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: regex }, { description: regex }, { location: regex }];
    }

    const items = await Item.find(filter)
      .populate('reportedBy', 'name rollNo email role')
      .sort({ priority: -1, createdAt: -1 });

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch faculty item feed.', error: error.message });
  }
});

// Post Campus-Wide Lost & Found Announcement using Item model (US15)
app.post('/api/faculty/notices', authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
  try {
    const { title, description, location, priority } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Announcement title and description are required.' });
    }

    const notice = await Item.create({
      title: title.trim(),
      category: 'Announcement',
      description: description.trim(),
      type: 'notice',
      location: location && location.trim() ? location.trim() : 'Campus-Wide',
      date: Date.now(),
      reportedBy: req.user.id,
      priority: priority === 'urgent' ? 'urgent' : 'normal',
      status: 'Closed',
      approvalStatus: 'approved'
    });

    const populatedNotice = await Item.findById(notice._id).populate('reportedBy', 'name rollNo email role');

    res.status(201).json({
      message: 'Campus announcement published successfully.',
      notice: populatedNotice
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to publish announcement.', error: error.message });
  }
});

// Edit or Remove Campus Announcements (US28 - Faculty Owner or Admin)
app.put('/api/faculty/notices/:id', authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
  try {
    const notice = await Item.findOne({ _id: req.params.id, type: 'notice' });
    if (!notice) {
      return res.status(404).json({ message: 'Campus announcement not found.' });
    }

    const isOwner = notice.reportedBy.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You can only edit announcements you published.' });
    }

    const { title, description, location, priority } = req.body;
    if (title) notice.title = title.trim();
    if (description) notice.description = description.trim();
    if (location) notice.location = location.trim();
    if (priority && ['normal', 'urgent'].includes(priority)) notice.priority = priority;

    await notice.save();
    const updatedNotice = await Item.findById(notice._id).populate('reportedBy', 'name rollNo email role');
    res.json({ message: 'Campus announcement updated.', notice: updatedNotice });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update announcement.', error: error.message });
  }
});

app.delete('/api/faculty/notices/:id', authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
  try {
    const notice = await Item.findOne({ _id: req.params.id, type: 'notice' });
    if (!notice) {
      return res.status(404).json({ message: 'Campus announcement not found.' });
    }

    const isOwner = notice.reportedBy.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You can only remove announcements you published.' });
    }

    await Item.findByIdAndDelete(notice._id);
    res.json({ message: 'Campus announcement removed.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete announcement.', error: error.message });
  }
});

// View Resolved Handover History (US18)
app.get('/api/faculty/history', authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
  try {
    const resolvedItems = await Item.find({
      type: { $in: ['lost', 'found'] },
      status: { $in: ['Recovered', 'Closed'] }
    })
      .populate('reportedBy', 'name rollNo email role')
      .sort({ createdAt: -1 });

    // Attach handover record if resolved via claim handover
    const completedClaims = await Claim.find({
      status: 'approved'
    })
      .select('itemId claimantId receiverName receiverRollNo handoverDate status createdAt')
      .populate('claimantId', 'name rollNo email role');

    const claimMap = {};
    completedClaims.forEach((c) => {
      claimMap[c.itemId.toString()] = c;
    });

    const history = resolvedItems.map((item) => ({
      item,
      handover: claimMap[item._id.toString()] || null
    }));

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch handover history.', error: error.message });
  }
});

// ==========================================
// 8. ADMIN ROUTES (US22, US24, US25, US29, US30)
// ==========================================

// Admin Dashboard Counters & All Reports Queue (US22, US24)
app.get('/api/admin/dashboard', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const totalLostItems = await Item.countDocuments({ type: 'lost' });
    const totalFoundItems = await Item.countDocuments({ type: 'found' });
    const pendingClaims = await Claim.countDocuments({ status: 'pending' });
    const successfullyReturnedItems = await Item.countDocuments({ status: 'Recovered' });

    const allItems = await Item.find()
      .populate('reportedBy', 'name rollNo email role')
      .sort({ createdAt: -1 });

    res.json({
      counters: {
        totalLostItems,
        totalFoundItems,
        pendingClaims,
        successfullyReturnedItems
      },
      items: allItems
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admin dashboard data.', error: error.message });
  }
});

// Get All Registered Users (US29 - Admin Only, never expose password hashes)
app.get('/api/admin/users', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users.', error: error.message });
  }
});

// Update Campus User Role between Student and Faculty (US29 - Admin Only)
app.put('/api/admin/users/:id/role', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'faculty'].includes(role)) {
      return res.status(400).json({ message: 'Role can only be updated to student or faculty.' });
    }

    const targetUser = await User.findById(req.params.id).select('-password');
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (targetUser.role === 'admin') {
      return res.status(403).json({ message: 'Cannot modify an administrator account role.' });
    }

    targetUser.role = role;
    await targetUser.save();

    res.json({
      message: `${targetUser.name}'s role updated to ${role}.`,
      user: targetUser
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user role.', error: error.message });
  }
});

// Generate Campus Audit & Handover Summary Report (US30 - Admin Only)
app.get('/api/admin/audit-report', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const items = await Item.find().populate('reportedBy', 'name rollNo email role').sort({ createdAt: -1 });
    const handovers = await Claim.find({ status: 'approved' })
      .populate('itemId', 'title category location status')
      .populate('claimantId', 'name rollNo email role')
      .sort({ handoverDate: -1, createdAt: -1 });

    const categoryBreakdown = {};
    items.forEach((item) => {
      categoryBreakdown[item.category] = (categoryBreakdown[item.category] || 0) + 1;
    });

    res.json({
      generatedAt: new Date(),
      totalReports: items.length,
      categoryBreakdown,
      handovers
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate audit report.', error: error.message });
  }
});

// Verify and Publish or Reject Item Reports (US22)
app.put('/api/admin/items/:id/approval', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { approvalStatus } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(approvalStatus)) {
      return res.status(400).json({ message: 'Invalid approval status.' });
    }

    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { approvalStatus },
      { new: true }
    ).populate('reportedBy', 'name rollNo email role');

    if (!item) {
      return res.status(404).json({ message: 'Item report not found.' });
    }

    res.json({
      message: `Report ${approvalStatus} successfully.`,
      item
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update report approval status.', error: error.message });
  }
});

// Delete Old, Spam, or Resolved Records Safely (US22, US25)
app.delete('/api/admin/items/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item record not found.' });
    }

    // Safely remove related claims before deleting the item
    const deletedClaims = await Claim.deleteMany({ itemId: item._id });
    await Item.findByIdAndDelete(item._id);

    res.json({
      message: `Item report deleted along with ${deletedClaims.deletedCount} related claim record(s).`
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete item record.', error: error.message });
  }
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'JIIT FindIt Backend API' });
});

// ==========================================
// 9. DATABASE CONNECTION & SERVER STARTUP
// ==========================================
async function startServer() {
  let uri = MONGO_URI;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log(`Connected to MongoDB: ${uri}`);
  } catch (err) {
    console.log(`Local MongoDB offline (${err.message}). Activating zero-config in-memory MongoDB...`);
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create({ instance: { dbName: 'campus_lost_found' } });
    uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log(`Connected to In-Memory MongoDB engine successfully!`);
  }

  await seedInitialAccounts();
  return app.listen(PORT, () => {
    console.log(`JIIT FindIt Server running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Server startup error:', err);
    process.exit(1);
  });
}

module.exports = { app, User, Item, Claim, seedInitialAccounts };
