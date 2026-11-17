const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** ₹1,23,456 (Indian digit grouping). */
export const formatINR = (amount) => inr.format(Math.round(amount));

export const pick = (label, lang) => (label ? label[lang] || label.en : '');
