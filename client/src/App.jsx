import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000/api';

// JIIT Sector 128 campus locations for quick selection and filtering
const CAMPUS_LOCATIONS = [
  'Library (LRC-128)',
  'Cafeteria / Tuck Shop',
  'MP Hall (Multipurpose Hall)',
  'Academic Block - Ground Floor',
  'Academic Block - 1st Floor',
  'Academic Block - 2nd Floor',
  'Computer Labs (CL)',
  'ECE / Physics Labs',
  'Mughal Garden / Central Lawn',
  'Sports Ground / Courts',
  'Gate 1 Security Desk'
];

const ITEM_CATEGORIES = ['Electronics', 'ID Cards', 'Books/Notes', 'Accessories', 'Other'];

export default function App() {
  const navigate = useNavigate();

  // Auth State initialized from localStorage
  const [token, setToken] = useState(() => localStorage.getItem('jiit_findit_token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('jiit_findit_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Global feedback banner
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  function showMessage(type, text) {
    setFeedback({ type, text });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function clearMessage() {
    setFeedback({ type: '', text: '' });
  }

  function handleAuthSuccess(authToken, userData, msg) {
    localStorage.setItem('jiit_findit_token', authToken);
    localStorage.setItem('jiit_findit_user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
    showMessage('success', msg || `Welcome, ${userData.name}!`);

    if (userData.role === 'admin') navigate('/admin');
    else if (userData.role === 'faculty') navigate('/faculty');
    else navigate('/student');
  }

  function handleLogout() {
    localStorage.removeItem('jiit_findit_token');
    localStorage.removeItem('jiit_findit_user');
    setToken('');
    setUser(null);
    showMessage('success', 'You have been logged out.');
    navigate('/login');
  }

  // Helper for authenticated fetch calls using standard JavaScript fetch()
  async function apiFetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Request failed.');
    }
    return data;
  }

  function getDashboardPath() {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'faculty') return '/faculty';
    return '/student';
  }

  return (
    <div className="app-shell">
      {/* Top Navigation Bar */}
      <header className="navbar">
        <div className="nav-container">
          <Link to="/" className="brand-logo" onClick={clearMessage}>
            <span className="brand-badge">JIIT-128</span> FindIt
            <span className="brand-subtitle">Campus Lost &amp; Found</span>
          </Link>

          <nav className="nav-links">
            <Link to="/feed" onClick={clearMessage}>Browse Feed</Link>

            {user && (
              <>
                <Link to={getDashboardPath()} onClick={clearMessage}>
                  {user.role === 'admin'
                    ? 'Admin Desk'
                    : user.role === 'faculty'
                    ? 'Faculty Portal'
                    : 'Student Dashboard'}
                </Link>
                <Link to="/report" onClick={clearMessage}>Report Item</Link>
                <Link to="/my-activity" onClick={clearMessage}>My Reports &amp; Claims</Link>
              </>
            )}

            {!user ? (
              <div className="nav-auth">
                <Link to="/login" className="btn btn-outline" onClick={clearMessage}>Login</Link>
                <Link to="/register" className="btn btn-primary" onClick={clearMessage}>Register</Link>
              </div>
            ) : (
              <div className="nav-user">
                <span className="user-pill">
                  {user.name} ({user.role.toUpperCase()})
                </span>
                <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Global Alert Banner */}
      {feedback.text && (
        <div className={`alert-banner ${feedback.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          <span>{feedback.text}</span>
          <button type="button" className="alert-close" onClick={clearMessage}>×</button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-container">
        <Routes>
          <Route path="/" element={<LandingPage user={user} getDashboardPath={getDashboardPath} />} />
          <Route
            path="/login"
            element={<LoginPage onAuthSuccess={handleAuthSuccess} showMessage={showMessage} />}
          />
          <Route
            path="/register"
            element={<RegisterPage onAuthSuccess={handleAuthSuccess} showMessage={showMessage} />}
          />
          <Route
            path="/feed"
            element={<FeedPage apiFetch={apiFetch} user={user} showMessage={showMessage} />}
          />
          <Route
            path="/report"
            element={
              user ? (
                <ReportItemPage apiFetch={apiFetch} user={user} showMessage={showMessage} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/items/:id"
            element={<ItemDetailsPage apiFetch={apiFetch} user={user} showMessage={showMessage} />}
          />
          <Route
            path="/my-activity"
            element={
              user ? (
                <MyActivityPage apiFetch={apiFetch} user={user} showMessage={showMessage} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/student"
            element={
              user ? (
                <StudentDashboard apiFetch={apiFetch} user={user} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/faculty"
            element={
              user && (user.role === 'faculty' || user.role === 'admin') ? (
                <FacultyDashboard apiFetch={apiFetch} user={user} showMessage={showMessage} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/admin"
            element={
              user && user.role === 'admin' ? (
                <AdminDashboard apiFetch={apiFetch} showMessage={showMessage} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </main>

      <footer className="footer">
        <p>JIIT FindIt (Sector 128 Campus) — Lost &amp; Found Portal | Agile Software Development (ASD) Lab Project (30 User Stories)</p>
      </footer>
    </div>
  );
}

// =========================================================
// SCREEN 1: LANDING PAGE
// =========================================================
function LandingPage({ user, getDashboardPath }) {
  return (
    <div className="landing-wrapper">
      <section className="hero-card">
        <span className="hero-tag">Jaypee Institute of Information Technology — Sector 128</span>
        <h1>JIIT FindIt — Campus Lost &amp; Found Portal</h1>
        <p className="hero-lead">
          A unified portal connecting students, faculty, and the JIIT-128 security desk to report,
          search, match, verify, and recover lost belongings across the Academic Block, Library
          (LRC-128), MP Hall, Computer Labs, Mughal Garden, and Cafeteria.
        </p>

        <div className="hero-actions">
          <Link to="/feed" className="btn btn-primary">Browse Lost &amp; Found Feed</Link>
          {user ? (
            <>
              <Link to={getDashboardPath()} className="btn btn-outline">Go to My Dashboard</Link>
              <Link to="/report" className="btn btn-outline">Report an Item</Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline">Sign In</Link>
              <Link to="/register" className="btn btn-outline">Student / Faculty Registration</Link>
            </>
          )}
        </div>
      </section>

      <section className="role-grid">
        <div className="card">
          <h3>1. Student Portal (US01–10, US26–27)</h3>
          <p>
            Report lost or found belongings, view smart match suggestions, edit reports, submit or
            withdraw ownership claims, and mark recovered items.
          </p>
        </div>
        <div className="card">
          <h3>2. Faculty &amp; Staff Portal (US11–18, US28)</h3>
          <p>
            Report high-priority items left in laboratories or lecture theatres, flag urgent items,
            post and manage campus announcements, and review handover history.
          </p>
        </div>
        <div className="card">
          <h3>3. Security Desk / Admin (US19–25, US29–30)</h3>
          <p>
            Verify and publish item reports, review ownership proofs, record physical handovers at
            Gate 1 / Reception, manage campus user roles, and export CSV audit reports.
          </p>
        </div>
      </section>
    </div>
  );
}

// =========================================================
// SCREEN 2: REGISTER PAGE (US01, US11, US19)
// =========================================================
function RegisterPage({ onAuthSuccess, showMessage }) {
  const [formData, setFormData] = useState({
    name: '',
    rollNo: '',
    email: '',
    password: '',
    role: 'student'
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.');
      }
      onAuthSuccess(data.token, data.user, 'Account registered successfully!');
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card card">
      <h2>Create a Campus Account</h2>
      <p className="muted-text">
        Register as a Student or Faculty member. Administrator accounts are provisioned via server
        environment variables only.
      </p>

      <form onSubmit={handleSubmit} className="form-stack">
        <div className="form-group">
          <label>Account Role</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            <option value="student">Student</option>
            <option value="faculty">Faculty / Staff</option>
          </select>
        </div>

        <div className="form-group">
          <label>Full Name *</label>
          <input
            type="text"
            required
            placeholder="e.g., Aarav Sharma"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>{formData.role === 'faculty' ? 'Employee ID *' : 'College Roll Number *'}</label>
          <input
            type="text"
            required
            placeholder={formData.role === 'faculty' ? 'e.g., FAC204' : 'e.g., 9923103001'}
            value={formData.rollNo}
            onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>College Email *</label>
          <input
            type="email"
            required
            placeholder="e.g., student@mail.jiit.ac.in"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Password (min 6 characters) *</label>
          <input
            type="password"
            required
            minLength={6}
            placeholder="Enter a strong password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
}

// =========================================================
// SCREEN 3: LOGIN PAGE (US01, US11, US19)
// =========================================================
function LoginPage({ onAuthSuccess, showMessage }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed.');
      }
      onAuthSuccess(data.token, data.user, `Logged in as ${data.user.name} (${data.user.role})`);
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  }

  function fillDemoCredentials(demoEmail, demoPass) {
    setEmail(demoEmail);
    setPassword(demoPass);
  }

  return (
    <div className="auth-card card">
      <h2>Portal Login</h2>
      <p className="muted-text">
        Sign in using your JIIT Email or Roll Number / Employee ID. You will be redirected to your
        role dashboard automatically.
      </p>

      <form onSubmit={handleSubmit} className="form-stack">
        <div className="form-group">
          <label>Email or Roll Number *</label>
          <input
            type="text"
            required
            placeholder="e.g., admin@jiit.ac.in or 9923103001"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Password *</label>
          <input
            type="password"
            required
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Signing In...' : 'Login'}
        </button>
      </form>

      <div className="demo-box">
        <p className="demo-title">Pre-Configured Lab Evaluation Accounts:</p>
        <div className="demo-buttons">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => fillDemoCredentials('admin@jiit.ac.in', 'admin123')}
          >
            Fill Admin (admin@jiit.ac.in)
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => fillDemoCredentials('faculty@jiit.ac.in', 'faculty123')}
          >
            Fill Faculty (faculty@jiit.ac.in)
          </button>
        </div>
      </div>

      <p className="auth-switch">
        New student or faculty member? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}

// =========================================================
// SCREEN 4: STUDENT DASHBOARD (EPIC 1: US01 - US10, US26, US27)
// =========================================================
function StudentDashboard({ apiFetch, user }) {
  const [myReports, setMyReports] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [recentNotices, setRecentNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudentData() {
      setLoading(true);
      try {
        const [reportsData, claimsData, noticesData] = await Promise.all([
          apiFetch('/items/my-reports'),
          apiFetch('/claims/my-claims'),
          apiFetch('/items?type=notice')
        ]);
        setMyReports(reportsData);
        setMyClaims(claimsData);
        setRecentNotices(noticesData.slice(0, 3));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStudentData();
  }, []);

  return (
    <div className="dashboard-space">
      <div className="page-header">
        <div>
          <h2>Student Dashboard</h2>
          <p className="muted-text">
            Welcome, <strong>{user.name}</strong> (Roll No: {user.rollNo})
          </p>
        </div>
        <div className="header-actions">
          <Link to="/report?type=lost" className="btn btn-primary">+ Report Lost Item</Link>
          <Link to="/report?type=found" className="btn btn-outline">+ Report Found Item</Link>
          <Link to="/feed" className="btn btn-outline">Browse Campus Feed</Link>
        </div>
      </div>

      {/* Summary Counters */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">My Reported Items</span>
          <strong className="stat-value">{myReports.length}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Approved &amp; Published</span>
          <strong className="stat-value">
            {myReports.filter((i) => i.approvalStatus === 'approved').length}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">My Claim Requests</span>
          <strong className="stat-value">{myClaims.length}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Approved Claims</span>
          <strong className="stat-value">
            {myClaims.filter((c) => c.status === 'approved').length}
          </strong>
        </div>
      </div>

      {/* Campus Announcements (US15) */}
      {recentNotices.length > 0 && (
        <section className="section-block">
          <h3>Campus Lost &amp; Found Announcements</h3>
          <div className="cards-grid">
            {recentNotices.map((notice) => (
              <div key={notice._id} className="card notice-card">
                <div className="card-top">
                  <span className="badge badge-notice">CAMPUS NOTICE</span>
                  {notice.priority === 'urgent' && <span className="badge badge-urgent">URGENT</span>}
                </div>
                <h4>{notice.title}</h4>
                <p>{notice.description}</p>
                <div className="card-meta">
                  <span>Location: {notice.location}</span>
                  <span>By: {notice.reportedBy?.name || 'Faculty'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Snapshot of My Reports & Claims */}
      <div className="two-col-grid">
        <div className="card">
          <div className="section-header-inline">
            <h3>My Recent Reports (US08 &amp; US27)</h3>
            <Link to="/my-activity" className="link-text">Manage / Edit All →</Link>
          </div>
          {loading ? (
            <p className="muted-text">Loading reports...</p>
          ) : myReports.length === 0 ? (
            <p className="muted-text">You have not reported any lost or found items yet.</p>
          ) : (
            <ul className="compact-list">
              {myReports.slice(0, 5).map((item) => (
                <li key={item._id} className="compact-item">
                  <div>
                    <Link to={`/items/${item._id}`} className="item-link">
                      <strong>{item.title}</strong>
                    </Link>
                    <div className="muted-small">
                      {item.type.toUpperCase()} • {item.location} • Click to view matches (US27)
                    </div>
                  </div>
                  <div className="badge-group">
                    <span className={`badge badge-status-${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                    <span className={`badge badge-approval-${item.approvalStatus}`}>
                      {item.approvalStatus}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="section-header-inline">
            <h3>My Claim Requests (US09 &amp; US26)</h3>
            <Link to="/my-activity" className="link-text">View / Withdraw →</Link>
          </div>
          {loading ? (
            <p className="muted-text">Loading claims...</p>
          ) : myClaims.length === 0 ? (
            <p className="muted-text">You have not submitted any item claims yet.</p>
          ) : (
            <ul className="compact-list">
              {myClaims.slice(0, 5).map((claim) => (
                <li key={claim._id} className="compact-item">
                  <div>
                    <strong>{claim.itemId ? claim.itemId.title : 'Deleted Item'}</strong>
                    <div className="muted-small">
                      Drop-off: {claim.itemId?.dropOffPoint || 'Gate 1 Security Desk'}
                    </div>
                  </div>
                  <span className={`badge badge-approval-${claim.status}`}>
                    {claim.status.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// SCREEN 5: FACULTY DASHBOARD (EPIC 2: US11 - US18, US28)
// =========================================================
function FacultyDashboard({ apiFetch, user, showMessage }) {
  const [activeTab, setActiveTab] = useState('reports');
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [blockFilter, setBlockFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Notice Form State (US15 & US28)
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    description: '',
    location: 'Campus-Wide (JIIT-128)',
    priority: 'normal'
  });
  const [editingNoticeId, setEditingNoticeId] = useState(null);

  // High-Priority Found Item Form State (US12)
  const [foundForm, setFoundForm] = useState({
    title: '',
    category: 'Electronics',
    location: 'Academic Block - Ground Floor',
    date: new Date().toISOString().split('T')[0],
    description: '',
    dropOffPoint: 'Department Office / Gate 1 Security Desk',
    priority: 'urgent'
  });

  async function loadFacultyItems() {
    try {
      const params = new URLSearchParams();
      if (blockFilter !== 'All') params.append('location', blockFilter);
      if (typeFilter !== 'All') params.append('type', typeFilter);
      if (priorityFilter !== 'All') params.append('priority', priorityFilter);
      const data = await apiFetch(`/faculty/items?${params.toString()}`);
      setItems(data);
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  async function loadHistory() {
    try {
      const data = await apiFetch('/faculty/history');
      setHistory(data);
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  useEffect(() => {
    loadFacultyItems();
    loadHistory();
  }, [blockFilter, typeFilter, priorityFilter]);

  // US14: Toggle urgent flag on an item
  async function handleToggleUrgent(item) {
    const nextPriority = item.priority === 'urgent' ? 'normal' : 'urgent';
    try {
      await apiFetch(`/items/${item._id}`, {
        method: 'PUT',
        body: JSON.stringify({ priority: nextPriority })
      });
      showMessage('success', `Item marked as ${nextPriority.toUpperCase()}.`);
      loadFacultyItems();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  // US15 & US28: Post or Update campus-wide announcement
  async function handlePostNotice(e) {
    e.preventDefault();
    try {
      if (editingNoticeId) {
        await apiFetch(`/faculty/notices/${editingNoticeId}`, {
          method: 'PUT',
          body: JSON.stringify(noticeForm)
        });
        showMessage('success', 'Campus announcement updated (US28)!');
        setEditingNoticeId(null);
      } else {
        await apiFetch('/faculty/notices', {
          method: 'POST',
          body: JSON.stringify(noticeForm)
        });
        showMessage('success', 'Campus announcement published (US15)!');
      }
      setNoticeForm({
        title: '',
        description: '',
        location: 'Campus-Wide (JIIT-128)',
        priority: 'normal'
      });
      loadFacultyItems();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  // US28: Start editing an announcement
  function startEditNotice(notice) {
    setEditingNoticeId(notice._id);
    setNoticeForm({
      title: notice.title,
      description: notice.description,
      location: notice.location || 'Campus-Wide (JIIT-128)',
      priority: notice.priority || 'normal'
    });
    setActiveTab('notice');
  }

  // US28: Remove an announcement
  async function handleDeleteNotice(noticeId) {
    try {
      await apiFetch(`/faculty/notices/${noticeId}`, { method: 'DELETE' });
      showMessage('success', 'Campus announcement removed (US28).');
      loadFacultyItems();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  // US12: Report high-priority found item from lab/classroom
  async function handleReportFound(e) {
    e.preventDefault();
    try {
      await apiFetch('/items', {
        method: 'POST',
        body: JSON.stringify({
          ...foundForm,
          type: 'found'
        })
      });
      showMessage('success', 'High-priority found item submitted for verification.');
      setFoundForm({
        title: '',
        category: 'Electronics',
        location: 'Academic Block - Ground Floor',
        date: new Date().toISOString().split('T')[0],
        description: '',
        dropOffPoint: 'Department Office / Gate 1 Security Desk',
        priority: 'urgent'
      });
      setActiveTab('reports');
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  const publishedNotices = items.filter((i) => i.type === 'notice');

  return (
    <div className="dashboard-space">
      <div className="page-header">
        <div>
          <h2>Faculty &amp; Staff Portal (JIIT-128)</h2>
          <p className="muted-text">
            Logged in as <strong>{user.name}</strong> ({user.rollNo})
          </p>
        </div>
        <div className="tab-buttons">
          <button
            type="button"
            className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('reports')}
          >
            Active Reports &amp; Block Filter (US13/14/16)
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'found' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('found')}
          >
            Report Lab/Classroom Item (US12)
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'notice' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('notice')}
          >
            Announcements (US15 &amp; US28)
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('history')}
          >
            Resolved Handover History (US18)
          </button>
        </div>
      </div>

      {/* TAB 1: Active Reports, Block Filter, Urgent Flagging & Departmental Claim Link */}
      {activeTab === 'reports' && (
        <section className="section-block">
          <div className="filter-bar card">
            <div className="form-group">
              <label>JIIT-128 Block / Location (US16)</label>
              <select value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)}>
                <option value="All">All JIIT-128 Locations</option>
                {CAMPUS_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Report Type (US13)</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="All">All Types</option>
                <option value="lost">Active Lost Reports</option>
                <option value="found">Found Item Reports</option>
                <option value="notice">Campus Announcements</option>
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="All">All Priorities</option>
                <option value="urgent">Urgent Only</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>

          <div className="cards-grid">
            {items.length === 0 ? (
              <p className="muted-text">No active reports match the selected filters.</p>
            ) : (
              items.map((item) => (
                <div key={item._id} className="card item-card">
                  <div className="card-top">
                    <span className={`badge badge-type-${item.type}`}>{item.type.toUpperCase()}</span>
                    <span className={`badge badge-status-${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                    {item.priority === 'urgent' && (
                      <span className="badge badge-urgent">URGENT</span>
                    )}
                  </div>
                  <h4>{item.title}</h4>
                  <p className="item-desc">{item.description}</p>
                  <div className="card-meta">
                    <span>Category: {item.category}</span>
                    <span>Location: {item.location}</span>
                    <span>Reported By: {item.reportedBy?.name || 'Campus User'}</span>
                  </div>
                  <div className="card-actions">
                    <Link to={`/items/${item._id}`} className="btn btn-outline btn-sm">
                      {item.type === 'found' ? 'View / Departmental Claim (US17)' : 'View Details'}
                    </Link>
                    {item.type !== 'notice' ? (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleToggleUrgent(item)}
                      >
                        {item.priority === 'urgent' ? 'Remove Urgent Flag' : 'Flag Urgent (US14)'}
                      </button>
                    ) : (
                      (item.reportedBy?._id === user.id || user.role === 'admin') && (
                        <>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => startEditNotice(item)}
                          >
                            Edit Notice (US28)
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteNotice(item._id)}
                          >
                            Remove
                          </button>
                        </>
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* TAB 2: Report High-Priority Found Item (US12) */}
      {activeTab === 'found' && (
        <div className="card form-card">
          <h3>Report High-Priority Found Item (US12)</h3>
          <p className="muted-text">
            Use this form to report belongings discovered in laboratories, lecture theatres, or
            faculty cabins at JIIT Sector 128 (such as hall tickets, ID cards, lab equipment, or
            electronics).
          </p>
          <form onSubmit={handleReportFound} className="form-stack">
            <div className="form-row">
              <div className="form-group">
                <label>Item Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., B.Tech Exam Hall Ticket & Scientific Calculator"
                  value={foundForm.title}
                  onChange={(e) => setFoundForm({ ...foundForm, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <select
                  value={foundForm.category}
                  onChange={(e) => setFoundForm({ ...foundForm, category: e.target.value })}
                >
                  {ITEM_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Academic Block / Lab Location *</label>
                <input
                  type="text"
                  required
                  list="faculty-locations-list"
                  placeholder="e.g., Computer Labs (CL) / Academic Block - 1st Floor"
                  value={foundForm.location}
                  onChange={(e) => setFoundForm({ ...foundForm, location: e.target.value })}
                />
                <datalist id="faculty-locations-list">
                  {CAMPUS_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label>Priority Level (US14)</label>
                <select
                  value={foundForm.priority}
                  onChange={(e) => setFoundForm({ ...foundForm, priority: e.target.value })}
                >
                  <option value="urgent">Urgent (Hall Tickets, Wallets, Lab Kits, IDs)</option>
                  <option value="normal">Normal</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date Found *</label>
                <input
                  type="date"
                  required
                  value={foundForm.date}
                  onChange={(e) => setFoundForm({ ...foundForm, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Drop-off / Collection Point *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Faculty Cabin / Gate 1 Security Desk"
                  value={foundForm.dropOffPoint}
                  onChange={(e) => setFoundForm({ ...foundForm, dropOffPoint: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                rows={3}
                required
                placeholder="Describe the item and where it was found..."
                value={foundForm.description}
                onChange={(e) => setFoundForm({ ...foundForm, description: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary">Submit High-Priority Found Report</button>
          </form>
        </div>
      )}

      {/* TAB 3: Post & Manage Campus Announcements (US15 & US28) */}
      {activeTab === 'notice' && (
        <div className="dashboard-space">
          <div className="card form-card">
            <h3>
              {editingNoticeId
                ? 'Edit Campus Announcement (US28)'
                : 'Post Campus Lost & Found Announcement (US15)'}
            </h3>
            <p className="muted-text">
              Announcements are published immediately in the main feed using the shared Item
              collection with <code>type: "notice"</code>.
            </p>
            <form onSubmit={handlePostNotice} className="form-stack">
              <div className="form-group">
                <label>Announcement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Unclaimed End-Sem Calculators & ID Cards at Gate 1 Security Desk"
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Relevant Block / Location</label>
                  <input
                    type="text"
                    placeholder="e.g., Academic Block / Library (LRC-128)"
                    value={noticeForm.location}
                    onChange={(e) => setNoticeForm({ ...noticeForm, location: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={noticeForm.priority}
                    onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value })}
                  >
                    <option value="normal">Normal Notice</option>
                    <option value="urgent">Urgent Campus Notice</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Announcement Details *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide instructions for students or staff regarding collection timings and venue..."
                  value={noticeForm.description}
                  onChange={(e) => setNoticeForm({ ...noticeForm, description: e.target.value })}
                />
              </div>

              <div className="card-actions">
                <button type="submit" className="btn btn-primary">
                  {editingNoticeId ? 'Save Changes (US28)' : 'Publish Campus Announcement (US15)'}
                </button>
                {editingNoticeId && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setEditingNoticeId(null);
                      setNoticeForm({
                        title: '',
                        description: '',
                        location: 'Campus-Wide (JIIT-128)',
                        priority: 'normal'
                      });
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="card">
            <h3>Manage Published Campus Announcements (US28)</h3>
            {publishedNotices.length === 0 ? (
              <p className="muted-text">No campus announcements published yet.</p>
            ) : (
              <div className="cards-grid">
                {publishedNotices.map((notice) => (
                  <div key={notice._id} className="card notice-card">
                    <div className="card-top">
                      <span className="badge badge-notice">CAMPUS NOTICE</span>
                      {notice.priority === 'urgent' && (
                        <span className="badge badge-urgent">URGENT</span>
                      )}
                    </div>
                    <h4>{notice.title}</h4>
                    <p className="item-desc">{notice.description}</p>
                    <div className="card-meta">
                      <span>Location: {notice.location}</span>
                      <span>Posted By: {notice.reportedBy?.name || 'Faculty'}</span>
                    </div>
                    {(notice.reportedBy?._id === user.id || user.role === 'admin') && (
                      <div className="card-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => startEditNotice(notice)}
                        >
                          Edit Notice
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteNotice(notice._id)}
                        >
                          Remove Notice
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Resolved Handover History (US18) */}
      {activeTab === 'history' && (
        <div className="card">
          <h3>Resolved Items &amp; Handover History (US18)</h3>
          {history.length === 0 ? (
            <p className="muted-text">No resolved or handed-over items recorded yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item Title</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Receiver Name</th>
                    <th>Receiver Roll/ID</th>
                    <th>Handover Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(({ item, handover }) => (
                    <tr key={item._id}>
                      <td><strong>{item.title}</strong></td>
                      <td>{item.category}</td>
                      <td>{item.location}</td>
                      <td>
                        <span className={`badge badge-status-${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{handover?.receiverName || item.reportedBy?.name || 'Self-Recovered'}</td>
                      <td>{handover?.receiverRollNo || item.reportedBy?.rollNo || '—'}</td>
                      <td>
                        {handover?.handoverDate
                          ? new Date(handover.handoverDate).toLocaleDateString()
                          : new Date(item.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================
// SCREEN 6: ADMIN / SECURITY DESK DASHBOARD (EPIC 3: US19 - US25, US29, US30)
// =========================================================
function AdminDashboard({ apiFetch, showMessage }) {
  const [counters, setCounters] = useState({
    totalLostItems: 0,
    totalFoundItems: 0,
    pendingClaims: 0,
    successfullyReturnedItems: 0
  });
  const [allItems, setAllItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditReport, setAuditReport] = useState(null);
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [handoverInputs, setHandoverInputs] = useState({});

  async function loadAdminData() {
    try {
      const [dashboardData, claimsData, usersData, auditData] = await Promise.all([
        apiFetch('/admin/dashboard'),
        apiFetch('/claims'),
        apiFetch('/admin/users'),
        apiFetch('/admin/audit-report')
      ]);
      setCounters(dashboardData.counters);
      setAllItems(dashboardData.items);
      setClaims(claimsData);
      setUsers(usersData);
      setAuditReport(auditData);
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  // US22: Verify & Publish or Reject Item Report
  async function handleReportApproval(itemId, approvalStatus) {
    try {
      await apiFetch(`/admin/items/${itemId}/approval`, {
        method: 'PUT',
        body: JSON.stringify({ approvalStatus })
      });
      showMessage('success', `Report marked as ${approvalStatus}.`);
      loadAdminData();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  // US25: Delete Old, Spam, or Resolved Item Report safely
  async function handleDeleteItem(itemId) {
    try {
      const res = await apiFetch(`/admin/items/${itemId}`, {
        method: 'DELETE'
      });
      showMessage('success', res.message);
      loadAdminData();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  // US21: Approve or Reject Incoming Claim
  async function handleClaimDecision(claimId, status) {
    try {
      const res = await apiFetch(`/claims/${claimId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      showMessage('success', res.message);
      loadAdminData();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  // US23: Record Physical Handover
  async function handleRecordHandover(e, claim) {
    e.preventDefault();
    const input = handoverInputs[claim._id] || {};
    const receiverName = input.receiverName ?? claim.claimantId?.name ?? '';
    const receiverRollNo = input.receiverRollNo ?? claim.claimantId?.rollNo ?? '';
    const handoverDate = input.handoverDate || new Date().toISOString().split('T')[0];

    try {
      const res = await apiFetch(`/claims/${claim._id}/handover`, {
        method: 'PUT',
        body: JSON.stringify({
          receiverName,
          receiverRollNo,
          handoverDate,
          itemStatus: 'Recovered'
        })
      });
      showMessage('success', res.message);
      loadAdminData();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  // US29: Toggle User Role between Student and Faculty
  async function handleRoleChange(targetUser) {
    const nextRole = targetUser.role === 'student' ? 'faculty' : 'student';
    try {
      const res = await apiFetch(`/admin/users/${targetUser._id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: nextRole })
      });
      showMessage('success', res.message);
      loadAdminData();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  // US30: Export Handover & Audit Summary as CSV
  function handleExportCsv() {
    const headers = [
      'Title',
      'Type',
      'Category',
      'Location',
      'Status',
      'ApprovalStatus',
      'ReporterName',
      'ReporterRollNo',
      'Date'
    ];
    const rows = allItems.map((i) => [
      `"${(i.title || '').replace(/"/g, '""')}"`,
      i.type,
      i.category,
      `"${(i.location || '').replace(/"/g, '""')}"`,
      i.status,
      i.approvalStatus,
      `"${(i.reportedBy?.name || '').replace(/"/g, '""')}"`,
      i.reportedBy?.rollNo || '',
      new Date(i.date).toISOString().split('T')[0]
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'JIIT-128-FindIt-Audit-Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessage('success', 'CSV Audit Report downloaded (US30).');
  }

  const filteredItems = allItems.filter((item) => {
    if (approvalFilter === 'all') return true;
    return item.approvalStatus === approvalFilter;
  });

  return (
    <div className="dashboard-space">
      <div className="page-header">
        <div>
          <h2>Admin / Security Desk Portal (JIIT-128)</h2>
          <p className="muted-text">
            Verify incoming reports, inspect ownership proofs, record physical handovers, manage
            campus user roles, and export audit reports.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleExportCsv}>
          Export Audit Report CSV (US30)
        </button>
      </div>

      {/* US24: Four Simple Admin Dashboard Counters */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Lost Items</span>
          <strong className="stat-value">{counters.totalLostItems}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Found Items</span>
          <strong className="stat-value">{counters.totalFoundItems}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending Claims</span>
          <strong className="stat-value">{counters.pendingClaims}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Successfully Returned Items</span>
          <strong className="stat-value">{counters.successfullyReturnedItems}</strong>
        </div>
      </div>

      {/* US30: Category-wise Audit Breakdown */}
      {auditReport && auditReport.categoryBreakdown && (
        <section className="card section-block">
          <h3>Campus Audit Breakdown by Category (US30)</h3>
          <div className="quick-locations">
            {Object.entries(auditReport.categoryBreakdown).map(([cat, count]) => (
              <span key={cat} className="chip chip-active">
                {cat}: {count}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* US20, US21, US23: Incoming Claims & Physical Handover Section */}
      <section className="card section-block">
        <h3>Incoming Claim Requests &amp; Handover Desk (US20, US21, US23)</h3>
        {claims.length === 0 ? (
          <p className="muted-text">No claim requests have been submitted yet.</p>
        ) : (
          <div className="claims-list">
            {claims.map((claim) => {
              const currentInput = handoverInputs[claim._id] || {
                receiverName: claim.claimantId?.name || '',
                receiverRollNo: claim.claimantId?.rollNo || '',
                handoverDate: new Date().toISOString().split('T')[0]
              };

              return (
                <div key={claim._id} className="claim-admin-item">
                  <div className="claim-admin-header">
                    <div>
                      <h4>
                        Item: {claim.itemId ? claim.itemId.title : 'Removed Item'}{' '}
                        {claim.itemId && (
                          <span className={`badge badge-status-${claim.itemId.status.toLowerCase()}`}>
                            {claim.itemId.status}
                          </span>
                        )}
                      </h4>
                      <p className="muted-small">
                        Claimant: <strong>{claim.claimantId?.name}</strong> (
                        {claim.claimantId?.rollNo} • {claim.claimantId?.email} •{' '}
                        {claim.claimantId?.role}) | Submitted:{' '}
                        {new Date(claim.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`badge badge-approval-${claim.status}`}>
                      Claim: {claim.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="proof-box">
                    <p><strong>Ownership Proof:</strong> {claim.ownershipProof}</p>
                    <p><strong>Identifying Marks:</strong> {claim.identifyingMarks}</p>
                  </div>

                  {/* US21: Approve or Reject Pending Claims */}
                  {claim.status === 'pending' && (
                    <div className="card-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleClaimDecision(claim._id, 'approved')}
                      >
                        Approve Claim (US21)
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleClaimDecision(claim._id, 'rejected')}
                      >
                        Reject Claim
                      </button>
                    </div>
                  )}

                  {/* US23: Physical Handover Form for Approved Claims */}
                  {claim.status === 'approved' && !claim.handoverDate && (
                    <form
                      className="handover-form"
                      onSubmit={(e) => handleRecordHandover(e, claim)}
                    >
                      <strong>Record Physical Handover (US23):</strong>
                      <div className="form-row">
                        <input
                          type="text"
                          required
                          placeholder="Receiver Name"
                          value={currentInput.receiverName}
                          onChange={(e) =>
                            setHandoverInputs({
                              ...handoverInputs,
                              [claim._id]: { ...currentInput, receiverName: e.target.value }
                            })
                          }
                        />
                        <input
                          type="text"
                          required
                          placeholder="Receiver Roll No / ID"
                          value={currentInput.receiverRollNo}
                          onChange={(e) =>
                            setHandoverInputs({
                              ...handoverInputs,
                              [claim._id]: { ...currentInput, receiverRollNo: e.target.value }
                            })
                          }
                        />
                        <input
                          type="date"
                          required
                          value={currentInput.handoverDate}
                          onChange={(e) =>
                            setHandoverInputs({
                              ...handoverInputs,
                              [claim._id]: { ...currentInput, handoverDate: e.target.value }
                            })
                          }
                        />
                        <button type="submit" className="btn btn-primary btn-sm">
                          Complete Handover
                        </button>
                      </div>
                    </form>
                  )}

                  {claim.handoverDate && (
                    <p className="handover-complete">
                      ✓ Handed over to <strong>{claim.receiverName}</strong> ({claim.receiverRollNo})
                      on {new Date(claim.handoverDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* US22 & US25: Verify, Publish, Reject, or Delete Reports */}
      <section className="card section-block">
        <div className="section-header-inline">
          <h3>Verify &amp; Manage Item Reports (US22 &amp; US25)</h3>
          <div className="filter-pills">
            {['all', 'pending', 'approved', 'rejected'].map((st) => (
              <button
                key={st}
                type="button"
                className={`btn btn-sm ${approvalFilter === st ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setApprovalFilter(st)}
              >
                {st.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <p className="muted-text">No item reports found for this filter.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title &amp; Type</th>
                  <th>Reporter</th>
                  <th>Location</th>
                  <th>Item Status</th>
                  <th>Approval Status</th>
                  <th>Actions (US22 / US25)</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <Link to={`/items/${item._id}`} className="item-link">
                        <strong>{item.title}</strong>
                      </Link>
                      <div className="muted-small">
                        {item.type.toUpperCase()} • {item.category}
                        {item.priority === 'urgent' ? ' • URGENT' : ''}
                      </div>
                    </td>
                    <td>
                      {item.reportedBy?.name || 'User'}
                      <div className="muted-small">{item.reportedBy?.rollNo}</div>
                    </td>
                    <td>{item.location}</td>
                    <td>
                      <span className={`badge badge-status-${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-approval-${item.approvalStatus}`}>
                        {item.approvalStatus}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        {item.approvalStatus !== 'approved' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleReportApproval(item._id, 'approved')}
                          >
                            Approve
                          </button>
                        )}
                        {item.approvalStatus !== 'rejected' && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleReportApproval(item._id, 'rejected')}
                          >
                            Reject
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteItem(item._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* US29: Campus User Directory & Role Management */}
      <section className="card section-block">
        <h3>Campus User Directory &amp; Role Management (US29)</h3>
        {users.length === 0 ? (
          <p className="muted-text">No registered users found.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Roll No / ID</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Action (US29)</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.rollNo}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge badge-type-found">{u.role.toUpperCase()}</span>
                    </td>
                    <td>
                      {u.role !== 'admin' ? (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => handleRoleChange(u)}
                        >
                          Switch to {u.role === 'student' ? 'Faculty' : 'Student'}
                        </button>
                      ) : (
                        <span className="muted-small">Protected Admin</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// =========================================================
// SCREEN 7: LOST AND FOUND FEED (US04, US05, US06)
// =========================================================
function FeedPage({ apiFetch, showMessage }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters (US05, US06)
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [category, setCategory] = useState('All');
  const [location, setLocation] = useState('');

  async function fetchFeed() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'All') params.append('status', status);
      if (category !== 'All') params.append('category', category);
      if (location.trim()) params.append('location', location.trim());
      if (search.trim()) params.append('search', search.trim());

      const data = await apiFetch(`/items?${params.toString()}`);
      setItems(data);
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFeed();
  }, [status, category, location]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    fetchFeed();
  }

  function handleResetFilters() {
    setSearch('');
    setStatus('All');
    setCategory('All');
    setLocation('');
  }

  return (
    <div className="dashboard-space">
      <div className="page-header">
        <div>
          <h2>JIIT-128 Lost &amp; Found Feed</h2>
          <p className="muted-text">
            Browse verified lost and found reports and campus announcements (US04, US05, US06).
          </p>
        </div>
        <Link to="/report" className="btn btn-primary">+ Report Lost / Found Item</Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="card filter-panel">
        <form onSubmit={handleSearchSubmit} className="search-row">
          <input
            type="text"
            placeholder="Search by keyword (e.g., Calculator, AirPods, Library, MP Hall, CL Lab)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Search (US06)</button>
          <button type="button" className="btn btn-outline" onClick={handleResetFilters}>
            Reset
          </button>
        </form>

        <div className="filter-controls">
          <div className="form-group">
            <label>Status (US05)</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Lost">Lost</option>
              <option value="Found">Found</option>
              <option value="Claimed">Claimed</option>
              <option value="Recovered">Recovered</option>
            </select>
          </div>

          <div className="form-group">
            <label>Category (US05)</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="All">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="ID Cards">ID Cards</option>
              <option value="Books/Notes">Books/Notes</option>
              <option value="Accessories">Accessories</option>
              <option value="Announcement">Announcement</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>JIIT-128 Location</label>
            <select value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="">All JIIT-128 Locations</option>
              {CAMPUS_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Campus Location Pills (US06) */}
        <div className="quick-locations">
          <span className="muted-small">Quick Location Filter:</span>
          {CAMPUS_LOCATIONS.slice(0, 6).map((loc) => (
            <button
              key={loc}
              type="button"
              className={`chip ${location === loc ? 'chip-active' : ''}`}
              onClick={() => setLocation(location === loc ? '' : loc)}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Feed Cards Grid */}
      {loading ? (
        <p className="muted-text">Loading approved campus items...</p>
      ) : items.length === 0 ? (
        <div className="card empty-state">
          <h3>No matching items found</h3>
          <p className="muted-text">
            Try clearing your search filters or report a new lost or found item.
          </p>
        </div>
      ) : (
        <div className="cards-grid">
          {items.map((item) => (
            <div key={item._id} className="card item-card">
              <div className="card-top">
                <span className={`badge badge-type-${item.type}`}>
                  {item.type.toUpperCase()}
                </span>
                <span className={`badge badge-status-${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
                {item.priority === 'urgent' && (
                  <span className="badge badge-urgent">URGENT</span>
                )}
              </div>

              <h4>{item.title}</h4>
              <p className="item-desc">{item.description}</p>

              <div className="card-meta">
                <span><strong>Category:</strong> {item.category}</span>
                <span><strong>Location:</strong> {item.location}</span>
                <span><strong>Date:</strong> {new Date(item.date).toLocaleDateString()}</span>
                {item.type === 'found' && item.dropOffPoint && (
                  <span><strong>Drop-off:</strong> {item.dropOffPoint}</span>
                )}
              </div>

              <div className="card-actions">
                <Link to={`/items/${item._id}`} className="btn btn-outline btn-sm">
                  {item.type === 'found' && item.status === 'Found'
                    ? 'View & Claim Item'
                    : 'View Details & Matches'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================
// SCREEN 8: REPORT ITEM FORM (US02, US03, US12)
// =========================================================
function ReportItemPage({ apiFetch, user, showMessage }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    type: 'lost',
    title: '',
    category: 'Electronics',
    location: 'Library (LRC-128)',
    date: new Date().toISOString().split('T')[0],
    description: '',
    contactInfo: user?.email || '',
    dropOffPoint: 'Gate 1 Security Desk',
    priority: 'normal'
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch('/items', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      showMessage('success', res.message);
      navigate('/my-activity');
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card form-card">
      <h2>Report a Lost or Found Item (JIIT-128)</h2>
      <p className="muted-text">
        Submit accurate details so the JIIT-128 Security Desk can verify and publish your report.
      </p>

      {/* Toggle Lost (US02) vs Found (US03) */}
      <div className="type-toggle">
        <button
          type="button"
          className={`btn ${formData.type === 'lost' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFormData({ ...formData, type: 'lost' })}
        >
          I Lost an Item (US02)
        </button>
        <button
          type="button"
          className={`btn ${formData.type === 'found' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFormData({ ...formData, type: 'found' })}
        >
          I Found an Item (US03)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form-stack">
        <div className="form-row">
          <div className="form-group">
            <label>Item Title *</label>
            <input
              type="text"
              required
              placeholder={
                formData.type === 'lost'
                  ? 'e.g., Blue Casio fx-991EX Calculator'
                  : 'e.g., Black Leather Wallet found near MP Hall'
              }
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {ITEM_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{formData.type === 'lost' ? 'Location Lost *' : 'Location Found *'}</label>
            <input
              type="text"
              required
              list="campus-locations-list"
              placeholder="e.g., Library (LRC-128), MP Hall, Cafeteria / Tuck Shop"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
            <datalist id="campus-locations-list">
              {CAMPUS_LOCATIONS.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label>{formData.type === 'lost' ? 'Date Lost *' : 'Date Found *'}</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
        </div>

        {formData.type === 'lost' ? (
          <div className="form-group">
            <label>Contact Information (Phone / Email) *</label>
            <input
              type="text"
              required
              placeholder="e.g., 9876543210 or student@mail.jiit.ac.in"
              value={formData.contactInfo}
              onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
            />
          </div>
        ) : (
          <div className="form-group">
            <label>Drop-off Point *</label>
            <input
              type="text"
              required
              placeholder="e.g., Gate 1 Security Desk / Academic Block Reception"
              value={formData.dropOffPoint}
              onChange={(e) => setFormData({ ...formData, dropOffPoint: e.target.value })}
            />
          </div>
        )}

        {(user.role === 'faculty' || user.role === 'admin') && (
          <div className="form-group">
            <label>Priority Level (Faculty / Admin Only - US14)</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="normal">Normal</option>
              <option value="urgent">Urgent (Hall Ticket, Wallet, Lab Equipment, ID)</option>
            </select>
          </div>
        )}

        <div className="form-group">
          <label>Detailed Description *</label>
          <textarea
            rows={4}
            required
            placeholder="Include brand, colour, cover details, or circumstances..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Submitting Report...' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}

// =========================================================
// SCREEN 9: ITEM DETAILS, EDIT REPORT, MATCHES & CLAIM FORM (US07, US10, US14, US17, US26, US27)
// =========================================================
function ItemDetailsPage({ apiFetch, user, showMessage }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [ownershipProof, setOwnershipProof] = useState('');
  const [identifyingMarks, setIdentifyingMarks] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  async function loadItemAndMatches() {
    setLoading(true);
    try {
      const [itemData, matchesData] = await Promise.all([
        apiFetch(`/items/${id}`),
        apiFetch(`/items/${id}/matches`)
      ]);
      setItem(itemData);
      setMatches(matchesData);
      setEditData({
        title: itemData.title || '',
        category: itemData.category || 'Other',
        location: itemData.location || '',
        description: itemData.description || '',
        contactInfo: itemData.contactInfo || '',
        dropOffPoint: itemData.dropOffPoint || ''
      });
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItemAndMatches();
  }, [id]);

  // US26: Save Edited Item Details
  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      const res = await apiFetch(`/items/${item._id}`, {
        method: 'PUT',
        body: JSON.stringify(editData)
      });
      showMessage('success', 'Item details updated successfully (US26).');
      setItem(res.item);
      setIsEditing(false);
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  // US07 & US17: Submit a Claim Request
  async function handleClaimSubmit(e) {
    e.preventDefault();
    setSubmittingClaim(true);
    try {
      const res = await apiFetch('/claims', {
        method: 'POST',
        body: JSON.stringify({
          itemId: item._id,
          ownershipProof,
          identifyingMarks
        })
      });
      showMessage('success', res.message);
      setOwnershipProof('');
      setIdentifyingMarks('');
      navigate('/my-activity');
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setSubmittingClaim(false);
    }
  }

  // US10: Student marks own item as Recovered or Closed
  async function handleStatusUpdate(newStatus) {
    try {
      const res = await apiFetch(`/items/${item._id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      showMessage('success', res.message);
      setItem(res.item);
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  // US14: Faculty / Admin flags item as Urgent
  async function handlePriorityToggle() {
    const nextPriority = item.priority === 'urgent' ? 'normal' : 'urgent';
    try {
      const res = await apiFetch(`/items/${item._id}`, {
        method: 'PUT',
        body: JSON.stringify({ priority: nextPriority })
      });
      showMessage('success', res.message);
      setItem(res.item);
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  if (loading) return <p className="muted-text">Loading item details...</p>;
  if (!item) return <p className="muted-text">Item report not found.</p>;

  const isOwner = user && item.reportedBy && item.reportedBy._id === user.id;
  const canFlagUrgent = user && (user.role === 'faculty' || user.role === 'admin');

  return (
    <div className="details-layout">
      <div className="card">
        <div className="card-top">
          <span className={`badge badge-type-${item.type}`}>{item.type.toUpperCase()}</span>
          <span className={`badge badge-status-${item.status.toLowerCase()}`}>{item.status}</span>
          <span className={`badge badge-approval-${item.approvalStatus}`}>
            Approval: {item.approvalStatus}
          </span>
          {item.priority === 'urgent' && <span className="badge badge-urgent">URGENT</span>}
        </div>

        {!isEditing ? (
          <>
            <h2>{item.title}</h2>
            <p className="details-description">{item.description}</p>

            <div className="details-grid">
              <div>
                <strong>Category:</strong> {item.category}
              </div>
              <div>
                <strong>Location:</strong> {item.location}
              </div>
              <div>
                <strong>Date:</strong> {new Date(item.date).toLocaleDateString()}
              </div>
              <div>
                <strong>Reported By:</strong> {item.reportedBy?.name || 'Campus User'} (
                {item.reportedBy?.rollNo || 'N/A'})
              </div>
              {item.type === 'lost' && item.contactInfo && (
                <div>
                  <strong>Contact Info:</strong> {item.contactInfo}
                </div>
              )}
              {item.type === 'found' && item.dropOffPoint && (
                <div>
                  <strong>Drop-off Point:</strong> {item.dropOffPoint}
                </div>
              )}
            </div>
          </>
        ) : (
          /* US26: Inline Edit Own Item Form */
          <form onSubmit={handleSaveEdit} className="form-stack">
            <h3>Edit Report Details (US26)</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  required
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <select
                  value={editData.category}
                  onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                >
                  {ITEM_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Location *</label>
              <input
                type="text"
                required
                list="edit-locations-list"
                value={editData.location}
                onChange={(e) => setEditData({ ...editData, location: e.target.value })}
              />
              <datalist id="edit-locations-list">
                {CAMPUS_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>
            {item.type === 'lost' ? (
              <div className="form-group">
                <label>Contact Info *</label>
                <input
                  type="text"
                  required
                  value={editData.contactInfo}
                  onChange={(e) => setEditData({ ...editData, contactInfo: e.target.value })}
                />
              </div>
            ) : (
              <div className="form-group">
                <label>Drop-off Point *</label>
                <input
                  type="text"
                  required
                  value={editData.dropOffPoint}
                  onChange={(e) => setEditData({ ...editData, dropOffPoint: e.target.value })}
                />
              </div>
            )}
            <div className="form-group">
              <label>Description *</label>
              <textarea
                rows={3}
                required
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              />
            </div>
            <div className="card-actions">
              <button type="submit" className="btn btn-primary btn-sm">Save Changes</button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Owner Controls (US10, US26) & Faculty Priority Controls (US14) */}
        <div className="card-actions">
          {isOwner && !isEditing && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setIsEditing(true)}
            >
              Edit Report Details (US26)
            </button>
          )}

          {isOwner && item.status !== 'Recovered' && item.status !== 'Closed' && (
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleStatusUpdate('Recovered')}
              >
                Mark as Recovered (US10)
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => handleStatusUpdate('Closed')}
              >
                Close Report (US10)
              </button>
            </>
          )}

          {canFlagUrgent && item.type !== 'notice' && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handlePriorityToggle}
            >
              {item.priority === 'urgent' ? 'Set Normal Priority' : 'Flag as Urgent (US14)'}
            </button>
          )}

          <Link to="/feed" className="btn btn-outline btn-sm">← Back to Feed</Link>
        </div>
      </div>

      {/* US27: Potential Lost-and-Found Match Suggestions */}
      {item.type !== 'notice' && (
        <div className="card">
          <h3>Potential Matching Campus Reports (US27)</h3>
          <p className="muted-text">
            Automatically matched active {item.type === 'lost' ? 'Found' : 'Lost'} items in the{' '}
            <strong>{item.category}</strong> category:
          </p>
          {matches.length === 0 ? (
            <p className="muted-text" style={{ marginTop: '0.5rem' }}>
              No active matching {item.type === 'lost' ? 'found' : 'lost'} reports in this category
              right now.
            </p>
          ) : (
            <div className="cards-grid" style={{ marginTop: '0.75rem' }}>
              {matches.map((m) => (
                <div key={m._id} className="card item-card">
                  <div className="card-top">
                    <span className={`badge badge-type-${m.type}`}>{m.type.toUpperCase()}</span>
                    <span className={`badge badge-status-${m.status.toLowerCase()}`}>
                      {m.status}
                    </span>
                  </div>
                  <h4>{m.title}</h4>
                  <p className="muted-small">
                    Location: {m.location} • Date: {new Date(m.date).toLocaleDateString()}
                  </p>
                  <Link to={`/items/${m._id}`} className="btn btn-outline btn-sm">
                    Inspect Match →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Claim Submission Form for Found Items (US07 & US17) */}
      {item.type === 'found' && (
        <div className="card">
          <h3>
            {user?.role === 'faculty'
              ? 'Submit Departmental / Faculty Claim (US17)'
              : 'Submit a Claim Request (US07)'}
          </h3>

          {!user ? (
            <p className="muted-text">
              Please <Link to="/login">log in</Link> to submit a claim for this found item.
            </p>
          ) : item.status !== 'Found' ? (
            <p className="muted-text">
              This item is currently marked as <strong>{item.status}</strong> and is no longer open
              for new claims.
            </p>
          ) : (
            <form onSubmit={handleClaimSubmit} className="form-stack">
              <div className="form-group">
                <label>Claimant Details</label>
                <input
                  type="text"
                  disabled
                  value={`${user.name} (${user.rollNo} • ${user.email})`}
                />
              </div>

              <div className="form-group">
                <label>Ownership Proof *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide invoice/bill details, serial number, ID number, or departmental inventory code..."
                  value={ownershipProof}
                  onChange={(e) => setOwnershipProof(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Identifying Marks or Specific Contents *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe stickers, scratches, keychain, lock-screen wallpaper, or contents inside..."
                  value={identifyingMarks}
                  onChange={(e) => setIdentifyingMarks(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={submittingClaim}>
                {submittingClaim ? 'Submitting Claim...' : 'Submit Ownership Claim'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================
// SCREEN 10: MY REPORTS AND MY CLAIMS (US08, US09, US10, US26)
// =========================================================
function MyActivityPage({ apiFetch, showMessage }) {
  const [myReports, setMyReports] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadMyActivity() {
    setLoading(true);
    try {
      const [reportsData, claimsData] = await Promise.all([
        apiFetch('/items/my-reports'),
        apiFetch('/claims/my-claims')
      ]);
      setMyReports(reportsData);
      setMyClaims(claimsData);
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMyActivity();
  }, []);

  // US10: Recover or Close Own Item
  async function handleUpdateStatus(itemId, status) {
    try {
      const res = await apiFetch(`/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      showMessage('success', res.message);
      loadMyActivity();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  // Delete Own Item Report
  async function handleDeleteReport(itemId) {
    try {
      const res = await apiFetch(`/items/${itemId}`, {
        method: 'DELETE'
      });
      showMessage('success', res.message);
      loadMyActivity();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  // US26: Withdraw Pending Claim Request
  async function handleWithdrawClaim(claimId) {
    try {
      const res = await apiFetch(`/claims/${claimId}`, {
        method: 'DELETE'
      });
      showMessage('success', res.message);
      loadMyActivity();
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  return (
    <div className="dashboard-space">
      <div className="page-header">
        <div>
          <h2>My Reported Items &amp; Claim Requests</h2>
          <p className="muted-text">
            Track your reports, edit details, mark items recovered, or withdraw pending claims
            (US08, US09, US10, US26).
          </p>
        </div>
        <Link to="/report" className="btn btn-primary">+ Report New Item</Link>
      </div>

      {/* Section 1: My Reported Items (US08, US10, US26) */}
      <section className="card section-block">
        <h3>My Reported Items (US08, US10, US26)</h3>
        {loading ? (
          <p className="muted-text">Loading your reports...</p>
        ) : myReports.length === 0 ? (
          <p className="muted-text">You have not submitted any item reports yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Admin Approval</th>
                  <th>Item Status</th>
                  <th>Actions (US10 / US26)</th>
                </tr>
              </thead>
              <tbody>
                {myReports.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <Link to={`/items/${item._id}`} className="item-link">
                        <strong>{item.title}</strong>
                      </Link>
                    </td>
                    <td>{item.type.toUpperCase()}</td>
                    <td>{item.location}</td>
                    <td>{new Date(item.date).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge badge-approval-${item.approvalStatus}`}>
                        {item.approvalStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-status-${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/items/${item._id}`} className="btn btn-outline btn-sm">
                          View / Edit (US26)
                        </Link>
                        {item.status !== 'Recovered' && item.status !== 'Closed' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleUpdateStatus(item._id, 'Recovered')}
                            >
                              Mark Recovered
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => handleUpdateStatus(item._id, 'Closed')}
                            >
                              Close
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteReport(item._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 2: My Claim Requests (US09 & US26) */}
      <section className="card section-block">
        <h3>My Claim Requests (US09 &amp; US26)</h3>
        {loading ? (
          <p className="muted-text">Loading your claims...</p>
        ) : myClaims.length === 0 ? (
          <p className="muted-text">You have not submitted any claims for found items yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Claimed Item</th>
                  <th>Drop-off Location</th>
                  <th>Submitted On</th>
                  <th>Claim Status</th>
                  <th>Handover / Action (US26)</th>
                </tr>
              </thead>
              <tbody>
                {myClaims.map((claim) => (
                  <tr key={claim._id}>
                    <td>
                      {claim.itemId ? (
                        <Link to={`/items/${claim.itemId._id}`} className="item-link">
                          <strong>{claim.itemId.title}</strong>
                        </Link>
                      ) : (
                        'Item Removed'
                      )}
                    </td>
                    <td>{claim.itemId?.dropOffPoint || 'Gate 1 Security Desk'}</td>
                    <td>{new Date(claim.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge badge-approval-${claim.status}`}>
                        {claim.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {claim.handoverDate ? (
                        <span className="handover-complete">
                          Collected on {new Date(claim.handoverDate).toLocaleDateString()}
                        </span>
                      ) : claim.status === 'approved' ? (
                        <span>Approved — Visit Drop-off Point with College ID</span>
                      ) : claim.status === 'rejected' ? (
                        <span className="muted-small">Claim Rejected</span>
                      ) : (
                        <div className="table-actions">
                          <span className="muted-small">Awaiting Admin Verification</span>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleWithdrawClaim(claim._id)}
                          >
                            Withdraw Claim (US26)
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
