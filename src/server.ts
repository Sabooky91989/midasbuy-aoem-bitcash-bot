import { createApp } from './app';
import { ENV } from './config/env';
import { logger } from './utils/logger';

async function bootstrap() {
  const app = createApp();

  const server = app.listen(ENV.PORT, () => {
    logger.info(`AOEM Bitcash Bot service running on http://localhost:${ENV.PORT}`);
    logger.info(`Environment: ${ENV.NODE_ENV}`);
    logger.info(`Target Game: Age of Empires Mobile (Midasbuy Japan)`);
    logger.info(`Midasbuy Account: ${ENV.MIDASBUY_ID}`);
    logger.info(`Bitcash ID: ${ENV.BITCASH_ID}`);
    logger.info(`Hotmail OTP: ${ENV.HOTMAIL_OTP_EMAIL}`);
  });

  const shutdown = () => {
    logger.info('Shutting down AOEM Bitcash Bot gracefully...');
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch(err => {
  logger.error('Fatal bootstrap error', { error: err.message, stack: err.stack });
  process.exit(1);
});
