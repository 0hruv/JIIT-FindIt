const request = require('supertest');
const { app, Item, User } = require('../server');
require('./setup');

describe('Sprint 2: Claims, Auto-Matching & Faculty Logs (US09, US10, US26, US27, US11 - US14)', () => {
  let studentToken = '';
  let facultyToken = '';
  let foundItemId = '';

  beforeAll(async () => {
    // Register/login student
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Vidit Goel',
        rollNo: '992401040068',
        email: 'viditgoyal041@gmail.com',
        password: 'password123',
        role: 'student'
      });
    studentToken = regRes.body.token;
    const studentUser = await User.findOne({ email: 'viditgoyal041@gmail.com' });

    // Login default faculty
    const facRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'faculty@jiit.ac.in',
        password: 'faculty123'
      });
    facultyToken = facRes.body.token;

    // Seed approved found item
    const item = await Item.create({
      title: 'Titan Fastrack Watch',
      category: 'Accessories',
      description: 'Black strap watch found in CL-3',
      type: 'found',
      status: 'Found',
      location: 'Computer Labs (CL)',
      dropOffPoint: 'Gate 1 Security Desk',
      reportedBy: studentUser._id,
      reporterName: 'Vidit Goel',
      reporterEmail: 'viditgoyal041@gmail.com',
      approvalStatus: 'approved'
    });
    foundItemId = item._id.toString();
  });

  test('US09: Student can submit an ownership claim with proof', async () => {
    const res = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        itemId: foundItemId,
        ownershipProof: 'Purchase receipt dated Aug 2026 on Amazon',
        identifyingMarks: 'Small scratch on upper right bezel dial'
      });
    expect(res.status).toBe(201);
    expect(res.body.claim.status).toBe('pending');
  });

  test('US27: Automatic category match suggestions returns related items', async () => {
    const res = await request(app).get(`/api/items/${foundItemId}/matches`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('US11 & US12: Faculty can log urgent classroom found item', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        title: 'Dell Laptop Charger 65W',
        category: 'Electronics',
        description: 'Left on podium table in Room 214',
        type: 'found',
        location: 'Academic Block - 2nd Floor',
        dropOffPoint: 'Gate 1 Security Desk',
        contactInfo: 'faculty@jiit.ac.in',
        priority: 'urgent'
      });
    expect(res.status).toBe(201);
    expect(res.body.item.priority).toBe('urgent');
  });
});
