const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { seedInitialAccounts } = require('../server');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'campus_lost_found_test' } });
  const uri = mongod.getUri();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);
  await seedInitialAccounts();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});
