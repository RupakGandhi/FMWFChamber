/**
 * Email Notification System for FMWF Chamber Application Management
 * 
 * This module provides email notification functionality for:
 * - Application submission confirmations
 * - Reviewer assignment notifications
 * - Status update notifications
 * - Reviewer reminders
 * 
 * Supports custom email templates with variable substitution.
 * 
 * Note: This uses the Manus notification system to notify the owner.
 * For actual email delivery to applicants/reviewers, integrate with
 * SendGrid, Mailgun, or similar email service.
 */

import { notifyOwner } from "./_core/notification";
import { EmailConfig } from "../drizzle/schema";
import { sendEmail, isSmtpEnabled } from "./smtpService";

// Template variable definitions
export interface TemplateVariables {
  applicant_name?: string;
  applicant_email?: string;
  program_name?: string;
  application_number?: string;
  application_status?: string;
  reviewer_name?: string;
  reviewer_link?: string;
  pending_count?: string;
  participant_form_link?: string;
}

// Default templates
export const defaultTemplates = {
  confirmation: {
    subject: "Application Received - {{program_name}}",
    body: `Dear {{applicant_name}},

Thank you for submitting your application to {{program_name}}!

Your application has been received and assigned confirmation number: {{application_number}}

You can check the status of your application at any time using this confirmation number.

We will review your application and notify you of any updates.

Best regards,
FMWF Chamber of Commerce`
  },
  reviewerAssignment: {
    subject: "New Review Assignment - {{program_name}}",
    body: `Dear {{reviewer_name}},

You have been assigned new applications to review for {{program_name}}.

Please click the link below to access your reviewer portal and complete your reviews:
{{reviewer_link}}

Number of pending reviews: {{pending_count}}

Thank you for your time and dedication to this process.

Best regards,
FMWF Chamber of Commerce`
  },
  statusUpdate: {
    subject: "Application Status Update - {{program_name}}",
    body: `Dear {{applicant_name}},

We are writing to inform you that your application status for {{program_name}} has been updated.

Application Number: {{application_number}}
New Status: {{application_status}}

{{participant_form_link}}

If you have any questions, please don't hesitate to contact us.

Best regards,
FMWF Chamber of Commerce`
  },
  reviewerReminder: {
    subject: "Reminder: Pending Reviews - {{program_name}}",
    body: `Dear {{reviewer_name}},

This is a friendly reminder that you have pending application reviews for {{program_name}}.

Number of pending reviews: {{pending_count}}

Please click the link below to access your reviewer portal:
{{reviewer_link}}

Thank you for your continued support.

Best regards,
FMWF Chamber of Commerce`
  }
};

/**
 * Replace template variables with actual values
 */
export function replaceTemplateVariables(
  template: string,
  variables: TemplateVariables
): string {
  let result = template;
  
  // Replace each variable
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  });
  
  return result;
}

/**
 * Get template from email config or use default
 */
function getTemplate(
  emailConfig: EmailConfig | null | undefined,
  templateType: 'confirmation' | 'reviewerAssignment' | 'statusUpdate' | 'reviewerReminder'
): { subject: string; body: string } {
  const defaults = defaultTemplates[templateType];
  
  if (!emailConfig) {
    return defaults;
  }
  
  switch (templateType) {
    case 'confirmation':
      return {
        subject: emailConfig.confirmationSubject || defaults.subject,
        body: emailConfig.confirmationBody || defaults.body,
      };
    case 'reviewerAssignment':
      return {
        subject: emailConfig.reviewerAssignmentSubject || defaults.subject,
        body: emailConfig.reviewerAssignmentBody || defaults.body,
      };
    case 'statusUpdate':
      return {
        subject: emailConfig.statusUpdateSubject || defaults.subject,
        body: emailConfig.statusUpdateBody || defaults.body,
      };
    case 'reviewerReminder':
      return {
        subject: emailConfig.reviewerReminderSubject || defaults.subject,
        body: emailConfig.reviewerReminderBody || defaults.body,
      };
    default:
      return defaults;
  }
}

export interface ApplicationNotification {
  applicantName: string;
  applicantEmail: string;
  programName: string;
  applicationNumber: string;
  emailConfig?: EmailConfig | null;
}

