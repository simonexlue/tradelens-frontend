import type { TradeOutcome, Session } from "./trades";

export type FilterState = {
  outcomes: TradeOutcome[];
  sessions: Session[];
  strategies: string[];
  symbols: string[];
  accounts: string[];
};

export type FetchTradesOpts = {
  limit: number;
  cursor: string | null;
  filters: FilterState;
};

export type FilterOptions = {
  outcomes: TradeOutcome[];
  sessions: Session[];
  strategies: string[];
  symbols: string[];
  accounts: AccountFilterOption[];
}

export type AccountFilterOption = {
  id: string
  label: string
}