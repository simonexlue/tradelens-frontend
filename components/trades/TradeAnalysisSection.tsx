"use client"

import { Button } from "@/components/ui/button"
import type { ImageRec, TradeAnalysis } from "@/types/trades"

interface TradeAnalysisSectionProps {
  tradeId: string | null
  images: ImageRec[]
  selectedImageId: string | null
  setSelectedImageId: (id: string | null) => void
  analysis: TradeAnalysis | null
  analysisError: string | null
  analysisLoading: boolean
  onRunAnalysis: () => void
}

export function TradeAnalysisSection({
  tradeId,
  images,
  selectedImageId,
  setSelectedImageId,
  analysis,
  analysisError,
  analysisLoading,
  onRunAnalysis,
}: TradeAnalysisSectionProps) {
  const disabled =
    !tradeId || !selectedImageId || analysisLoading || images.length === 0

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-slate-100">Analysis</h2>
        <Button
          size="sm"
          onClick={onRunAnalysis}
          disabled={disabled}
          className="bg-[#18B6B2] hover:bg-[#10a3a0] text-slate-900 disabled:opacity-60"
        >
          {analysisLoading
            ? "Analyzing…"
            : selectedImageId
            ? "Run AI Analysis"
            : "Select a screenshot"}
        </Button>
      </div>

      {analysisError && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-300">
          {analysisError}
        </div>
      )}

      {analysisLoading && (
        <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4 text-sm text-slate-300">
          Analyzing this trade setup… This may take a few seconds.
        </div>
      )}

      {!analysis && !analysisLoading && (
        <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4 text-slate-400 text-sm">
          No analysis yet. Select a screenshot above and click{" "}
          <span className="font-medium text-teal-300">Run AI Analysis</span> to
          generate:
          <ul className="mt-2 list-disc pl-5">
            <li>What happened</li>
            <li>Why it worked / failed</li>
            <li>2–3 tips to improve next time</li>
          </ul>
        </div>
      )}

      {analysis && !analysisLoading && (
        <div className="space-y-4 text-sm text-slate-200">
          <div>
            <h3 className="text-base font-semibold text-[#18B6B2]">
              What happened
            </h3>
            <p className="mt-1 text-slate-200">{analysis.what_happened}</p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-[#18B6B2]">
              Why it worked / failed
            </h3>
            <p className="mt-1 text-slate-200">{analysis.why_result}</p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-[#18B6B2]">
              Tips for next time
            </h3>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              {analysis.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
