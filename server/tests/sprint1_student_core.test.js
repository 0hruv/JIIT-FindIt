const request = require('supertest');
const { app } = require('../server');
require('./setup');

describe('Sprint 1: Student Core Portal (US01 - US08)', () => {
  let studentToken = '';

  test('US01: Should register a new student account successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Dhruv Gupta',
        rollNo: '992401030221',
        email: 'dhruv1328gupta@gmail.com',
        password: 'password123',
        role: 'student'
      });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.rollNo).toBe('992401030221');
  });

  test('US01 [Negative]: Should reject registration with duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Dhruv Clone',
        rollNo: '992401039999',
        email: 'dhruv1328gupta@gmail.com',
        password: 'password123'
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('US02: Should log in existing student and issue JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dhruv1328gupta@gmail.com',
        password: 'password123'
      });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    studentToken = res.body.token;
  });

  test('US03 & US04: Should allow authenticated student to report a lost item', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Blue Noise Headphones',
        category: 'Electronics',
        description: 'Lost near LRC-128 library reading hall table 4',
        type: 'lost',
        location: 'Library (LRC-128)',
        contactInfo: 'dhruv1328gupta@gmail.com'
      });
    expect(res.status).toBe(201);
    expect(res.body.item.title).toBe('Blue Noise Headphones');
    expect(res.body.item.approvalStatus).toBe('pending');
  });

  test('US05, US06, US07: Should query health endpoint with active service status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
