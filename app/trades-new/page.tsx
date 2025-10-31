"use client";

import * as React from "react";
import { useState, useRef, useEffect } from 'react';
import { useRouter } from "next/navigation";

type CreateTradeResponse = { tradeId: string };
type PresignResponse = {
    uploadUrl: string;
    key: string;
    expiresIn: number;
    contentType: "image/png" | "image/jpeg" | "image/webp";
    contentLengthRange: {min: number; max: number};
}

type CreateImageResponse = {
    imageId: string;
    s3Key: string;
    createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID!;

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_BYTES = 10*1024*1024 //10MB

export default function NewTradePage() {

    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [note, setNote] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [isUploading, setIsUploading] = useState(false);
    const dropRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if(!API_BASE || !DEV_USER_ID) {
            setError("Missing NEXT_PUBLIC_API_BASE or NEXT_PUBLIC_DEV_USER_ID");
        }
    }, []);

    // HELPER FUNCTIONS
    function extFromFilename(name: string) {
        const m = name.toLowerCase().match(/\.(png|jpe?g|webp)$/i);
        if(!m) return null;
        return(m[1] as any) === "jpeg" ? "jpeg" : (m[1] as any);
    }

    async function getImageDimensions(f: File): Promise<{ width?: number; height?: number }> {
        return new Promise((resolve) => {
        try {
            const url = URL.createObjectURL(f);
            const img = new Image();
            img.onload = () => {
            const res = { width: img.width, height: img.height };
            URL.revokeObjectURL(url);
            resolve(res);
            };
            img.onerror = () => resolve({});
            img.src = url;
        } catch {
            resolve({});
        }
        });
    }

    async function createTrade(): Promise<string> {
        const res = await fetch(`${API_BASE}/trades/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': DEV_USER_ID,
        },
        body: JSON.stringify({ note, takenAt: null }),
        });
        if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(`Create trade failed: ${j.detail ?? res.statusText}`);
        }
        const data = (await res.json()) as CreateTradeResponse;
        return data.tradeId;
    }

    async function presign(tradeId: string, f: File): Promise<PresignResponse> {
        const extRaw = extFromFilename(f.name);
        const ext: 'png' | 'jpg' | 'jpeg' | 'webp' =
        extRaw === 'jpeg' ? 'jpeg' : (extRaw as any);

        const body = {
        contentType: f.type as PresignResponse['contentType'],
        fileExt: ext,
        size: f.size,
        tradeId,
        };

        const res = await fetch(`${API_BASE}/uploads/presign`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': DEV_USER_ID,
        },
        body: JSON.stringify(body),
        });
        if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(`Presign failed: ${j.detail ?? res.statusText}`);
        }
        return (await res.json()) as PresignResponse;
    }

    function putToS3(url: string, contentType: string, f: File, onProgress: (pct: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) onProgress(Math.round((evt.loaded / evt.total) * 100));
        };
        xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else {
            console.error('S3 error body:', xhr.responseText);
            reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`));
        }
        };
        xhr.onerror = () => reject(new Error('Network error during S3 upload'));
        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', contentType);
        xhr.send(f);
    });
    }

    async function saveImage(tradeId: string, key: string, f: File, dims: { width?: number; height?: number }) {
    const res = await fetch(`${API_BASE}/trades/${tradeId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': DEV_USER_ID },
        body: JSON.stringify({ key, contentType: f.type, width: dims.width, height: dims.height }),
    });
    const text = await res.text();
    if (!res.ok) {
        console.error('saveImage failed:', res.status, text);
        let detail: string | undefined;
        try { detail = JSON.parse(text)?.detail } catch {}
        throw new Error(`Save image failed: ${detail ?? res.statusText}`);
    }
    return JSON.parse(text) as { imageId: string; s3Key: string; createdAt: string };
    }

  // UI HANDLERS
    function onPick(e: React.ChangeEvent<HTMLInputElement>) {
        setError(null);
        const f = e.target.files?.[0] ?? null;
        validateAndSet(f);
    }

    function validateAndSet(f: File | null) {
        if (!f) {
        setFile(null);
        return;
        }
        if (!ALLOWED_MIME.has(f.type)) {
        setError('Unsupported file type. Allowed: PNG, JPG, WEBP.');
        setFile(null);
        return;
        }
        if (f.size > MAX_BYTES) {
        setError('File too large. Max 10MB.');
        setFile(null);
        return;
        }
        if (!extFromFilename(f.name)) {
        setError('File must have a valid image extension (png/jpg/jpeg/webp).');
        setFile(null);
        return;
        }
        setFile(f);
    }

    function onDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setError(null);
        const f = e.dataTransfer.files?.[0] ?? null;
        validateAndSet(f);
    }
    function onDragOver(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
    }

    async function handleUpload() {
        try {
        setIsUploading(true);
        setProgress(0);
        setError(null);

        if (!file) {
            setError('Please choose an image first.');
            return;
        }

        // 1) Create trade
        const tradeId = await createTrade();

        // 2) Presign
        const { uploadUrl, key, contentType } = await presign(tradeId, file);

        console.log("presign key:", key);
        console.log("saveImage -> expected prefix:", `u/${DEV_USER_ID}/trades/${tradeId}/`);        

        // 3) Get optional dimensions (doesn't block if it fails)
        const dims = await getImageDimensions(file);

        // 4) Upload to S3
        await putToS3(uploadUrl, contentType, file, (pct) => setProgress(pct));

        // 5) Save image metadata
        const imageResp = await saveImage(tradeId, key, file, dims);
        console.log('POST /images <-', imageResp);

        // TEMP: wait a moment so you can read Network tab if needed
        await new Promise(r => setTimeout(r, 400));

        // Only navigate if the insert succeeded
        if (!imageResp?.imageId) {
        throw new Error('Image insert missing imageId (check backend logs)');
        }

        // 6) Navigate to detail
        router.push(`/trades/${tradeId}`);
        } catch (err: any) {
        console.error(err);
        setError(err?.message ?? 'Something went wrong');
        } finally {
        setIsUploading(false);
        }
    }

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-100">New Trade</h1>

      {/* Env warning */}
      {(!API_BASE || !DEV_USER_ID) && (
        <div className="rounded-md bg-yellow-900/40 border border-yellow-700 p-3 text-yellow-200 text-sm">
          Frontend env vars missing. Set NEXT_PUBLIC_API_BASE and NEXT_PUBLIC_DEV_USER_ID.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-900/40 border border-red-700 p-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Note input */}
      <div className="space-y-2">
        <label className="text-slate-200 text-sm">Note (optional)</label>
        <textarea
          className="w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-slate-100 outline-none"
          rows={3}
          maxLength={1000}
          placeholder="What happened on this trade?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* Drop zone */}
      <div
        ref={dropRef}
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900 p-8 text-center text-slate-300"
      >
        <p className="mb-4">Drag & drop your chart screenshot here</p>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onPick}
          className="block mx-auto"
        />
        {file && (
          <div className="mt-4 text-sm text-slate-400">
            Selected: <span className="text-slate-200">{file.name}</span> ({Math.round(file.size/1024)} KB)
          </div>
        )}
      </div>

      {/* Progress */}
      {isUploading && (
        <div className="w-full">
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-2 bg-teal-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-slate-400">{progress}%</div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleUpload}
          disabled={isUploading || !file || !API_BASE || !DEV_USER_ID}
          className="rounded-lg bg-teal-500 px-4 py-2 font-medium text-slate-900 hover:opacity-95 disabled:opacity-50"
        >
          {isUploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </div>
  );
}