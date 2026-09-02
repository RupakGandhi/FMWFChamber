// Seed script to create demo programs for FMWF Chamber
// Run with: node scripts/seed-programs.mjs

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
const PRODUCTION_SEED = process.env.PRODUCTION_SEED === 'true';
const PROGRAM_YEAR = Number(process.env.PROGRAM_YEAR || 2026);
const INITIAL_STATUS = PRODUCTION_SEED ? 'draft' : 'open';

if (!Number.isInteger(PROGRAM_YEAR) || PROGRAM_YEAR < 2026 || PROGRAM_YEAR > 2100) {
  console.error('PROGRAM_YEAR must be an integer between 2026 and 2100');
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// Leadership FMWF Form Configuration
const leadershipFormConfig = {
  fields: [
    { id: 'heading_personal', type: 'heading', label: 'Personal Information' },
    { id: 'full_name', type: 'text', label: 'Full Name', required: true, placeholder: 'Enter your full name' },
    { id: 'email', type: 'email', label: 'Email Address', required: true, placeholder: 'your.email@example.com' },
    { id: 'phone', type: 'phone', label: 'Phone Number', required: true, placeholder: '(701) 555-1234' },
    { id: 'address', type: 'textarea', label: 'Mailing Address', required: true },
    
    { id: 'heading_employment', type: 'heading', label: 'Employment Information' },
    { id: 'employer', type: 'text', label: 'Current Employer', required: true },
    { id: 'job_title', type: 'text', label: 'Job Title', required: true },
    { id: 'years_employed', type: 'number', label: 'Years with Current Employer', required: true },
    { id: 'supervisor_name', type: 'text', label: 'Supervisor Name', required: true },
    { id: 'supervisor_email', type: 'email', label: 'Supervisor Email', required: true },
    
    { id: 'heading_background', type: 'heading', label: 'Background & Experience' },
    { id: 'education', type: 'textarea', label: 'Educational Background', required: true, helpText: 'List your degrees, certifications, and relevant training' },
    { id: 'community_involvement', type: 'textarea', label: 'Community Involvement', required: true, helpText: 'Describe your current and past community involvement' },
    { id: 'leadership_experience', type: 'textarea', label: 'Leadership Experience', required: true, helpText: 'Describe positions where you have demonstrated leadership' },
    
    { id: 'heading_essays', type: 'heading', label: 'Essay Questions' },
    { id: 'why_leadership', type: 'textarea', label: 'Why do you want to participate in Leadership FMWF?', required: true, helpText: 'Explain your motivation and what you hope to gain (300-500 words)' },
    { id: 'community_impact', type: 'textarea', label: 'How do you plan to use this experience to impact our community?', required: true, helpText: 'Describe your vision for community involvement after the program (300-500 words)' },
    { id: 'leadership_challenge', type: 'textarea', label: 'Describe a leadership challenge you have faced and how you handled it.', required: true, helpText: 'Provide a specific example (200-400 words)' },
    
    { id: 'heading_logistics', type: 'heading', label: 'Program Logistics' },
    { id: 'employer_support', type: 'radio', label: 'Does your employer support your participation?', required: true, options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'pending', label: 'Pending approval' }] },
    { id: 'attendance_commitment', type: 'checkbox', label: 'I commit to attending all program sessions', required: true, options: [{ value: 'confirmed', label: 'I understand and commit to full attendance' }] },
    { id: 'how_heard', type: 'select', label: 'How did you hear about Leadership FMWF?', required: true, options: [{ value: 'alumni', label: 'Leadership FMWF Alumni' }, { value: 'employer', label: 'Employer' }, { value: 'chamber', label: 'Chamber Website/Communications' }, { value: 'social', label: 'Social Media' }, { value: 'other', label: 'Other' }] },
  ],
  submitButtonText: 'Submit Application',
  confirmationMessage: 'Thank you for applying to Leadership FMWF! We will review your application and contact you regarding next steps.',
};

const leadershipScoringConfig = {
  criteria: [
    { id: 'leadership_potential', name: 'Leadership Potential', description: 'Demonstrates ability to lead and inspire others', maxScore: 10 },
    { id: 'community_commitment', name: 'Community Commitment', description: 'Shows genuine interest in community involvement', maxScore: 10 },
    { id: 'professional_growth', name: 'Professional Growth', description: 'Clear goals for professional development', maxScore: 10 },
    { id: 'essay_quality', name: 'Essay Quality', description: 'Well-written, thoughtful responses', maxScore: 10 },
    { id: 'diversity_perspective', name: 'Diversity of Perspective', description: 'Brings unique viewpoint to the cohort', maxScore: 10 },
  ],
  maxTotalScore: 50,
  passingScore: 30,
};

