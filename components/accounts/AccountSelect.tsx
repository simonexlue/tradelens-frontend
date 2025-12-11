"use client"

import * as React from "react"

export type AccountType = "eval" | "funded" | "live" | "sim"

export type Account = {
  id: string
  label: string
  provider: string
  account_type: AccountType
  size: number | null
  created_at: string
}

type AccountSelectProps = {
  value: string | null
  onChange: (accountId: string | null) => void
}

export function AccountSelect({ value, onChange }: AccountSelectProps) {
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // create-form state
  const [showCreate, setShowCreate] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [createError, setCreateError] = React.useState<string | null>(null)

  const [newLabel, setNewLabel] = React.useState("")
  const [newProvider, setNewProvider] = React.useState("")
  const [newType, setNewType] = React.useState<AccountType | "">("")
  const [newSize, setNewSize] = React.useState("")

  // load accounts
  React.useEffect(() => {
    let cancelled = false

    async function loadAccounts() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch("/api/accounts", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) {
          console.error("Failed to load accounts", res.status, res.statusText)
          setError("Unable to load accounts yet.")
          return
        }

        const data = (await res.json()) as Account[]
        if (!cancelled) {
          setAccounts(data || [])
        }
      } catch (e) {
        console.error("Error loading accounts", e)
        if (!cancelled) {
          setError("Unable to load accounts.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAccounts()
    return () => {
      cancelled = true
    }
  }, [])

  const hasAccounts = accounts.length > 0

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)

    const label = newLabel.trim()

    if (!label) {
      setCreateError("Account name is required.")
      return
    }
    if (!newProvider.trim()) {
      setCreateError("Provider is required.")
      return
    }
    if (!newType) {
      setCreateError("Account type is required.")
      return
    }

    let sizeNum: number | null = null
    if (newSize.trim() !== "") {
      const parsed = Number(newSize)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setCreateError("Size must be a positive number (e.g. 25000).")
        return
      }
      sizeNum = parsed
    }

    try {
      setCreating(true)

      const body = {
        label,
        provider: newProvider.trim(), // non-null
        account_type: newType, // non-null ("eval" | "funded" | "live" | "sim")
        size: sizeNum, // nullable in DB
      }

      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        console.error("Failed to create account", res.status, j)
        setCreateError(
          typeof j?.detail === "string" ? j.detail : "Failed to create account."
        )
        return
      }

      const created = (await res.json()) as Account

      setAccounts((prev) => [created, ...prev])
      onChange(created.id)

      // reset form
      setNewLabel("")
      setNewProvider("")
      setNewType("")
      setNewSize("")
      setCreateError(null)
      setShowCreate(false)
    } catch (e) {
      console.error("Error creating account", e)
      setCreateError("Failed to create account.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-200">
            Account tag (optional)
          </p>
          <p className="text-xs text-slate-500">
            Tag this trade with the prop / broker account it came from. Useful
            if you trade multiple eval / funded accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate((prev) => !prev)}
          className="mt-2 inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800 sm:mt-0"
        >
          {showCreate ? "Cancel" : "+ New account"}
        </button>
      </div>

      {/* Existing accounts dropdown */}
      <div className="mt-3">
        {loading ? (
          <p className="text-xs text-slate-500">Loading accounts…</p>
        ) : (
          <select
            className="mt-1 w-full max-w-xs rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
            value={value ?? "none"}
            onChange={(e) =>
              onChange(e.target.value === "none" ? null : e.target.value)
            }
          >
            <option value="none">No account / Skip</option>
            {hasAccounts &&
              accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.label}
                </option>
              ))}
          </select>
        )}

        {error && (
          <p className="mt-1 text-xs text-red-400">
            {error} (you can still create trades without an account tag)
          </p>
        )}

        {!loading && !hasAccounts && !error && (
          <p className="mt-1 text-xs text-slate-500">
            You haven&apos;t added any accounts yet. Create one below, or skip
            this step.
          </p>
        )}
      </div>

      {/* Create account form */}
      {showCreate && (
        <form
          onSubmit={handleCreateAccount}
          className="mt-4 grid gap-3 rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs sm:grid-cols-2"
        >
          <div className="space-y-1 sm:col-span-2">
            <label className="block text-slate-300">Account name</label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
              placeholder="e.g. Lucid 25K Eval, Topstep 50K Funded"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-slate-300">Provider</label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value)}
            >
              <option value="">Select provider</option>
              <option value="topstep">Topstep</option>
              <option value="tradeify">Tradeify</option>
              <option value="apex">Apex</option>
              <option value="lucid">Lucid</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-slate-300">Account type</label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
              value={newType}
              onChange={(e) => setNewType(e.target.value as AccountType | "")}
            >
              <option value="">Select type</option>
              <option value="eval">Evaluation</option>
              <option value="funded">Funded</option>
              <option value="live">Live</option>
              <option value="sim">Sim</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-slate-300">
              Size (optional, e.g. 25000)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
              placeholder="25000"
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
            />
          </div>

          {createError && (
            <div className="sm:col-span-2 text-red-400">{createError}</div>
          )}

          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false)
                setCreateError(null)
              }}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-teal-400 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Save account"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
