const request = require('supertest');
const { app, Item, User } = require('../server');
require('./setup');

describe('Sprint 3: Notices & Admin Verification (US15 - US18, US28, US19 - US22)', () => {
  let facultyToken = '';
  let adminToken = '';
  let noticeId = '';
  let pendingItemId = '';

  beforeAll(async () => {
    // Login faculty
    const facRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'faculty@jiit.ac.in', password: 'faculty123' });
    facultyToken = facRes.body.token;

    // Login admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@jiit.ac.in', password: 'admin123' });
    adminToken = adminRes.body.token;
    const adminUser = await User.findOne({ email: 'admin@jiit.ac.in' });

    // Create a pending item
    const pending = await Item.create({
      title: 'Graph Theory Notebook',
      category: 'Books/Notes',
      description: 'Spiral notebook with green cover',
      type: 'found',
      location: 'Mughal Garden / Central Lawn',
      dropOffPoint: 'Gate 1 Security Desk',
      reportedBy: adminUser._id,
      reporterName: 'Shaurya Gupta',
      reporterEmail: 'shauryagupta2006@gmail.com',
      approvalStatus: 'pending'
    });
    pendingItemId = pending._id.toString();
  });

  test('US15: Faculty can post campus notice announcement', async () => {
    const res = await request(app)
      .post('/api/faculty/notices')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        title: 'LRC-128 Weekend Lost Property Clearance',
        description: 'All unclaimed belongings from exam week will be moved to Security Desk.'
      });
    expect(res.status).toBe(201);
    expect(res.body.notice.type).toBe('notice');
    noticeId = res.body.notice._id;
  });

  test('US28: Faculty can edit published announcement', async () => {
    const res = await request(app)
      .put(`/api/faculty/notices/${noticeId}`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        title: 'LRC-128 Weekend Lost Property Clearance [UPDATED DATE]',
        description: 'Clearance extended till Friday 5 PM.'
      });
    expect(res.status).toBe(200);
    expect(res.body.notice.title).toMatch(/UPDATED DATE/i);
  });

  test('US19 & US22: Admin can verify and approve pending item report', async () => {
    const res = await request(app)
      .put(`/api/admin/items/${pendingItemId}/approval`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approvalStatus: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.item.approvalStatus).toBe('approved');
  });
});