// Chamber Choice Awards Form Configuration
const awardsFormConfig = {
  fields: [
    { id: 'heading_nominator', type: 'heading', label: 'Nominator Information' },
    { id: 'nominator_name', type: 'text', label: 'Your Name', required: true },
    { id: 'nominator_email', type: 'email', label: 'Your Email', required: true },
    { id: 'nominator_phone', type: 'phone', label: 'Your Phone', required: false },
    { id: 'nominator_company', type: 'text', label: 'Your Company/Organization', required: false },
    
    { id: 'heading_nominee', type: 'heading', label: 'Nominee Information' },
    { id: 'award_category', type: 'select', label: 'Award Category', required: true, options: [
      { value: 'small_business', label: 'Small Business of the Year (1-25 employees)' },
      { value: 'large_business', label: 'Large Business of the Year (26+ employees)' },
      { value: 'new_business', label: 'New Business of the Year' },
      { value: 'nonprofit', label: 'Nonprofit of the Year' },
      { value: 'young_professional', label: 'Young Professional of the Year' },
      { value: 'community_impact', label: 'Community Impact Award' },
    ]},
    { id: 'nominee_business', type: 'text', label: 'Business/Organization Name', required: true },
    { id: 'nominee_contact', type: 'text', label: 'Primary Contact Name', required: true },
    { id: 'nominee_email', type: 'email', label: 'Nominee Email', required: true },
    { id: 'nominee_phone', type: 'phone', label: 'Nominee Phone', required: true },
    { id: 'nominee_address', type: 'textarea', label: 'Business Address', required: true },
    { id: 'nominee_website', type: 'text', label: 'Website', required: false },
    
    { id: 'heading_nomination', type: 'heading', label: 'Nomination Details' },
    { id: 'years_in_business', type: 'number', label: 'Years in Business', required: true },
    { id: 'employee_count', type: 'number', label: 'Number of Employees', required: true },
    { id: 'chamber_member', type: 'radio', label: 'Is the nominee a Chamber member?', required: true, options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'unknown', label: 'Unknown' }] },
    { id: 'nomination_reason', type: 'textarea', label: 'Why does this business/individual deserve this award?', required: true, helpText: 'Provide specific examples and achievements (500-1000 words)' },
    { id: 'community_involvement', type: 'textarea', label: 'Describe their community involvement', required: true, helpText: 'Include volunteer work, sponsorships, community programs, etc.' },
    { id: 'achievements', type: 'textarea', label: 'Notable achievements in the past year', required: true },
    { id: 'supporting_info', type: 'textarea', label: 'Any additional supporting information', required: false },
  ],
  submitButtonText: 'Submit Nomination',
  confirmationMessage: 'Thank you for your nomination! All nominations will be reviewed by our selection committee.',
};

const awardsScoringConfig = {
  criteria: [
    { id: 'business_excellence', name: 'Business Excellence', description: 'Demonstrates outstanding business practices and success', maxScore: 10 },
    { id: 'community_impact', name: 'Community Impact', description: 'Positive impact on the local community', maxScore: 10 },
    { id: 'innovation', name: 'Innovation', description: 'Shows creativity and innovation in their field', maxScore: 10 },
    { id: 'leadership', name: 'Leadership', description: 'Demonstrates leadership in their industry', maxScore: 10 },
    { id: 'nomination_quality', name: 'Nomination Quality', description: 'Strength and detail of the nomination', maxScore: 10 },
  ],
  maxTotalScore: 50,
  passingScore: 25,
};

// Military Appreciation Night Form Configuration
const militaryFormConfig = {
  fields: [
    { id: 'heading_military', type: 'heading', label: 'Military Service Information' },
    { id: 'service_branch', type: 'select', label: 'Branch of Service', required: true, options: [
      { value: 'army', label: 'U.S. Army' },
      { value: 'navy', label: 'U.S. Navy' },
      { value: 'air_force', label: 'U.S. Air Force' },
      { value: 'marines', label: 'U.S. Marine Corps' },
      { value: 'coast_guard', label: 'U.S. Coast Guard' },
      { value: 'space_force', label: 'U.S. Space Force' },
      { value: 'national_guard', label: 'National Guard' },
      { value: 'reserves', label: 'Reserves' },
    ]},
    { id: 'service_status', type: 'radio', label: 'Service Status', required: true, options: [
      { value: 'active', label: 'Active Duty' },
      { value: 'veteran', label: 'Veteran' },
      { value: 'retired', label: 'Retired' },
      { value: 'reserve', label: 'Reserve/Guard' },
    ]},
    { id: 'years_service', type: 'number', label: 'Years of Service', required: true },
    
    { id: 'heading_tickets', type: 'heading', label: 'Event Registration' },
    { id: 'ticket_count', type: 'select', label: 'Number of Tickets Needed', required: true, options: [
      { value: '1', label: '1 ticket (just me)' },
      { value: '2', label: '2 tickets' },
      { value: '3', label: '3 tickets' },
      { value: '4', label: '4 tickets' },
      { value: '5', label: '5 tickets' },
      { value: '6+', label: '6 or more tickets' },
    ]},
    { id: 'guest_names', type: 'textarea', label: 'Names of Guests', required: false, helpText: 'Please list the names of all guests attending with you' },
    { id: 'dietary_restrictions', type: 'checkbox', label: 'Dietary Restrictions', required: false, options: [
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'gluten_free', label: 'Gluten-Free' },
      { value: 'dairy_free', label: 'Dairy-Free' },
      { value: 'nut_allergy', label: 'Nut Allergy' },
      { value: 'other', label: 'Other (please specify in comments)' },
    ]},
    { id: 'special_needs', type: 'textarea', label: 'Special Accommodations Needed', required: false, helpText: 'Wheelchair access, hearing assistance, etc.' },
    
    { id: 'heading_additional', type: 'heading', label: 'Additional Information' },
    { id: 'how_heard', type: 'select', label: 'How did you hear about this event?', required: true, options: [
      { value: 'chamber', label: 'Chamber Communications' },
      { value: 'social', label: 'Social Media' },
      { value: 'friend', label: 'Friend/Family' },
      { value: 'employer', label: 'Employer' },
      { value: 'military_org', label: 'Military Organization' },
      { value: 'other', label: 'Other' },
    ]},
    { id: 'comments', type: 'textarea', label: 'Additional Comments', required: false },
  ],
  submitButtonText: 'Register for Event',
  confirmationMessage: 'Thank you for registering for Military Appreciation Night! You will receive a confirmation email with event details.',
};

