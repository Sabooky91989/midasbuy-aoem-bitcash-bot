import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('AOEM Bitcash Bot & Balance Monitoring Tests', () => {
  describe('Healthcheck & Service Status', () => {
    it('should return UP on /health', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.service).toBe('aoem-bitcash-bot');
    });
  });

  describe('Authentication & Account Sessions (Midasbuy, Bitcash, Operator)', () => {
    it('should return current Midasbuy session status', async () => {
      const res = await request(app).get('/api/auth/midasbuy/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('isLoggedIn');
    });

    it('should authenticate Midasbuy account with test credentials (Botfordevinblack@hotmail.com)', async () => {
      const res = await request(app)
        .post('/api/auth/midasbuy/login')
        .send({
          email: 'Botfordevinblack@hotmail.com',
          password: 'testdev123',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('Botfordevinblack@hotmail.com');
      expect(res.body.data.isLoggedIn).toBe(true);
    });

    it('should reject invalid Midasbuy credentials', async () => {
      const res = await request(app)
        .post('/api/auth/midasbuy/login')
        .send({
          email: 'wrong@hotmail.com',
          password: 'wrongpassword',
        });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should authenticate Bitcash account with Inblackm7 / kanomtandede@7', async () => {
      const res = await request(app)
        .post('/api/auth/bitcash/login')
        .send({
          id: 'Inblackm7',
          password: 'kanomtandede@7',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('Inblackm7');
    });

    it('should authenticate Operator admin', async () => {
      const res = await request(app)
        .post('/api/auth/operator/login')
        .send({
          username: 'admin',
          password: 'testdev123',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('ADMIN');
    });
  });

  describe('Bitcash Balance Monitoring & Ledger', () => {
    it('should return current MyBitCash balance', async () => {
      const res = await request(app).get('/api/bitcash/balance');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('currentBalance');
      expect(res.body.data.currentBalance).toBeGreaterThan(0);
    });

    it('should sync balance against Bitcash portal', async () => {
      const res = await request(app).post('/api/bitcash/balance/sync');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SYNCHRONIZED');
    });

    it('should fetch balance transaction ledger', async () => {
      const res = await request(app).get('/api/bitcash/ledger');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Orders & History Management', () => {
    it('should list all top-up orders', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should fetch specific order by ID with slip data', async () => {
      const res = await request(app).get('/api/orders/ORD-AOEM-1092');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoiceNo).toBe('INV20261004153947');
      expect(res.body.data.slip).toHaveProperty('remainingBalanceCredits');
    });
  });

  describe('Bot Automation Engine Execution', () => {
    it('should reject invalid OTP format', async () => {
      const res = await request(app)
        .post('/api/topup/otp')
        .send({ jobId: 'job-dummy', otp: 'abc' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject OTP submission when job is not waiting for OTP', async () => {
      const res = await request(app)
        .post('/api/topup/otp')
        .send({ jobId: 'non-existent-job', otp: '151550' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should start automated top-up job with default parameters', async () => {
      const res = await request(app)
        .post('/api/topup/execute')
        .send({
          uid: '5250140737488366145',
          server: 'Empire#239',
          pack: '99+109 Coin',
          priceJpy: 146,
          autoOtp: true,
        });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('jobId');
      expect(res.body.data.totalSteps).toBe(7);
    });

    it('should list active and past bot jobs', async () => {
      const res = await request(app).get('/api/topup/jobs');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