export interface ReviewerAssignmentNotification {
  reviewerName: string;
  reviewerEmail: string;
  reviewerAccessToken?: string;
  accessToken?: string;
  programName: string;
  applicationCount?: number;
  baseUrl?: string;
  isReminder?: boolean;
  emailConfig?: EmailConfig | null;
}

export interface StatusUpdateNotification {
  applicantName: string;
  applicantEmail: string;
  programName: string;
  applicationNumber: string;
  newStatus: string;
  emailConfig?: EmailConfig | null;
  participantFormLink?: string;
  applicationId?: number;
  programId?: number;
}

export interface ReviewerUnassignmentNotification {
  reviewerName: string;
  reviewerEmail: string;
  programName: string;
  applicationNumber: string;
  emailConfig?: EmailConfig | null;
}

/**
 * Notify owner when a new application is submitted
 */
export async function notifyApplicationSubmitted(
  data: ApplicationNotification
): Promise<boolean> {
  const template = getTemplate(data.emailConfig, 'confirmation');
  const variables: TemplateVariables = {
    applicant_name: data.applicantName,
    applicant_email: data.applicantEmail,
    program_name: data.programName,
    application_number: data.applicationNumber,
  };
  
  const subject = replaceTemplateVariables(template.subject, variables);
  const body = replaceTemplateVariables(template.body, variables);
  
  const title = `New Application: ${data.programName}`;
  const content = `
A new application has been submitted:

**Program:** ${data.programName}
**Application #:** ${data.applicationNumber}
**Applicant:** ${data.applicantName}
**Email:** ${data.applicantEmail}

---
**Email that would be sent to applicant:**
Subject: ${subject}

${body}
  `.trim();

  // Always notify owner
  await notifyOwner({ title, content });
  
  // Also send actual email via SMTP if configured
  const smtpEnabled = await isSmtpEnabled();
  if (smtpEnabled && data.emailConfig?.confirmationEnabled !== false) {
    const emailContent = generateApplicationConfirmationEmail(data);
    await sendEmail({
      to: data.applicantEmail,
      toName: data.applicantName,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });
  }
  
  return true;
}

/**
 * Notify owner when reviewers are assigned to applications
 */
export async function notifyReviewerAssigned(
  data: ReviewerAssignmentNotification
): Promise<boolean> {
  const token = data.reviewerAccessToken || data.accessToken || '';
  const baseUrl = data.baseUrl || process.env.PUBLIC_APP_URL || process.env.VITE_APP_URL || 'http://localhost:3000';
  const reviewerLink = `${baseUrl}/review/${token}`;
  
  const templateType = data.isReminder ? 'reviewerReminder' : 'reviewerAssignment';
  const template = getTemplate(data.emailConfig, templateType);
  
  const variables: TemplateVariables = {
    reviewer_name: data.reviewerName,
    program_name: data.programName,
    reviewer_link: reviewerLink,
    pending_count: String(data.applicationCount || 0),
  };
  
  const subject = replaceTemplateVariables(template.subject, variables);
  const body = replaceTemplateVariables(template.body, variables);
  
  const title = data.isReminder 
    ? `Reminder Sent: ${data.reviewerName}` 
    : `Reviewer Assigned: ${data.reviewerName}`;
    
  const content = `
${data.isReminder ? 'A reminder has been sent to:' : 'A reviewer has been assigned new applications:'}

**Reviewer:** ${data.reviewerName}
**Email:** ${data.reviewerEmail}
**Program:** ${data.programName}
**Applications:** ${data.applicationCount}

**Reviewer Portal Link:**
${reviewerLink}

---
**Email that would be sent to reviewer:**
Subject: ${subject}

${body}
  `.trim();

  // Always notify owner
  await notifyOwner({ title, content });
  
  // Also send actual email via SMTP if configured
  const smtpEnabled = await isSmtpEnabled();
  if (smtpEnabled && data.emailConfig?.reviewerNotificationEnabled !== false) {
    const emailContent = generateReviewerAssignmentEmail(data);
    await sendEmail({
      to: data.reviewerEmail,
      toName: data.reviewerName,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });
  }
  
  return true;
}

/**
 * Notify owner when an application status changes
 */
