import { describe, expect, it } from 'vitest';
import mysql from 'mysql2/promise';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

const runDatabaseAcceptance = process.env.RUN_DB_E2E === 'true';

function adminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: 'e2e-admin',
      email: 'e2e-admin@example.com',
      name: 'E2E Admin',
      loginMethod: 'test',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: 'https', headers: {} } as TrpcContext['req'],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext['res'],
  };
}

function publicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: 'https', headers: {} } as TrpcContext['req'],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext['res'],
  };
}

describe.skipIf(!runDatabaseAcceptance)('database-backed production acceptance workflow', () => {
  it('executes and verifies every critical Chamber workflow, then removes all temporary records', async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is required for RUN_DB_E2E=true');

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const scoredSlug = `e2e-scored-${suffix}`;
    const registrationSlug = `e2e-registration-${suffix}`;
    const admin = appRouter.createCaller(adminContext());
    const publicCaller = appRouter.createCaller(publicContext());
    const programIds: number[] = [];
    const reviewerIds: number[] = [];
    const connection = await mysql.createConnection(databaseUrl);

    try {
      const scoredProgram = await admin.programs.create({
        name: `E2E Scored Program ${suffix}`,
        slug: scoredSlug,
        description: 'Temporary acceptance program',
        programType: 'leadership',
        year: 2099,
      });
      programIds.push(scoredProgram.id);
      await admin.programs.update({
        id: scoredProgram.id,
        status: 'open',
        formConfig: {
          fields: [
            { id: 'full_name', type: 'text', label: 'Full Name', required: true },
            { id: 'essay', type: 'textarea', label: 'Essay', required: true },
          ],
        },
        scoringConfig: {
          criteria: [
            { id: 'leadership', name: 'Leadership', maxScore: 10 },
            { id: 'impact', name: 'Community Impact', maxScore: 5 },
          ],
          maxTotalScore: 15,
        },
        emailConfig: { confirmationEnabled: false, reviewerNotificationEnabled: false, statusUpdateEnabled: false },
        settings: {
          applicationDeadline: '2099-12-31',
          blindReview: true,
          blindReviewEnabled: true,
          scoreEditingEnabled: true,
          reviewDeadlineEnabled: false,
          mandatoryCommentsEnabled: true,
          minScoreForComment: 4,
          documentUploadsEnabled: false,
        },
      });

      await expect(publicCaller.applications.submit({
        programSlug: scoredSlug,
        formData: { full_name: 'Missing Essay' },
        applicantName: 'Missing Essay',
      })).rejects.toThrow('Required field missing: Essay');

      const scoredApplication = await publicCaller.applications.submit({
        programSlug: scoredSlug,
        formData: { full_name: 'Acceptance Applicant', essay: 'A complete response.' },
        applicantName: 'Acceptance Applicant',
      });
      expect(scoredApplication.waitlisted).toBe(false);

      const reviewerOne = await admin.reviewers.create({ name: `E2E Reviewer One ${suffix}`, email: `e2e-reviewer-one-${suffix}@example.com` });
      const reviewerTwo = await admin.reviewers.create({ name: `E2E Reviewer Two ${suffix}`, email: `e2e-reviewer-two-${suffix}@example.com` });
      reviewerIds.push(reviewerOne.id, reviewerTwo.id);
      await admin.assignments.assign({ reviewerId: reviewerOne.id, applicationId: scoredApplication.id, programId: scoredProgram.id });
      await admin.assignments.assign({ reviewerId: reviewerTwo.id, applicationId: scoredApplication.id, programId: scoredProgram.id });

      const reviewerOneCaller = appRouter.createCaller(publicContext());
      const blindView = await reviewerOneCaller.reviewer.getApplication({ token: reviewerOne.accessToken, applicationId: scoredApplication.id });
      expect(blindView.application.applicantName).toBe(`Applicant #${scoredApplication.applicationNumber}`);
      expect(blindView.application.applicantEmail).toBeUndefined();

      await reviewerOneCaller.reviewer.submitScore({
        token: reviewerOne.accessToken,
        applicationId: scoredApplication.id,
        criteriaScores: [
          { criteriaId: 'leadership', score: 8 },
          { criteriaId: 'impact', score: 4 },
        ],
        comments: 'Initial review',
      });
      await reviewerOneCaller.reviewer.submitScore({
        token: reviewerTwo.accessToken,
        applicationId: scoredApplication.id,
        criteriaScores: [
          { criteriaId: 'leadership', score: 7 },
          { criteriaId: 'impact', score: 3, comment: 'Additional evidence would strengthen this response.' },
        ],
        comments: 'Second independent review',
      });
      await reviewerOneCaller.reviewer.submitScore({
        token: reviewerOne.accessToken,
        applicationId: scoredApplication.id,
        criteriaScores: [
          { criteriaId: 'leadership', score: 9 },
          { criteriaId: 'impact', score: 5 },
        ],
        comments: 'Edited before the deadline',
      });

      const scoredDetail = await admin.applications.getById({ id: scoredApplication.id });
      expect(scoredDetail?.scores).toHaveLength(2);
      expect(scoredDetail?.reviewCount).toBe(2);
      expect(Number(scoredDetail?.averageScore)).toBe(12);

      const registrationProgram = await admin.programs.create({
        name: `E2E Registration Program ${suffix}`,
        slug: registrationSlug,
        description: 'Temporary registration acceptance program',
        programType: 'registration',
        year: 2099,
      });
      programIds.push(registrationProgram.id);
      await admin.programs.update({
        id: registrationProgram.id,
        status: 'open',
        formConfig: {
          fields: [
            { id: 'contact_name', type: 'text', label: 'Contact Name', required: true },
            { id: 'ticket_count', type: 'number', label: 'Tickets', required: true, validation: { min: 1, max: 8 } },
          ],
        },
        emailConfig: { confirmationEnabled: false, statusUpdateEnabled: false },
        settings: {
          applicationDeadline: '2099-12-31',
          maxCapacity: 1,
          waitlistEnabled: true,
          autoWaitlistPromotionEnabled: false,
          participantFormEnabled: true,
          checkInEnabled: true,
          tshirtTrackingEnabled: true,
          noShowTrackingEnabled: true,
          ticketFieldId: 'ticket_count',
          documentUploadsEnabled: false,
        },
      });

      const approvedRequest = await publicCaller.applications.submit({
        programSlug: registrationSlug,
        formData: { contact_name: 'Approved Request', ticket_count: 1 },
        applicantName: 'Approved Request',
      });
      await admin.applications.updateStatus({ id: approvedRequest.id, status: 'accepted' });
      const approvedDetail = await admin.applications.getById({ id: approvedRequest.id });
      expect(approvedDetail?.participantAccessToken).toMatch(/^[A-Za-z0-9_-]{32,}$/);

      const participantContext = await publicCaller.participantForms.getAccessContext({ token: approvedDetail!.participantAccessToken });
      expect(participantContext.applicationNumber).toBe(approvedRequest.applicationNumber);
      expect(participantContext.alreadySubmitted).toBe(false);
      await publicCaller.participantForms.submit({
        token: approvedDetail!.participantAccessToken,
        participantName: 'Approved Participant',
        tshirtSize: 'L',
        plusOne: true,
        plusOneName: 'Guest Participant',
        plusOneTshirtSize: 'M',
        namePronunciation: 'uh-PROOVD',
        dietaryRestrictions: 'None',
        specialNeeds: 'None',
        isCommander: true,
        rank: 'Major',
        branch: 'Air Force',
        yearsOfService: '12',
        attendees: [
          { name: 'Approved Participant', tshirtSize: 'L', relationship: 'self' },
          { name: 'Guest Participant', tshirtSize: 'M', relationship: 'guest' },
        ],
      });
      await expect(publicCaller.participantForms.submit({
        token: approvedDetail!.participantAccessToken,
        participantName: 'Duplicate Participant',
      })).rejects.toThrow('Participant information has already been submitted.');

      const participantRows = await admin.participantForms.getByApplication({ applicationId: approvedRequest.id });
      expect(participantRows).toHaveLength(1);
      expect(participantRows[0].rank).toBe('Major');
      expect(participantRows[0].namePronunciation).toBe('uh-PROOVD');

      await admin.checkins.updateStatus({ applicationId: approvedRequest.id, programId: registrationProgram.id, status: 'picked_up' });
      await admin.checkins.updateStatus({ applicationId: approvedRequest.id, programId: registrationProgram.id, status: 'approved' });
      await admin.checkins.updateStatus({ applicationId: approvedRequest.id, programId: registrationProgram.id, status: 'no_show_communicated', notes: 'Notified staff.' });
      await admin.checkins.updateStatus({ applicationId: approvedRequest.id, programId: registrationProgram.id, status: 'no_show', notes: 'No contact received.' });
      const checkinRows = await admin.checkins.getByProgram({ programId: registrationProgram.id });
      expect(checkinRows.find(row => row.applicationId === approvedRequest.id)?.status).toBe('no_show');
      expect(checkinRows.find(row => row.applicationId === approvedRequest.id)?.notes).toBe('No contact received.');

      const waitlistedRequest = await publicCaller.applications.submit({
        programSlug: registrationSlug,
        formData: { contact_name: 'Waitlisted Request', ticket_count: 1 },
        applicantName: 'Waitlisted Request',
      });
      expect(waitlistedRequest.waitlisted).toBe(true);
      const waitingEntries = await admin.waitlist.getByProgram({ programId: registrationProgram.id });
      const waitingEntry = waitingEntries.find(entry => entry.applicationId === waitlistedRequest.id);
      expect(waitingEntry?.status).toBe('waiting');
      await admin.waitlist.promote({ id: waitingEntry!.id });
      const promotedApplication = await admin.applications.getById({ id: waitlistedRequest.id });
      const promotedEntries = await admin.waitlist.getByProgram({ programId: registrationProgram.id });
      expect(promotedApplication?.status).toBe('accepted');
      expect(promotedEntries.find(entry => entry.id === waitingEntry!.id)?.status).toBe('promoted');

      const statusPortal = await publicCaller.applicantPortal.checkStatus({ applicationNumber: waitlistedRequest.applicationNumber });
      expect(statusPortal.status).toBe('accepted');

      const scoredExport = await admin.applications.exportData({ programId: scoredProgram.id });
      expect(scoredExport.applications.some(application => application.id === scoredApplication.id)).toBe(true);
      expect(scoredExport.scores.filter(score => score.applicationId === scoredApplication.id)).toHaveLength(2);
      expect(scoredExport.scores.every(score => Boolean(score.reviewerName))).toBe(true);

      const eventExport = await admin.applications.exportData({ programId: registrationProgram.id });
      expect(eventExport.participantForms.some(form => form.applicationId === approvedRequest.id)).toBe(true);
      expect(eventExport.checkins.some(row => row.applicationId === approvedRequest.id)).toBe(true);
      expect(eventExport.waitlistEntries.some(row => row.applicationId === waitlistedRequest.id && row.status === 'promoted')).toBe(true);
    } finally {
      if (programIds.length > 0) {
        const placeholders = programIds.map(() => '?').join(',');
        const params = programIds;
        for (const table of [
          'reviewer_reminders',
          'scores',
          'reviewer_assignments',
          'participant_forms',
          'checkins',
          'waitlist',
          'application_documents',
          'applicant_flags',
          'interviews',
          'archives',
          'email_logs',
        ]) {
          await connection.execute(`DELETE FROM ${table} WHERE programId IN (${placeholders})`, params);
        }
        await connection.execute(`DELETE FROM applications WHERE programId IN (${placeholders})`, params);
        await connection.execute(`DELETE FROM programs WHERE id IN (${placeholders})`, params);
      }
      if (reviewerIds.length > 0) {
        const placeholders = reviewerIds.map(() => '?').join(',');
        await connection.execute(`DELETE FROM reviewers WHERE id IN (${placeholders})`, reviewerIds);
      }
      await connection.end();
    }
  }, 60_000);
});
