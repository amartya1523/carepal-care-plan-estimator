import { findById } from '../../shared/pricing.js';
import { toCsv } from './csv.js';

const CALL_TIME_LABELS = {
  morning: 'Morning (9am-12pm)',
  afternoon: 'Afternoon (12pm-4pm)',
  evening: 'Evening (4pm-8pm)',
  anytime: 'Anytime',
};

export function leadsToCsv(leads, config) {
  const label = (list, id) => findById(list, id)?.label.en ?? id;
  const addOnSummary = (lead) => Object.entries(lead.plan.addOns ?? {})
    .map(([id, sel]) => {
      const name = label(config.addOns, id);
      return sel?.perWeek ? `${name} (${sel.perWeek}/week)` : name;
    })
    .join('; ');

  const columns = [
    { header: 'Reference', value: (l) => l.reference },
    { header: 'Created (IST)', value: (l) => formatIst(l.createdAt) },
    { header: 'Status', value: (l) => l.status },
    { header: 'Name', value: (l) => l.name },
    { header: 'Phone', value: (l) => l.phone },
    { header: 'Email', value: (l) => l.email },
    { header: 'Preferred call time', value: (l) => CALL_TIME_LABELS[l.callTime] ?? l.callTime },
    { header: 'Care type', value: (l) => label(config.services, l.service) },
    { header: 'City', value: (l) => label(config.cities, l.city) },
    { header: 'Hours per day', value: (l) => l.hours },
    { header: 'Shift', value: (l) => label(config.shiftTypes, l.shiftType) },
    { header: 'Duration (days)', value: (l) => l.days },
    { header: 'Add-ons', value: addOnSummary },
    { header: 'Subtotal (INR)', value: (l) => l.estimate.subtotal },
    { header: 'Discount (INR)', value: (l) => l.estimate.discount },
    { header: 'GST (INR)', value: (l) => l.estimate.gst.total },
    { header: 'Total incl. GST (INR)', value: (l) => l.total },
    { header: 'Per month (INR)', value: (l) => l.perMonth },
    { header: 'Family notes', value: (l) => l.notes },
    { header: 'Ops note', value: (l) => l.adminNote },
    { header: 'Language', value: (l) => l.language },
    { header: 'Price list version', value: (l) => l.configVersion },
  ];

  return toCsv(columns, leads);
}

function formatIst(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
