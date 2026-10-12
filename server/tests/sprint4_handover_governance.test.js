const request = require('supertest');
const { app, Item, Claim, User } = require('../server');
require('./setup');

describe('Sprint 4: Handover, Metrics & Audit Governance (US23 - US25, US29, US30)', () => {
  let adminToken = '';
  let claimId = '';

  beforeAll(async () => {
    // Login admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@jiit.ac.in', password: 'admin123' });
    adminToken = adminRes.body.token;
    const adminUser = await User.findOne({ email: 'admin@jiit.ac.in' });

    // Register a student claimant
    const student = await User.create({
      name: 'Shaurya Gupta',
      rollNo: '992401040037',
      email: 'shauryagupta2006@gmail.com',
      password: 'password123',
      role: 'student'
    });

    // Create item & claim
    const item = await Item.create({
      title: 'HP Wireless Mouse',
      category: 'Electronics',
      description: 'Found in Lab 1',
      type: 'found',
      status: 'Found',
      location: 'Computer Labs (CL)',
      dropOffPoint: 'Gate 1 Security Desk',
      reportedBy: adminUser._id,
      reporterName: 'Admin Desk',
      reporterEmail: 'admin@jiit.ac.in',
      approvalStatus: 'approved'
    });

    const claim = await Claim.create({
      itemId: item._id,
      claimantId: student._id,
      ownershipProof: 'Amazon invoice order #402-99120',
      identifyingMarks: 'Serial number on bottom is HP-8821.',
      status: 'pending'
    });
    claimId = claim._id.toString();
  });

  test('US23: Admin can approve verified claim', async () => {
    const res = await request(app)
      .put(`/api/claims/${claimId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.claim.status).toBe('approved');
  });

  test('US24: Admin can record physical handover upon ID check', async () => {
    const res = await request(app)
      .put(`/api/claims/${claimId}/handover`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        receiverName: 'Shaurya Gupta',
        receiverRollNo: '992401040037'
      });
    expect(res.status).toBe(200);
    expect(res.body.claim.handoverDate).toBeDefined();
    expect(res.body.claim.receiverName).toBe('Shaurya Gupta');
  });

  test('US25: Admin dashboard metrics returns accurate counters', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.counters).toBeDefined();
    expect(typeof res.body.counters.totalFoundItems).toBe('number');
  });

  test('US30: Generates category audit summary with total reports and breakdown', async () => {
    const res = await request(app)
      .get('/api/admin/audit-report')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalReports).toBeDefined();
    expect(res.body.categoryBreakdown).toBeDefined();
  });
});