export async function notifyStatusChanged(
  data: StatusUpdateNotification
): Promise<boolean> {
  const statusLabels: Record<string, string> = {
    submitted: 'Submitted',
    under_review: 'Under Review',
    accepted: 'Accepted',
    rejected: 'Not Selected',
    waitlist: 'Waitlisted',
  };

  const template = getTemplate(data.emailConfig, 'statusUpdate');
  
  const variables: TemplateVariables = {
    applicant_name: data.applicantName,
    applicant_email: data.applicantEmail,
    program_name: data.programName,
    application_number: data.applicationNumber,
    application_status: statusLabels[data.newStatus] || data.newStatus,
    participant_form_link: data.participantFormLink || '',
  };
  
  const subject = replaceTemplateVariables(template.subject, variables);
  const body = replaceTemplateVariables(template.body, variables);

  const title = `Status Update: ${data.applicationNumber}`;
  let content = `
An application status has been updated:

**Program:** ${data.programName}
**Application #:** ${data.applicationNumber}
**Applicant:** ${data.applicantName}
**New Status:** ${statusLabels[data.newStatus] || data.newStatus}
  `.trim();

  content += `\n\n---\n**Email that would be sent to applicant:**\nSubject: ${subject}\n\n${body}`;

  // Always notify owner
  await notifyOwner({ title, content });
  
  // Also send actual email via SMTP if configured
  const smtpEnabled = await isSmtpEnabled();
  if (smtpEnabled && data.emailConfig?.statusUpdateEnabled !== false) {
    const emailContent = generateStatusUpdateEmail(data);
    await sendEmail({
      to: data.applicantEmail,
      toName: data.applicantName,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });
  }
  
  return true;
}

/**
 * Generate email content for reviewer assignment (for future email integration)
 */
export function generateReviewerAssignmentEmail(
  data: ReviewerAssignmentNotification
): { subject: string; html: string; text: string } {
  const token = data.reviewerAccessToken || data.accessToken || '';
  const baseUrl = data.baseUrl || process.env.PUBLIC_APP_URL || process.env.VITE_APP_URL || 'http://localhost:3000';
  const reviewerLink = `${baseUrl}/review/${token}`;
  const appCount = data.applicationCount || 0;
  
  const templateType = data.isReminder ? 'reviewerReminder' : 'reviewerAssignment';
  const template = getTemplate(data.emailConfig, templateType);
  
  const variables: TemplateVariables = {
    reviewer_name: data.reviewerName,
    program_name: data.programName,
    reviewer_link: reviewerLink,
    pending_count: String(appCount),
  };
  
  const subject = replaceTemplateVariables(template.subject, variables);
  const textBody = replaceTemplateVariables(template.body, variables);
  
  // Convert text body to HTML
  const htmlBody = textBody
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/{{reviewer_link}}/g, `<a href="${reviewerLink}" style="color: #2563eb;">${reviewerLink}</a>`);
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FMWF Chamber</h1>
      <p>${data.isReminder ? 'Review Reminder' : 'Application Review Assignment'}</p>
    </div>
    <div class="content">
      <p>${htmlBody}</p>
      <p style="text-align: center;">
        <a href="${reviewerLink}" class="button">Access Reviewer Portal</a>
      </p>
    </div>
    <div class="footer">
      <p>FMWF Chamber of Commerce</p>
      <p>Application Management System</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text: textBody };
}

/**
 * Generate email content for application confirmation (for future email integration)
 */
export function generateApplicationConfirmationEmail(
  data: ApplicationNotification
): { subject: string; html: string; text: string } {
  const template = getTemplate(data.emailConfig, 'confirmation');
  
  const variables: TemplateVariables = {
    applicant_name: data.applicantName,
    applicant_email: data.applicantEmail,
    program_name: data.programName,
    application_number: data.applicationNumber,
  };
  
  const subject = replaceTemplateVariables(template.subject, variables);
  const textBody = replaceTemplateVariables(template.body, variables);
  
  // Convert text body to HTML
  const htmlBody = textBody
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
    .highlight { background: #dbeafe; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FMWF Chamber</h1>
      <p>Application Confirmation</p>
    </div>
    <div class="content">
      <p>${htmlBody}</p>
      <div class="highlight">
        <p><strong>Application Number:</strong> ${data.applicationNumber}</p>
        <p>Please save this number for your records.</p>
      </div>
    </div>
    <div class="footer">
      <p>FMWF Chamber of Commerce</p>
      <p>Application Management System</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text: textBody };
}

