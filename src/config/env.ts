import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 7000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MIDASBUY_URL: process.env.MIDASBUY_URL || 'https://www.midasbuy.com/midasbuy/jp/buy/aoem',
  MIDASBUY_ID: process.env.MIDASBUY_ID || 'Botfordevinblack@hotmail.com',
  MIDASBUY_PASSWORD: process.env.MIDASBUY_PASSWORD || 'testdev123',
  BITCASH_ID: process.env.BITCASH_ID || 'Inblackm7',
  BITCASH_PASSWORD: process.env.BITCASH_PASSWORD || 'kanomtandede@7',
  HOTMAIL_OTP_EMAIL: process.env.HOTMAIL_OTP_EMAIL || 'Inblackbitcash7g@hotmail.com',
  HOTMAIL_OTP_PASSWORD: process.env.HOTMAIL_OTP_PASSWORD || 'Tishaluna123',
  DEFAULT_UID: process.env.DEFAULT_UID || '5250140737488366145',
  DEFAULT_SERVER: process.env.DEFAULT_SERVER || 'Empire#239',
  DEFAULT_PACK: process.env.DEFAULT_PACK || '99+109 Coin',
  DEFAULT_PRICE_JPY: process.env.DEFAULT_PRICE_JPY ? parseInt(process.env.DEFAULT_PRICE_JPY, 10) : 146,
};
