import { FilterState } from "@/types/filters";

export type TradeOutcome = "win" | "loss" | "breakeven" | "early_exit";
export type Session = "London" | "NY" | "Break" | "Asia";
export type TradeSide = "buy" | "sell";

export type UpdateTradePayload = {
  note?: string
  takenAt?: string | null
  exitAt?: string | null
  outcome?: TradeOutcome | null
  strategies?: string[]
  mistakes?: string[]
  side?: TradeSide | null
  entryPrice?: number | null
  exitPrice?: number | null
  contracts?: number | null
  pnl?: number | null
  symbol?: string | null
}

export type ImageRec = {
  id: string;
  s3_key: string;
  width?: number;
  height?: number;
  created_at?: string;
};

export type TradeAnalysis = {
  what_happened: string;
  why_result: string;
  tips: string[];
  created_at?: string;
};

export type TradeListItem = {
  id: string;
  note: string | null;
  created_at: string;
  taken_at: string | null;
  outcome: TradeOutcome | null;
  session: Session | null;
  strategies: string[] | null;
  pnl: number | null;
  symbol: string | null;
  images: { s3_key: string; width?: number; height?: number }[]; // thumbnail only
  image_count: number;
};

export type TradeDetail = {
  id: string;
  note: string | null;
  created_at: string;

  taken_at?: string | null;
  exit_at?: string | null;

  outcome?: TradeOutcome | null;
  strategies?: string[] | null;
  session?: Session | null;
  mistakes?: string[] | null;

  images: ImageRec[];
  analysis?: TradeAnalysis | null;
  side?: TradeSide | null;
  entry_price?: number | null;
  exit_price?: number | null;
  contracts?: number | null;
  pnl?: number | null;
  symbol?: string | null;
};

export type CreateTradePayload = {
  note?: string;
  takenAt?: string | null;
  exitAt?: string | null;
  outcome?: TradeOutcome;
  strategies?: string[];
  mistakes?: string[];
  side?: TradeSide;
  entryPrice?: number;
  exitPrice?: number;
  contracts?: number;
  pnl?: number;
  symbol?: string;
  accountId?: string | null
};

export type FetchTradesOpts = {
  limit: number;
  cursor: string | null;
  filters: FilterState;
};