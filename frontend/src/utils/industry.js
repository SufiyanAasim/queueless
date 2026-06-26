import { getCustomQueues } from './queueRegistry.js';

export const INDUSTRY_PROFILES = {
  general: {
    name: 'General Office',
    services: [
      { id: 'general',      title: 'General Inquiry',  desc: 'Reception, info, walk-in support' },
      { id: 'consultation', title: 'Consultation',      desc: 'Advisor or specialist visit' },
      { id: 'transaction',  title: 'Transaction',       desc: 'Payment, deposit, account change' },
      { id: 'billing',      title: 'Billing & Payments',desc: 'Invoices, refunds, billing queries' },
      { id: 'support',      title: 'Help & Support',    desc: 'Complaints, follow-ups, assistance' },
    ],
  },
  bank: {
    name: 'Bank / Finance',
    services: [
      { id: 'new_account',      title: 'New Account',       desc: 'Open savings, current, or business account' },
      { id: 'loan',             title: 'Loan Application',  desc: 'Personal, home, or vehicle loan' },
      { id: 'forex',            title: 'Foreign Exchange',  desc: 'Currency conversion, remittance' },
      { id: 'card_services',    title: 'Card Services',     desc: 'Debit/credit card issues, PIN reset' },
      { id: 'priority_banking', title: 'Priority Banking',  desc: 'Premium / wealth customer desk' },
      { id: 'locker',           title: 'Locker Services',   desc: 'Safe deposit locker access' },
      { id: 'general',          title: 'General Banking',   desc: 'Deposits, withdrawals, general queries' },
    ],
  },
  medical: {
    name: 'Medical / Hospital',
    services: [
      { id: 'opd',            title: 'OPD / Doctor',     desc: 'General physician consultation' },
      { id: 'eye_specialist', title: 'Eye Specialist',   desc: 'Ophthalmology, vision tests' },
      { id: 'cardiology',     title: 'Cardiology',       desc: 'Heart & cardiovascular care' },
      { id: 'dental',         title: 'Dental',           desc: 'Dentist consultation & procedures' },
      { id: 'ent',            title: 'ENT',              desc: 'Ear, nose & throat specialist' },
      { id: 'dermatology',    title: 'Dermatology',      desc: 'Skin, hair & nail care' },
      { id: 'orthopedics',    title: 'Orthopedics',      desc: 'Bones, joints & musculoskeletal' },
      { id: 'pediatrics',     title: 'Pediatrics',       desc: 'Child & infant care' },
      { id: 'gynecology',     title: 'Gynecology',       desc: 'Women’s health & maternity' },
      { id: 'lab',            title: 'Lab Tests',        desc: 'Blood work, urine, diagnostics' },
      { id: 'pharmacy',       title: 'Pharmacy',         desc: 'Prescription pickup, medication' },
      { id: 'radiology',      title: 'Radiology',        desc: 'X-Ray, MRI, ultrasound' },
      { id: 'emergency',      title: 'Emergency',        desc: 'Urgent care — auto-priority' },
    ],
  },
  restaurant: {
    name: 'Restaurant / Dining',
    services: [
      { id: 'table_small',  title: 'Table (1-2)',  desc: 'Small table for 1 or 2 people' },
      { id: 'table_medium', title: 'Table (3-4)',  desc: 'Medium table for 3-4 people' },
      { id: 'table_large',  title: 'Table (5+)',   desc: 'Large table for 5 or more' },
      { id: 'reservation',  title: 'Reservation',  desc: 'Booked / reserved seating' },
      { id: 'takeaway',     title: 'Takeaway',     desc: 'Order pickup, no seating needed' },
      { id: 'bar',          title: 'Bar / Lounge', desc: 'Bar seating & drinks' },
    ],
  },
};

/** Map an admin-defined custom queue to the legacy service shape. */
function mapCustomQueue(q) {
  return {
    id: q.key,
    title: q.label,
    desc: q.prefix ? `Prefix ${q.prefix}` : '',
    prefix: q.prefix || null,
    capacity: q.capacity ?? null,
    avgServiceSeconds: q.avgServiceSeconds ?? null,
    workingHours: q.workingHours ?? null,
  };
}

/**
 * Active services/counters. Admin-defined custom queues take precedence over the
 * static industry profile; when none exist we fall back to the profile so legacy
 * deployments behave exactly as before.
 */
export function getServices(industry) {
  const custom = getCustomQueues();
  if (custom && custom.length) return custom.map(mapCustomQueue);
  return (INDUSTRY_PROFILES[industry] || INDUSTRY_PROFILES.general).services;
}

export function getServiceLabel(service, industry) {
  // Custom queues first, then the industry profile, then a humanised fallback.
  const custom = getCustomQueues();
  if (custom && custom.length) {
    const match = custom.find(q => q.key === service);
    if (match) return match.label;
  }
  const profile = (INDUSTRY_PROFILES[industry] || INDUSTRY_PROFILES.general).services;
  return profile.find(s => s.id === service)?.title
    || String(service || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function getIndustryName(industry) {
  return (INDUSTRY_PROFILES[industry] || INDUSTRY_PROFILES.general).name;
}
