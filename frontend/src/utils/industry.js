export const INDUSTRY_PROFILES = {
  general: {
    name: 'General Office',
    services: [
      { id: 'general',      title: 'General Inquiry',  desc: 'Reception, info, walk-in support' },
      { id: 'consultation', title: 'Consultation',      desc: 'Advisor or specialist visit' },
      { id: 'transaction',  title: 'Transaction',       desc: 'Payment, deposit, account change' },
    ],
  },
  bank: {
    name: 'Bank / Finance',
    services: [
      { id: 'new_account',   title: 'New Account',       desc: 'Open savings, current, or business account' },
      { id: 'loan',          title: 'Loan Application',  desc: 'Personal, home, or vehicle loan' },
      { id: 'forex',         title: 'Foreign Exchange',  desc: 'Currency conversion, remittance' },
      { id: 'card_services', title: 'Card Services',     desc: 'Debit/credit card issues, PIN reset' },
      { id: 'general',       title: 'General Banking',   desc: 'Deposits, withdrawals, general queries' },
    ],
  },
  medical: {
    name: 'Medical / Hospital',
    services: [
      { id: 'opd',       title: 'OPD / Doctor', desc: 'General physician consultation' },
      { id: 'lab',       title: 'Lab Tests',    desc: 'Blood work, urine, diagnostics' },
      { id: 'pharmacy',  title: 'Pharmacy',     desc: 'Prescription pickup, medication' },
      { id: 'radiology', title: 'Radiology',    desc: 'X-Ray, MRI, ultrasound' },
      { id: 'emergency', title: 'Emergency',    desc: 'Urgent care — auto-priority' },
    ],
  },
  restaurant: {
    name: 'Restaurant / Dining',
    services: [
      { id: 'table_small',  title: 'Table (1-2)',  desc: 'Small table for 1 or 2 people' },
      { id: 'table_medium', title: 'Table (3-4)',  desc: 'Medium table for 3-4 people' },
      { id: 'table_large',  title: 'Table (5+)',   desc: 'Large table for 5 or more' },
      { id: 'takeaway',     title: 'Takeaway',     desc: 'Order pickup, no seating needed' },
    ],
  },
};

export function getServices(industry) {
  return (INDUSTRY_PROFILES[industry] || INDUSTRY_PROFILES.general).services;
}

export function getServiceLabel(service, industry) {
  const services = getServices(industry);
  return services.find(s => s.id === service)?.title || service.replace(/_/g, ' ');
}

export function getIndustryName(industry) {
  return (INDUSTRY_PROFILES[industry] || INDUSTRY_PROFILES.general).name;
}
