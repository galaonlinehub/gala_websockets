import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.NODE_ENV}`});

dotenv.config({ path: '.env' });


export const envConfig = {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  baseUrl: process.env.BASE_URL,
  apiBaseUrl: process.env.API_BASE_URL ,
  jwtPublicKey: process.env.PASSPORT_PUBLIC_KEY,
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
  serveStatic: process.env.SERVE_STATIC === 'true',
  ssl: {
    enabled: process.env.SSL_ENABLED === 'true',
    keyPath: process.env.SSL_KEY_PATH || './server/ssl/key.pem',
    certPath: process.env.SSL_CERT_PATH || './server/ssl/cert.pem',
  },
};