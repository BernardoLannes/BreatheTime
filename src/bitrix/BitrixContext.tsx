import { createContext, useContext } from 'react';
import { BitrixStatus } from '../types/timer';

export interface BitrixActionResult {
  ok: boolean;
  message?: string;
}

export interface BitrixContextValue {
  status: BitrixStatus;
  openSettings: () => void;
  linkTask: (taskId: string, bitrixTaskId: number | undefined) => void;
  logDivision: (divisionId: string) => Promise<BitrixActionResult>;
  logTask: (taskId: string) => Promise<BitrixActionResult>;
  logHistoryEntry: (entryId: string) => Promise<BitrixActionResult>;
}

const noop = async (): Promise<BitrixActionResult> => ({ ok: false });

export const BitrixContext = createContext<BitrixContextValue>({
  status: { connected: false },
  openSettings: () => undefined,
  linkTask: () => undefined,
  logDivision: noop,
  logTask: noop,
  logHistoryEntry: noop,
});

export const useBitrix = () => useContext(BitrixContext);
