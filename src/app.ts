import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { BotController } from './modules/bot/bot.controller';
import { BalanceController } from './modules/balance/balance.controller';
import { OrderController } from './modules/orders/order.controller';
import { AuthController } from './modules/auth/auth.controller';
import { RealtimeBroadcaster } from './modules/realtime/eventStream';

export function createApp(): Application {
  const app: Application = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const publicDir = fs.existsSync(path.join(__dirname, 'public'))
    ? path.join(__dirname, 'public')
    : path.join(process.cwd(), 'src/public');

  app.use(express.static(publicDir));

  // Healthcheck
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'aoem-bitcash-bot',
      timestamp: new Date().toISOString(),
    });
  });

  const botController = new BotController();
  const balanceController = new BalanceController();
  const orderController = new OrderController();
  const authController = new AuthController();

  const router = express.Router();

  // Authentication (Midasbuy, Bitcash, Operator)
  router.get('/auth/midasbuy/status', authController.getMidasbuyStatus);
  router.post('/auth/midasbuy/login', authController.loginMidasbuy);
  router.post('/auth/midasbuy/logout', authController.logoutMidasbuy);
  router.get('/auth/bitcash/status', authController.getBitcashStatus);
  router.post('/auth/bitcash/login', authController.loginBitcash);
  router.get('/auth/operator/status', authController.getOperatorStatus);
  router.post('/auth/operator/login', authController.loginOperator);

  // Top-Up Bot execution
  router.post('/topup/execute', botController.execute);
  router.get('/topup/jobs', botController.getJobs);
  router.get('/topup/jobs/:id', botController.getJobById);
  router.post('/topup/otp', botController.submitOtp);

  // Bitcash Balance & Ledger
  router.get('/bitcash/balance', balanceController.getBalance);
  router.post('/bitcash/balance/sync', balanceController.syncBalance);
  router.get('/bitcash/ledger', balanceController.getLedger);

  // Orders
  router.get('/orders', orderController.getOrders);
  router.get('/orders/:id', orderController.getOrderById);

  // Real-time SSE Stream
  router.get('/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    RealtimeBroadcaster.getInstance().addClient(res);
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`);
  });

  app.use('/api', router);

  // Fallback to Dashboard
  app.get('*', (req: Request, res: Response, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: any) => {
    const status = err.statusCode || 400;
    res.status(status).json({
      success: false,
      error: err.message || 'An error occurred during request processing',
    });
  });

  return app;
}