/**
 * Generate email content for status update (for future email integration)
 */
export function generateStatusUpdateEmail(
  data: StatusUpdateNotification
): { subject: string; html: string; text: string } {
  const statusLabels: Record<string, string> = {
    submitted: 'Submitted',
    under_review: 'Under Review',
    accepted: 'Accepted',
    rejected: 'Not Selected',
    waitlist: 'Waitlisted',
  };
  
  const template = getTemplate(data.emailConfig, 'statusUpdate');
  
  const variables: TemplateVariables = {
    applicant_name: data.applicantName,
    applicant_email: data.applicantEmail,
    program_name: data.programName,
    application_number: data.applicationNumber,
    application_status: statusLabels[data.newStatus] || data.newStatus,
    participant_form_link: data.participantFormLink || '',
  };
  
  const subject = replaceTemplateVariables(template.subject, variables);
  const textBody = replaceTemplateVariables(template.body, variables);
  
  // Convert text body to HTML
  const htmlBody = textBody
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/{{participant_form_link}}/g, data.participantFormLink ? `<a href="${data.participantFormLink}" style="color: #2563eb;">${data.participantFormLink}</a>` : '');
  
  // Build participant form section for accepted status
  const participantFormSection = (data.newStatus === 'accepted' && data.participantFormLink) ? `
      <div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
        <p style="font-weight: bold; color: #065f46; margin: 0 0 8px 0;">Next Step: Complete Your Event Registration</p>
        <p style="color: #047857; margin: 0 0 12px 0; font-size: 14px;">Please fill out your participant details (t-shirt sizes, attendees, etc.)</p>
        <a href="${data.participantFormLink}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Complete Registration Form</a>
      </div>` : '';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
    .status-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FMWF Chamber</h1>
      <p>Application Status Update</p>
    </div>
    <div class="content">
      <p>${htmlBody}</p>
      <p style="text-align: center; margin: 20px 0;">
        <span class="status-badge">${statusLabels[data.newStatus] || data.newStatus}</span>
      </p>
      ${participantFormSection}
    </div>
    <div class="footer">
      <p>FMWF Chamber of Commerce</p>
      <p>Application Management System</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text: textBody };
}


/**
 * Notify owner when a reviewer is unassigned from an application
 */
export async function notifyReviewerUnassigned(
  data: ReviewerUnassignmentNotification
): Promise<boolean> {
  const title = `Reviewer Unassigned: ${data.reviewerName}`;
  const content = `
A reviewer has been removed from an application:

**Reviewer:** ${data.reviewerName}
**Email:** ${data.reviewerEmail}
**Program:** ${data.programName}
**Application #:** ${data.applicationNumber}

The reviewer will no longer see this application in their portal.
  `.trim();

  // Notify owner
  await notifyOwner({ title, content });
  
  // Also send email to reviewer via SMTP if configured
  const smtpEnabled = await isSmtpEnabled();
  if (smtpEnabled) {
    const emailContent = generateReviewerUnassignmentEmail(data);
    await sendEmail({
      to: data.reviewerEmail,
      toName: data.reviewerName,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });
  }
  
  return true;
}

/**
 * Generate email content for reviewer unassignment
 */
export function generateReviewerUnassignmentEmail(
  data: ReviewerUnassignmentNotification
): { subject: string; html: string; text: string } {
  const subject = `Review Assignment Removed - ${data.programName}`;
  
  const textBody = `Dear ${data.reviewerName},

This is to inform you that you have been removed from reviewing application ${data.applicationNumber} for ${data.programName}.

You will no longer see this application in your reviewer portal.

If you have any questions, please contact the program administrator.

Best regards,
FMWF Chamber of Commerce`;

  const htmlBody = textBody
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
    .notice { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FMWF Chamber</h1>
      <p>Review Assignment Update</p>
    </div>
    <div class="content">
      <p>${htmlBody}</p>
      <div class="notice">
        <p><strong>Application:</strong> ${data.applicationNumber}</p>
        <p><strong>Program:</strong> ${data.programName}</p>
      </div>
    </div>
    <div class="footer">
      <p>FMWF Chamber of Commerce</p>
      <p>Application Management System</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text: textBody };
}
