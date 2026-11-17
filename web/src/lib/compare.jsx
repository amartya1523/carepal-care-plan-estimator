import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { load, save } from './storage.js';

const CompareContext = createContext(null);

/** Two saved plan slots (A and B) for the side-by-side comparison. */
export function CompareProvider({ children }) {
  const [slots, setSlots] = useState(() => load('carepal.compare', { A: null, B: null }));
  useEffect(() => save('carepal.compare', slots), [slots]);

  const value = useMemo(() => ({
    slots,
    count: Number(Boolean(slots.A)) + Number(Boolean(slots.B)),
    saveTo: (slot, plan) => setSlots((s) => ({ ...s, [slot]: structuredClone(plan) })),
    clear: (slot) => setSlots((s) => ({ ...s, [slot]: null })),
  }), [slots]);

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export const useCompare = () => useContext(CompareContext);
