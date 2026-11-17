/**
 * Seeds the database with synthetic leads so the admin page has something
 * realistic to show. Every name, number and email here is made up.
 *
 *   npm run seed            add 32 sample leads
 *   npm run seed -- --reset wipe the leads table first
 */
import { readFileSync } from 'node:fs';
import { openDatabase, createLeadRepository } from '../src/db.js';
import { settings } from '../src/settings.js';
import { calculateEstimate, addOnsForService } from '../../shared/pricing.js';

const config = JSON.parse(readFileSync(settings.pricingPath, 'utf8'));
const db = openDatabase(settings.dbPath);
const leads = createLeadRepository(db);

if (process.argv.includes('--reset')) {
  db.exec("DELETE FROM leads; DELETE FROM sqlite_sequence WHERE name = 'leads';");
}

// Small deterministic PRNG so every seed run looks the same.
let state = 20261120;
const random = () => ((state = (state * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = (list) => list[Math.floor(random() * list.length)];

const people = [
  ['Ritu Sharma', 'en'], ['Arjun Mehta', 'en'], ['Sunita Devi', 'hi'], ['Kavya Iyer', 'en'],
  ['Rahul Verma', 'en'], ['Neha Kapoor', 'en'], ['Mohammed Irfan', 'en'], ['Pooja Nair', 'en'],
  ['Vikram Rathore', 'hi'], ['Ananya Bose', 'en'], ['Sanjay Gupta', 'hi'], ['Priya Reddy', 'en'],
  ['Farah Khan', 'en'], ['Harpreet Kaur', 'hi'], ['Aditya Kulkarni', 'en'], ['Meera Joshi', 'en'],
  ['Rakesh Yadav', 'hi'], ['Lakshmi Subramanian', 'en'], ['Deepak Chauhan', 'hi'], ['Isha Malhotra', 'en'],
  ['Karthik Raman', 'en'], ['Shabnam Ali', 'hi'], ['Rohan Desai', 'en'], ['Aparna Menon', 'en'],
  ['Gaurav Singhal', 'en'], ['Nisha Agarwal', 'hi'], ['Siddharth Rao', 'en'], ['Tanvi Shah', 'en'],
  ['Manoj Tiwari', 'hi'], ['Divya Pillai', 'en'], ['Amit Saxena', 'en'], ['Rekha Mishra', 'hi'],
];

const notesByService = {
  elderly: ['Father is 82, needs help walking to the bathroom at night.', 'Mother lives alone, we are abroad.', ''],
  dementia: ['Grandmother wanders in the evening, needs someone patient.', 'Diagnosed last year, mild stage.', ''],
  baby: ['Twins due next month, need help for the first weeks.', 'Prefer someone who speaks Tamil.', ''],
  post_surgery: ['Knee replacement on the 12th, discharge in 3 days.', 'Hip fracture surgery, needs dressing daily.', ''],
};

const statuses = ['new', 'new', 'new', 'contacted', 'contacted', 'converted', 'lost'];
const now = Date.now();

for (const [i, [name, language]] of people.entries()) {
  const service = pick(config.services).id;
  const hours = pick([8, 12, 12, 24, 24]);
  const shiftType = hours === 8 ? 'day' : pick(['day', 'live_in', 'live_in']);
  const plan = {
    service,
    city: pick(config.cities).id,
    hours,
    shiftType,
    durationId: pick(['1w', '2w', '1m', '1m', '3m', '6m']),
    addOns: {},
  };
  for (const addOn of addOnsForService(config, service)) {
    if (random() < 0.3) plan.addOns[addOn.id] = addOn.unit === 'visit' ? { perWeek: addOn.frequency.default } : {};
  }

  const estimate = calculateEstimate(plan, config);
  const createdAt = new Date(now - Math.floor(random() * 21 * 24 * 3600 * 1000)).toISOString();
  const handle = name.toLowerCase().replace(/[^a-z]+/g, '.');

  leads.create({
    name,
    phone: `+91${pick(['98', '97', '99', '88', '70', '63'])}${String(10000000 + Math.floor(random() * 89999999))}`,
    email: `${handle}${i}@example.com`,
    callTime: pick(['morning', 'afternoon', 'evening', 'anytime']),
    notes: pick(notesByService[service]),
    service,
    city: plan.city,
    hours,
    shiftType,
    days: estimate.days,
    planJson: JSON.stringify(plan),
    estimateJson: JSON.stringify(estimate),
    total: estimate.total,
    perMonth: estimate.perMonth,
    configVersion: config.version,
    language,
    status: pick(statuses),
    createdAt,
  });
}

console.log(`Seeded ${people.length} synthetic leads into ${settings.dbPath}`);
