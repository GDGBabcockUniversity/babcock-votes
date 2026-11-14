import { reactive } from "sia-reactor";
import { PersistModule, TemporalModule, silence } from "sia-reactor/modules";
import { radialSweep as sweep } from "@/lib/utils";

export type Theme = "light" | "dark";

export interface BallotDraft {
  step: 1 | 2;
  selections: Record<string, string>;
  targetPositionId?: string | null;
}

export interface AppUI {
  theme?: Theme;
  sidebarOpen: boolean;
}

export interface AppStore {
  ui: AppUI;
  ballots: Record<string, BallotDraft>;
}

export const key = "babcock_votes",
  store = reactive<AppStore>({ ui: { sidebarOpen: true }, ballots: {} }),
  persist = new PersistModule({ key, throttle: 1000, cachePayload: true }).setup(store, "*"),
  temporals = new Map<string, TemporalModule>();

export const getSysTheme = () => (typeof window !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

export const toggleTheme = (val?: Theme | "auto") => (store.ui.theme = val === "auto" ? undefined : (val ?? (document.documentElement.classList.contains("dark") ? "light" : "dark")));

export const toggleSidebar = (bool?: boolean) => (store.ui.sidebarOpen = bool ?? !store.ui.sidebarOpen);

export const getBallot = (electionId: string) => store.ballots[electionId] ?? (silence(() => (store.ballots[electionId] = { selections: {}, step: 1, targetPositionId: null })), store.ballots[electionId]);

export const setBallotStep = (electionId: string, step: 1 | 2) => silence(() => (getBallot(electionId).step = step));

export const setBallotTargetPosition = (electionId: string, positionId: string | null) => silence(() => (getBallot(electionId).targetPositionId = positionId));

export const setBallotSelection = (electionId: string, positionId: string, candidateId: string, ballot = getBallot(electionId)) => (ballot.selections[positionId] === candidateId ? delete ballot.selections[positionId] : (ballot.selections[positionId] = candidateId));

export const clearBallotDraft = (electionId: string) => (silence(() => store.ballots?.[electionId] && delete store.ballots[electionId]), temporals.get(electionId)?.reset());

export const getBallotTemporal = (electionId: string) => {
  const cached = temporals.get(electionId);
  if (cached) return cached;
  const t = new TemporalModule({ whitelist: [`ballots.${electionId}.selections` as string] });
  return (store.use(t), persist.attach(t.state, `temporals.${electionId}.state`), temporals.set(electionId, t), t);
};

Object.keys(store.ballots).forEach(getBallotTemporal);

store.on("ui.theme", ({ value = getSysTheme() }, t = value === "dark", d = document.documentElement) => sweep(() => d.classList.toggle("dark", t), d.querySelector<HTMLElement>(`.theme-icon-${t ? "moon" : "sun"}`)!));

// if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") Object.entries({ store, persist, temporals }).forEach(([k, v]) => ((window as any)[k] = v));
