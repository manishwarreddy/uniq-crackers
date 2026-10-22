/**
 * SMS Gateway Service for Uniq Crackers
 * Supports Fast2SMS (India DLT/OTP), Twilio, and development gateway simulation.
 */

import { ServerStore } from '@/lib/server-store';

export interface SmsSendResult {
  success: boolean;
  provider: 'fast2sms' | 'twilio' | 'msg91' | 'simulation';
  message: string;
}

export async function sendSmsOtp(phone: string, otp: string): Promise<SmsSendResult> {
  const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);

  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    return {
      success: false,
      provider: 'simulation',
      message: 'Invalid 10-digit Indian phone number.',
    };
  }

  // 1. FAST2SMS Integration (Standard Indian SMS gateway for instant OTPs)
  const settings = ServerStore.getDeliverySettings();
  const fast2SmsKey = settings.smsApiKey || process.env.FAST2SMS_API_KEY || process.env.SMS_GATEWAY_API_KEY;
  if (fast2SmsKey && fast2SmsKey.trim().length > 10) {
    try {
      // Primary: Fast2SMS dedicated OTP route
      const otpUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(
        fast2SmsKey.trim()
      )}&route=otp&variables_values=${encodeURIComponent(otp)}&flash=0&numbers=${cleanPhone}`;

      let response = await fetch(otpUrl, {
        method: 'GET',
        headers: { 'cache-control': 'no-cache' },
      });

      let data = await response.json();
      if (data && data.return === true) {
        console.log(`[FAST2SMS OTP ROUTE] OTP delivered to +91 ${cleanPhone}`);
        return {
          success: true,
          provider: 'fast2sms',
          message: `SMS OTP delivered to +91 ${cleanPhone}.`,
        };
      }

      // Secondary fallback: Fast2SMS Quick SMS route (route=q)
      const quickUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(
        fast2SmsKey.trim()
      )}&route=q&message=${encodeURIComponent(
        `Your Uniq Crackers login verification OTP is: ${otp}. Valid for 5 minutes.`
      )}&language=english&flash=0&numbers=${cleanPhone}`;

      response = await fetch(quickUrl, {
        method: 'GET',
        headers: { 'cache-control': 'no-cache' },
      });

      data = await response.json();
      let lastErrorMsg = '';
      if (data && data.return === true) {
        console.log(`[FAST2SMS QUICK ROUTE] OTP delivered to +91 ${cleanPhone}`);
        return {
          success: true,
          provider: 'fast2sms',
          message: `SMS OTP delivered to +91 ${cleanPhone} via Fast2SMS.`,
        };
      } else {
        lastErrorMsg = Array.isArray(data?.message) ? data.message.join(', ') : (data?.message || JSON.stringify(data));
        console.warn('[FAST2SMS ERROR]', lastErrorMsg);
      }

      let formattedMsg = lastErrorMsg;
      if (lastErrorMsg.includes('100 INR') || lastErrorMsg.includes('transaction of 100')) {
        formattedMsg = 'Fast2SMS requires completing one ₹100 wallet recharge on fast2sms.com (via UPI) to unlock live SMS delivery to Indian mobile networks.';
      } else if (lastErrorMsg.includes('complete website verification') || lastErrorMsg.includes('OTP Message')) {
        formattedMsg = 'Fast2SMS requires website verification in Fast2SMS dashboard under "OTP Message" menu, or recharge ₹100 to enable Quick SMS.';
      }

      // If user configured a Fast2SMS key, report the actual gateway response
      return {
        success: false,
        provider: 'fast2sms',
        message: formattedMsg || 'Unable to deliver SMS. Check Fast2SMS account status.',
      };
    } catch (err: any) {
      console.error('[FAST2SMS EXCEPTION]', err.message);
      return {
        success: false,
        provider: 'fast2sms',
        message: `Fast2SMS Network Connection Error: ${err.message}`,
      };
    }
  }

  // 1B. 2FACTOR.IN Integration (Widely used Indian transactional OTP gateway)
  const twoFactorKey = process.env.TWO_FACTOR_API_KEY || (fast2SmsKey && fast2SmsKey.includes('-') ? fast2SmsKey : undefined);
  if (twoFactorKey && twoFactorKey.trim().length > 15) {
    try {
      const tfUrl = `https://2factor.in/API/V1/${encodeURIComponent(twoFactorKey.trim())}/SMS/${cleanPhone}/${encodeURIComponent(otp)}/AUTOGEN`;
      const response = await fetch(tfUrl, { method: 'GET' });
      const data = await response.json();
      if (data && data.Status === 'Success') {
        console.log(`[2FACTOR SMS] OTP delivered to +91 ${cleanPhone}`);
        return {
          success: true,
          provider: 'msg91',
          message: `SMS OTP delivered to +91 ${cleanPhone} via 2Factor.in.`,
        };
      }
    } catch (err: any) {
      console.error('[2FACTOR SMS EXCEPTION]', err.message);
    }
  }

  // 2. TWILIO SMS Integration
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const body = new URLSearchParams({
        To: `+91${cleanPhone}`,
        From: twilioFrom,
        Body: `Your Uniq Crackers login verification OTP is: ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`,
      });

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (response.ok) {
        console.log(`[TWILIO SMS] OTP sent to +91 ${cleanPhone}`);
        return {
          success: true,
          provider: 'twilio',
          message: `SMS OTP delivered to +91 ${cleanPhone}.`,
        };
      }
    } catch (err: any) {
      console.error('[TWILIO SMS EXCEPTION]', err.message);
    }
  }

  // 3. Fallback: Simulator mode for development testing only
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      provider: 'simulation',
      message: 'SMS delivery gateway is not configured for production.',
    };
  }

  // Development environment logging only (never executed in production)
  console.log(
    `\n=========================================================\n` +
      `📨 [DEV ONLY - SIMULATOR NOTICE]\n` +
      `To: +91 ${cleanPhone}\n` +
      `Simulated OTP Code: ${otp}\n` +
      `Notice: This output is strictly suppressed in production.\n` +
      `=========================================================\n`
  );

  return {
    success: true,
    provider: 'simulation',
    message: `Verification code generated for +91 ${cleanPhone}. Please enter the 6-digit code.`,
  };
}
