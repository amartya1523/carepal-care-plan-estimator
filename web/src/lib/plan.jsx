import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { calculateEstimate, validatePlan, findById } from '@shared/pricing.js';
import { useConfig } from './config.jsx';
import { load, save } from './storage.js';
import { decodePlan } from './plan-url.js';

export const EMPTY_PLAN = {
  service: null,
  city: null,
  hours: 12,
  shiftType: 'day',
  durationId: '1m',
  customDays: 45,
  addOns: {},
};

function reducer(plan, action) {
  switch (action.type) {
    case 'set': {
      const next = { ...plan, [action.field]: action.value };
      if (action.field === 'hours' && Number(action.value) === 8 && next.shiftType === 'live_in') {
        next.shiftType = 'day'; // live-in is only offered for 12h and 24h
      }
      return next;
    }
    case 'setService': {
      // Drop add-ons that do not apply to the new care type.
      const addOns = Object.fromEntries(
        Object.entries(plan.addOns).filter(([id]) => action.allowedAddOns.includes(id)),
      );
      return { ...plan, service: action.value, addOns };
    }
    case 'toggleAddOn': {
      const addOns = { ...plan.addOns };
      if (addOns[action.addOn.id]) delete addOns[action.addOn.id];
      else addOns[action.addOn.id] = action.addOn.unit === 'visit' ? { perWeek: action.addOn.frequency.default } : {};
      return { ...plan, addOns };
    }
    case 'setAddOnFrequency':
      return { ...plan, addOns: { ...plan.addOns, [action.id]: { perWeek: action.perWeek } } };
    case 'replace':
      return { ...EMPTY_PLAN, ...action.plan };
    case 'reset':
      return EMPTY_PLAN;
    default:
      throw new Error(`Unknown action ${action.type}`);
  }
}

const PlanContext = createContext(null);

function initialPlan() {
  const fromUrl = new URLSearchParams(window.location.search).get('plan');
  if (fromUrl) {
    const decoded = decodePlan(fromUrl);
    window.history.replaceState(null, '', window.location.pathname);
    if (decoded) return decoded;
  }
  return { ...EMPTY_PLAN, ...load('carepal.plan', {}) };
}

export function PlanProvider({ children }) {
  const { config } = useConfig();
  const [plan, dispatch] = useReducer(reducer, undefined, initialPlan);

  useEffect(() => save('carepal.plan', plan), [plan]);

  const value = useMemo(() => {
    const errors = config ? validatePlan(plan, config) : { config: 'loading' };
    const estimate = config && Object.keys(errors).length === 0 ? calculateEstimate(plan, config) : null;
    return { plan, dispatch, errors, estimate };
  }, [plan, config]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export const usePlan = () => useContext(PlanContext);

/** Human summary used by WhatsApp share, compare and the admin page. */
export function describePlan(plan, config, lang) {
  const label = (list, id) => {
    const item = findById(list, id);
    return item ? item.label[lang] || item.label.en : '—';
  };
  return {
    service: label(config.services, plan.service),
    city: label(config.cities, plan.city),
    shift: label(config.shiftTypes, plan.shiftType),
    duration: plan.durationId === 'custom' ? null : label(config.durations, plan.durationId),
    addOns: Object.keys(plan.addOns ?? {}).map((id) => label(config.addOns, id)),
  };
}
