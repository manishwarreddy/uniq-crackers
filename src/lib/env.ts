import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_NAME: z.string().default('N Crackers'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16).default('development-jwt-secret-for-phase-0-build'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  NEXT_PUBLIC_STORE_LAT: z.coerce.number().default(17.502900),
  NEXT_PUBLIC_STORE_LNG: z.coerce.number().default(78.257300),
  NEXT_PUBLIC_DEFAULT_DELIVERY_RADIUS_KM: z.coerce.number().default(7.0),
  NEXT_PUBLIC_STORE_ADDRESS: z.string().default('F6GQ+7PW, Velmala, Hyderabad, Telangana 502300'),
  NEXT_PUBLIC_STORE_PHONE: z.string().default('+919000000000'),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  NEXT_PUBLIC_STORE_LAT: process.env.NEXT_PUBLIC_STORE_LAT,
  NEXT_PUBLIC_STORE_LNG: process.env.NEXT_PUBLIC_STORE_LNG,
  NEXT_PUBLIC_DEFAULT_DELIVERY_RADIUS_KM: process.env.NEXT_PUBLIC_DEFAULT_DELIVERY_RADIUS_KM,
  NEXT_PUBLIC_STORE_ADDRESS: process.env.NEXT_PUBLIC_STORE_ADDRESS,
  NEXT_PUBLIC_STORE_PHONE: process.env.NEXT_PUBLIC_STORE_PHONE,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
});
