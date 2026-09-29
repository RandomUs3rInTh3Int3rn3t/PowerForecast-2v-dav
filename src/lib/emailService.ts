import { devLog } from './devLogger';
import { buildBrandedEmailHtml } from './emailTemplates';

export type EmailTemplateType = 'household_invite' | 'budget_alert' | 'surge_alert' | 'test_email' | 'custom';

export interface SendEmailOptions {
  to: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  type?: EmailTemplateType;
  data?: Record<string, any>;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
  code?: string;
  recipient?: string | string[];
  subject?: string;
}

export interface EmailHealthStatus {
  ok: boolean;
  hasApiKey: boolean;
  senderEmail?: string;
  service?: string;
  message: string;
}

/**
 * Checks backend email dispatcher status and whether RESEND_API_KEY is configured.
 */
export async function checkEmailDeliveryHealth(): Promise<EmailHealthStatus> {
  try {
    const res = await fetch('/api/send_email', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      return {
        ok: true,
        hasApiKey: Boolean(data.hasApiKey),
        senderEmail: data.senderEmail,
        service: data.service,
        message: data.hasApiKey
          ? 'Resend API key configured on serverless environment.'
          : 'Serverless email dispatcher reachable, but RESEND_API_KEY is not yet configured.',
      };
    }
  } catch (err: any) {
    devLog.warn('EmailService', 'Failed to probe /api/send_email endpoint:', err);
  }

  // Fallback check on client environment variable
  const clientKey = import.meta.env.VITE_RESEND_API_KEY;
  if (clientKey) {
    return {
      ok: true,
      hasApiKey: true,
      senderEmail: import.meta.env.VITE_RESEND_FROM_EMAIL || 'PowerForecast <noreply@comugallery.me>',
      message: 'Client-side Resend API key configured (VITE_RESEND_API_KEY).',
    };
  }

  return {
    ok: false,
    hasApiKey: false,
    message: 'Resend API key not detected in serverless or local environment.',
  };
}