// No scoring for registration-type programs
const militaryScoringConfig = null;

// Insert programs
async function seedPrograms() {
  try {
    console.log('Seeding programs...');
    
    // Check if programs already exist
    const [existing] = await connection.execute('SELECT COUNT(*) as count FROM programs');
    if (existing[0].count > 0) {
      console.log('Programs already exist, skipping seed');
      await connection.end();
      return;
    }

    // Leadership FMWF
    await connection.execute(
      `INSERT INTO programs (name, slug, description, programType, status, year, formConfig, scoringConfig, settings, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        `Leadership FMWF - Class of ${PROGRAM_YEAR}`,
        `leadership-fmwf-${PROGRAM_YEAR}`,
        'A premier 9-month leadership development program connecting emerging leaders with community opportunities. Applications are reviewed by a selection committee using blind review.',
        'leadership',
        INITIAL_STATUS,
        PROGRAM_YEAR,
        JSON.stringify(leadershipFormConfig),
        JSON.stringify(leadershipScoringConfig),
        JSON.stringify({
          blindReview: true,
          blindReviewEnabled: true,
          maxReviewersPerApplication: 12,
          reviewDeadlineEnabled: false,
          scoreEditingEnabled: true,
          mandatoryCommentsEnabled: true,
          reviewerRemindersEnabled: true,
          applicationDeadline: PRODUCTION_SEED ? undefined : '2026-09-15',
          documentUploadsEnabled: false,
        }),
      ]
    );
    console.log('✓ Leadership FMWF program created');

    // Chamber Choice Awards
    await connection.execute(
      `INSERT INTO programs (name, slug, description, programType, status, year, formConfig, scoringConfig, settings, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        `Chamber Choice Awards ${PROGRAM_YEAR}`,
        `chamber-choice-awards-${PROGRAM_YEAR}`,
        'Recognize outstanding businesses and individuals who make our community exceptional. Nominate a deserving business or professional today!',
        'awards',
        INITIAL_STATUS,
        PROGRAM_YEAR,
        JSON.stringify(awardsFormConfig),
        JSON.stringify(awardsScoringConfig),
        JSON.stringify({
          blindReview: false,
          blindReviewEnabled: false,
          maxReviewersPerApplication: 5,
          reviewDeadlineEnabled: false,
          scoreEditingEnabled: true,
          mandatoryCommentsEnabled: true,
          reviewerRemindersEnabled: true,
          applicationDeadline: PRODUCTION_SEED ? undefined : '2026-10-31',
          documentUploadsEnabled: false,
        }),
      ]
    );
    console.log('✓ Chamber Choice Awards program created');

    // Military Appreciation Night
    await connection.execute(
      `INSERT INTO programs (name, slug, description, programType, status, year, formConfig, scoringConfig, settings, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        `Military Appreciation Night ${PROGRAM_YEAR}`,
        `military-appreciation-night-${PROGRAM_YEAR}`,
        'Register your family for our annual event honoring military service members and their families. Free admission for all military personnel and their guests.',
        'registration',
        INITIAL_STATUS,
        PROGRAM_YEAR,
        JSON.stringify(militaryFormConfig),
        null,
        JSON.stringify({
          blindReview: false,
          maxReviewersPerApplication: 0,
          applicationDeadline: PRODUCTION_SEED ? undefined : '2026-11-15',
          maxCapacity: 1000,
          waitlistEnabled: true,
          autoWaitlistPromotionEnabled: false,
          checkInEnabled: true,
          tshirtTrackingEnabled: true,
          participantFormEnabled: true,
          noShowTrackingEnabled: true,
          ticketCapacityThreshold: 1000,
          ticketFieldId: 'ticket_count',
          documentUploadsEnabled: false,
        }),
      ]
    );
    console.log('✓ Military Appreciation Night program created');

    console.log('\\nAll programs seeded successfully!');
  } catch (error) {
    console.error('Error seeding programs:', error);
  } finally {
    await connection.end();
  }
}

seedPrograms();
