export type TradeOutcome = "win" | "loss" | "breakeven" | "early_exit";
export type Session = "London" | "NY" | "Break" | "Asian";

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
  created_at?: string; // optional so you can ignore it in UI if you want
};

export type TradeListItem = {
  id: string;
  note: string | null;
  created_at: string;
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
  r_multiple?: number | null;
  strategy?: string | null;
  session?: Session | null;
  mistakes?: string[] | null;
  images: ImageRec[];
  analysis?: TradeAnalysis | null;
};

export type CreateTradePayload = {
  note?: string;
  takenAt?: string | null;
  exitAt?: string | null;
  outcome?: TradeOutcome;
  rMultiple?: number;
  strategy?: string;
  mistakes?: string[];
}