/**
 * Dispatches an email via Vercel Serverless /api/send_email with client-side Resend fallback.
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const { to, subject, html, text, type, data, from } = options;

  if (!to || (Array.isArray(to) && to.length === 0)) {
    return {
      success: false,
      error: 'Recipient email address is required.',
      code: 'MISSING_RECIPIENT',
    };
  }

  devLog.info('EmailService', `Attempting email delivery to ${JSON.stringify(to)} [type: ${type || 'standard'}]...`);

  // 1. Primary Strategy: Call Vercel Serverless Endpoint (/api/send_email)
  try {
    const response = await fetch('/api/send_email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        text,
        type,
        data,
        from,
      }),
    });

    const json = await response.json().catch(() => ({}));

    if (response.ok && json.success) {
      devLog.info('EmailService', 'Email sent successfully via /api/send_email', json);
      return {
        success: true,
        id: json.id,
        recipient: json.recipient,
        subject: json.subject,
      };
    }

    // If server specifically reported missing key or specific error
    if (json.code === 'MISSING_RESEND_API_KEY') {
      devLog.warn('EmailService', 'Server reported MISSING_RESEND_API_KEY, checking client fallback...');
    } else if (!response.ok) {
      devLog.warn('EmailService', `Server returned HTTP ${response.status}:`, json);
      // If error is not a 404 (endpoint exists), return the server's error message
      if (response.status !== 404 && json.error) {
        return {
          success: false,
          error: json.error,
          code: json.code || 'SERVER_ERROR',
        };
      }
    }
  } catch (serverlessError: any) {
    devLog.warn('EmailService', 'Serverless /api/send_email call failed, attempting client fallback...', serverlessError);
  }

  // 2. Secondary Strategy: Direct Resend API Client Fallback (useful for local Vite dev)
  const clientApiKey = import.meta.env.VITE_RESEND_API_KEY;
  if (clientApiKey) {
    try {
      devLog.info('EmailService', 'Attempting direct client call to https://api.resend.com/emails...');
      const sender = from || import.meta.env.VITE_RESEND_FROM_EMAIL || 'PowerForecast <noreply@comugallery.me>';
      
      const payload: Record<string, any> = {
        from: sender,
        to: Array.isArray(to) ? to : [to],
        subject: subject || (type === 'test_email' ? 'PowerForecast SMTP Test' : 'PowerForecast Notification'),
      };

      if (html) {
        payload.html = html;
      } else if (type === 'household_invite') {
        payload.html = buildBrandedEmailHtml({
          headline: 'Household Energy Team Invitation',
          bodyParagraphs: [`<strong>${data?.inviterName || 'A household member'}</strong> has invited you to join their smart household energy profile on PowerForecast.`],
          highlightBox: { label: 'Household Join Code', value: data?.inviteCode || 'PF-HH-0000' },
          buttonText: 'Accept Invitation & Join',
          buttonUrl: data?.inviteLink,
        });
      } else if (type === 'budget_alert') {
        payload.html = buildBrandedEmailHtml({
          badge: 'BUDGET ALERT',
          badgeColor: '#ef4444',
          headline: `Hello ${data?.userName || 'User'},`,
          bodyParagraphs: [`Your household electricity consumption has reached <strong style="color: #f87171;">${data?.percentConsumed || '80%'}</strong> of your monthly target.`],
          metricsTable: [
            { label: 'Current Usage', value: `${data?.currentKwh || 0} kWh` },
            { label: 'Target Budget', value: `${data?.budgetLimitKwh || 0} kWh` },
            { label: 'Projected Bill', value: data?.projectedBill || '₱0.00', highlight: true },
          ],
        });
      } else if (type === 'surge_alert') {
        payload.html = buildBrandedEmailHtml({
          badge: 'SURGE WARNING',
          badgeColor: '#f59e0b',
          headline: 'Active Load Warning',
          bodyParagraphs: [
            `Your active telemetry monitor registered concurrent appliance wattage of <strong style="color: #fbbf24;">${data?.currentWatts} Watts</strong> at ${data?.timestamp || 'just now'}, exceeding your safety threshold limit of ${data?.thresholdWatts} Watts.`,
            'Please check active high-draw equipment such as air conditioning units, induction cookers, or electric water heaters running concurrently.',
          ],
        });
      } else if (type === 'test_email') {
        payload.html = buildBrandedEmailHtml({
          badge: 'SMTP DIAGNOSTICS',
          badgeColor: '#22c55e',
          headline: 'Connection Verified!',
          bodyParagraphs: [
            'This test email confirms that your PowerForecast Resend Delivery Engine and Custom Domain SMTP (<strong>noreply@comugallery.me</strong>) are operational and delivering worldwide.',
          ],
          metricsTable: [
            { label: 'Target Recipient', value: data?.recipient || (Array.isArray(to) ? to[0] : to) },
            { label: 'Dispatched At', value: data?.timestamp || new Date().toLocaleString() },
            { label: 'Diagnostics Note', value: data?.note || 'Operational check passed', highlight: true },
          ],
        });
      } else if (text) {
        payload.text = text;
      } else {
        payload.html = buildBrandedEmailHtml({
          headline: payload.subject,
          bodyParagraphs: [data?.note || data?.content || 'Notification from PowerForecast.'],
        });
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clientApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json().catch(() => ({}));
      if (res.ok && resJson.id) {
        devLog.info('EmailService', 'Direct Resend API call succeeded:', resJson);
        return {
          success: true,
          id: resJson.id,
          recipient: to,
          subject: payload.subject,
        };
      } else {
        return {
          success: false,
          error: resJson.message || `Resend error (${res.status})`,
          code: 'RESEND_DIRECT_ERROR',
        };
      }
    } catch (directErr: any) {
      return {
        success: false,
        error: `Direct Resend delivery error: ${directErr?.message || 'Network error'}`,
        code: 'NETWORK_ERROR',
      };
    }
  }

  return {
    success: false,
    error: 'RESEND_API_KEY is not configured on your server or environment variables. Please configure your Resend credentials to enable live email delivery.',
    code: 'CONFIG_MISSING',
  };
}

/**
 * Dispatches a branded Household Member Invitation email.
 */
export async function sendHouseholdInvitationEmail(params: {
  toName: string;
  toEmail: string;
  inviterName: string;
  inviteCode: string;
  inviteLink: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.toEmail,
    type: 'household_invite',
    data: {
      inviterName: params.inviterName,
      inviteCode: params.inviteCode,
      inviteLink: params.inviteLink,
      toName: params.toName,
    },
  });
}

/**
 * Dispatches an Energy Budget threshold warning email.
 */
export async function sendEnergyBudgetAlertEmail(params: {
  toEmail: string;
  userName: string;
  currentKwh: number;
  budgetLimitKwh: number;
  percentConsumed: number;
  projectedBill: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.toEmail,
    type: 'budget_alert',
    data: {
      userName: params.userName,
      currentKwh: params.currentKwh.toFixed(1),
      budgetLimitKwh: params.budgetLimitKwh.toFixed(1),
      percentConsumed: `${Math.round(params.percentConsumed)}%`,
      projectedBill: params.projectedBill,
    },
  });
}

/**
 * Dispatches an active Wattage Surge warning email.
 */
export async function sendSurgeAlertEmail(params: {
  toEmail: string;
  currentWatts: number;
  thresholdWatts: number;
  timestamp?: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.toEmail,
    type: 'surge_alert',
    data: {
      currentWatts: Math.round(params.currentWatts).toString(),
      thresholdWatts: Math.round(params.thresholdWatts).toString(),
      timestamp: params.timestamp || new Date().toLocaleTimeString(),
    },
  });
}

/**
 * Dispatches a diagnostic test email to verify SMTP & Resend delivery.
 */
export async function sendSmtpTestEmail(params: {
  toEmail: string;
  testNote?: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.toEmail,
    type: 'test_email',
    data: {
      recipient: params.toEmail,
      timestamp: new Date().toLocaleString(),
      note: params.testNote || 'Operational check via PowerForecast Settings Diagnostics',
    },
  });
}
