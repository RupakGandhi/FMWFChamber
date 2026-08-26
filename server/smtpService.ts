/**
 * SMTP Email Service for FMWF Chamber Application Management
 * 
 * This module provides actual email delivery via SMTP using nodemailer.
 * Supports custom SMTP configuration, From/Reply-To addresses, and test emails.
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { SmtpConfig } from "../drizzle/schema";
import { getDb } from "./db";
import { systemSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Cache the transporter to avoid recreating it for each email
let cachedTransporter: Transporter | null = null;
let cachedConfig: SmtpConfig | null = null;

const ENCRYPTED_PASSWORD_PREFIX = "enc:v1:";

function smtpEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required to encrypt SMTP credentials");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSmtpPassword(password: string): string {
  if (!password || password.startsWith(ENCRYPTED_PASSWORD_PREFIX)) return password;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", smtpEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENCRYPTED_PASSWORD_PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSmtpPassword(password: string): string {
  if (!password || !password.startsWith(ENCRYPTED_PASSWORD_PREFIX)) return password;
  const payload = password.slice(ENCRYPTED_PASSWORD_PREFIX.length);
  const [ivValue, authTagValue, encryptedValue] = payload.split(":");
  if (!ivValue || !authTagValue || !encryptedValue) {
    throw new Error("Stored SMTP password is not in a recognized encrypted format");
  }
  const decipher = createDecipheriv("aes-256-gcm", smtpEncryptionKey(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(authTagValue, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * Get SMTP configuration from database
 */
export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "smtp_config"))
      .limit(1);
    
    if (result.length === 0) return null;
    const storedConfig = result[0].value as SmtpConfig;
    return {
      ...storedConfig,
      password: decryptSmtpPassword(storedConfig.password),
    };
  } catch (error) {
    console.error("[SMTP] Failed to get config:", error);
    return null;
  }
}

/**
 * Save SMTP configuration to database
 */
export async function saveSmtpConfig(config: SmtpConfig, userId?: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    const storedConfig: SmtpConfig = {
      ...config,
      password: encryptSmtpPassword(config.password),
    };
    // Check if config exists
    const existing = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "smtp_config"))
      .limit(1);
    
    if (existing.length > 0) {
      await db
        .update(systemSettings)
        .set({ value: storedConfig, updatedBy: userId })
        .where(eq(systemSettings.key, "smtp_config"));
    } else {
      await db.insert(systemSettings).values({
        key: "smtp_config",
        value: storedConfig,
        updatedBy: userId,
      });
    }
    
    // Clear cached transporter so it gets recreated with new config
    cachedTransporter = null;
    cachedConfig = null;
    
    return true;
  } catch (error) {
    console.error("[SMTP] Failed to save config:", error);
    return false;
  }
}

/**
 * Create or get cached nodemailer transporter
 */
async function getTransporter(): Promise<Transporter | null> {
  const config = await getSmtpConfig();
  
  if (!config || !config.enabled) {
    return null;
  }
  
  // Return cached transporter if config hasn't changed
  if (cachedTransporter && cachedConfig && 
      cachedConfig.host === config.host &&
      cachedConfig.port === config.port &&
      cachedConfig.username === config.username) {
    return cachedTransporter;
  }
  
  try {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure, // true for 465, false for other ports
      auth: {
        user: config.username,
        pass: config.password,
      },
      // Timeout settings
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
    });
    
    cachedConfig = config;
    return cachedTransporter;
  } catch (error) {
    console.error("[SMTP] Failed to create transporter:", error);
    return null;
  }
}

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email via SMTP
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const config = await getSmtpConfig();
  
  if (!config || !config.enabled) {
    return {
      success: false,
      error: "SMTP is not configured or enabled",
    };
  }
  
  const transporter = await getTransporter();
  
  if (!transporter) {
    return {
      success: false,
      error: "Failed to create email transporter",
    };
  }
  
  try {
    // Build the from address
    const fromAddress = config.fromName 
      ? `"${config.fromName}" <${config.fromEmail}>`
      : config.fromEmail;
    
    // Build the to address
    const toAddress = options.toName
      ? `"${options.toName}" <${options.to}>`
      : options.to;
    
    // Build reply-to address
    const replyTo = options.replyTo || (config.replyToEmail 
      ? (config.replyToName 
          ? `"${config.replyToName}" <${config.replyToEmail}>`
          : config.replyToEmail)
      : undefined);
    
    const result = await transporter.sendMail({
      from: fromAddress,
      to: toAddress,
      replyTo: replyTo,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    
    console.log("[SMTP] Email sent:", result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[SMTP] Failed to send email:", errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Test SMTP connection and send a test email
 */
export async function testSmtpConnection(
  config: SmtpConfig,
  testEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create a temporary transporter with the provided config
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });
    
    // Verify connection
    await transporter.verify();
    
    // Build addresses
    const fromAddress = config.fromName 
      ? `"${config.fromName}" <${config.fromEmail}>`
      : config.fromEmail;
    
    const replyTo = config.replyToEmail 
      ? (config.replyToName 
          ? `"${config.replyToName}" <${config.replyToEmail}>`
          : config.replyToEmail)
      : undefined;
    
    // Send test email
    await transporter.sendMail({
      from: fromAddress,
      to: testEmail,
      replyTo: replyTo,
      subject: "FMWF Chamber - SMTP Test Email",
      text: `This is a test email from the FMWF Chamber Application Management System.

If you received this email, your SMTP configuration is working correctly!

Configuration Details:
- SMTP Host: ${config.host}
- Port: ${config.port}
- From: ${config.fromName} <${config.fromEmail}>
${config.replyToEmail ? `- Reply-To: ${config.replyToName || ''} <${config.replyToEmail}>` : ''}

This is an automated test message. No action is required.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
    .success { background: #dcfce7; border: 1px solid #16a34a; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .details { background: #e2e8f0; padding: 15px; border-radius: 6px; margin: 15px 0; font-family: monospace; font-size: 14px; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FMWF Chamber</h1>
      <p>SMTP Test Email</p>
    </div>
    <div class="content">
      <div class="success">
        <strong>✓ Success!</strong> Your SMTP configuration is working correctly.
      </div>
      <p>If you received this email, your email settings have been configured properly and the system can now send emails to applicants and reviewers.</p>
      <div class="details">
        <strong>Configuration Details:</strong><br>
        SMTP Host: ${config.host}<br>
        Port: ${config.port}<br>
        Encryption: ${config.secure ? 'SSL/TLS' : 'STARTTLS'}<br>
        From: ${config.fromName} &lt;${config.fromEmail}&gt;<br>
        ${config.replyToEmail ? `Reply-To: ${config.replyToName || ''} &lt;${config.replyToEmail}&gt;` : ''}
      </div>
      <p><em>This is an automated test message. No action is required.</em></p>
    </div>
    <div class="footer">
      <p>FMWF Chamber of Commerce</p>
      <p>Application Management System</p>
    </div>
  </div>
</body>
</html>
      `,
    });
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[SMTP] Test failed:", errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if SMTP is configured and enabled
 */
export async function isSmtpEnabled(): Promise<boolean> {
  const config = await getSmtpConfig();
  return config?.enabled === true;
}
