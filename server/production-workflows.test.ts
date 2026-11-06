import { describe, expect, it } from 'vitest';
import { TRPCError } from '@trpc/server';
import {
  applicationDeadlineHasPassed,
  validateConfiguredForm,
  validateCriteriaScores,
} from './routers';
import { defaultTemplates } from './emailNotifications';
import type { FormConfig } from '../drizzle/schema';

describe('production application rules', () => {
  it('enforces an application deadline only after the configured Central date', () => {
    expect(applicationDeadlineHasPassed('2026-08-25', '2026-08-25')).toBe(false);
    expect(applicationDeadlineHasPassed('2026-08-25', '2026-08-26')).toBe(true);
    expect(applicationDeadlineHasPassed(undefined, '2026-08-26')).toBe(false);
  });

  it('rejects a missing required visible field', () => {
    const form: FormConfig = {
      fields: [{ id: 'full_name', type: 'text', label: 'Full Name', required: true }],
    };
    expect(() => validateConfiguredForm(form, {})).toThrowError(TRPCError);
    expect(() => validateConfiguredForm(form, { full_name: 'Setareh Campion' })).not.toThrow();
  });

  it('does not require a conditional field while its condition is hidden', () => {
    const form: FormConfig = {
      fields: [
        { id: 'has_guest', type: 'radio', label: 'Guest?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
        {
          id: 'guest_name',
          type: 'text',
          label: 'Guest Name',
          required: true,
          conditionalOn: { fieldId: 'has_guest', value: 'yes' },
        },
      ],
    };
    expect(() => validateConfiguredForm(form, { has_guest: 'no' })).not.toThrow();
    expect(() => validateConfiguredForm(form, { has_guest: 'yes' })).toThrow('Required field missing: Guest Name');
  });

  it('enforces configured numeric bounds on the server', () => {
    const form: FormConfig = {
      fields: [{
        id: 'tickets',
        type: 'number',
        label: 'Tickets',
        required: true,
        validation: { min: 1, max: 8 },
      }],
    };
    expect(() => validateConfiguredForm(form, { tickets: 0 })).toThrow('Tickets must be at least 1');
    expect(() => validateConfiguredForm(form, { tickets: 9 })).toThrow('Tickets must be no more than 8');
    expect(() => validateConfiguredForm(form, { tickets: 4 })).not.toThrow();
  });
});

describe('production reviewer score rules', () => {
  const program = {
    scoringConfig: {
      criteria: [
        { id: 'leadership', name: 'Leadership', maxScore: 10 },
        { id: 'community', name: 'Community', maxScore: 5 },
      ],
    },
  } as any;

  it('requires every configured criterion and rejects unknown criteria', () => {
    expect(() => validateCriteriaScores(program, [{ criteriaId: 'leadership', score: 8 }])).toThrow('A score is required for every scoring criterion.');
    expect(() => validateCriteriaScores(program, [
      { criteriaId: 'leadership', score: 8 },
      { criteriaId: 'unknown', score: 4 },
    ])).toThrow('An unknown scoring criterion was submitted.');
  });

  it('enforces each criterion score range', () => {
    expect(() => validateCriteriaScores(program, [
      { criteriaId: 'leadership', score: 11 },
      { criteriaId: 'community', score: 4 },
    ])).toThrow('Leadership must be between 0 and 10.');
    expect(() => validateCriteriaScores(program, [
      { criteriaId: 'leadership', score: 9 },
      { criteriaId: 'community', score: 4 },
    ])).not.toThrow();
  });
});

describe('active email workflows', () => {
  it('contains no Interview scheduling email template', () => {
    expect(Object.keys(defaultTemplates)).toEqual([
      'confirmation',
      'reviewerAssignment',
      'statusUpdate',
      'reviewerReminder',
    ]);
  });
});
