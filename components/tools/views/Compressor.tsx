"use client";

import {
  Delete02Icon,
  Download01Icon,
  FileArchiveIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ToolViewProps } from "@/lib/tools/registry";
import {
  COMPRESSION_FORMATS,
  compressionSavings,
  formatSize,
  getStreamSupport,
  resultFileName,
  transformBlob,
  type CompressionDirection,
  type CompressionFormat,
} from "@/lib/tools/logic/compressor";
import {
  ToolActions,
  ToolBadge,
  ToolOption,
  ToolResultCard,
  ToolResultGrid,
  ToolSection,
  ToolSelectField,
  ToolStatus,
  ToolView,
} from "./shared";

const FORMAT_ITEMS = COMPRESSION_FORMATS.map((entry) => ({
  value: entry.value,
  label: entry.label,
}));

export default function Compressor({ toolId }: ToolViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<CompressionFormat>("gzip");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [resultSize, setResultSize] = useState(0);
  const [lastDirection, setLastDirection] =
    useState<CompressionDirection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const support = useMemo(() => getStreamSupport(), []);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (selected) {
      setFile(selected);
      setOriginalSize(selected.size);
      setResultBlob(null);
      setResultSize(0);
      setLastDirection(null);
      setError(null);
    }
    event.target.value = "";
  };

  const handleFormat = (next: string) => {
    setFormat(next as CompressionFormat);
    setResultBlob(null);
    setResultSize(0);
    setLastDirection(null);
    setError(null);
  };

  const handleTransform = async (direction: CompressionDirection) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    const outcome = await transformBlob(file, format, direction);
    if (outcome.ok) {
      setResultBlob(outcome.blob);
      setResultSize(outcome.blob.size);
      setLastDirection(direction);
      toast.success(
        direction === "compress"
          ? "Compression complete"
          : "Decompression complete",
        { duration: 2500 },
      );
    } else {
      setResultBlob(null);
      setResultSize(0);
      setLastDirection(null);
      setError(outcome.error);
    }
    setBusy(false);
  };

  const handleDownload = () => {
    if (!resultBlob || !file || !lastDirection) return;
    const url = URL.createObjectURL(resultBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = resultFileName(file.name, format, lastDirection);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setFile(null);
    setResultBlob(null);
    setResultSize(0);
    setOriginalSize(0);
    setLastDirection(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const savings = compressionSavings(originalSize, resultSize);
  const savingsTone =
    savings && savings.savedPercent >= 0 ? "success" : "warning";

  return (
    <ToolView>
      <ToolSection
        title="Stream compressor"
        description="Native Compression Streams with explicit feature detection. Files never leave this window."
        actions={
          resultBlob && savings ? (
            <ToolBadge tone={savingsTone}>{savings.label}</ToolBadge>
          ) : null
        }
      >
        <input
          ref={fileRef}
          id="compressor-file"
          type="file"
          className="tool-hidden-input"
          onChange={handleFile}
          aria-label="Choose a file to compress or decompress"
        />

        {!file ? (
          <label htmlFor="compressor-file" className="tool-dropzone">
            <HugeiconsIcon icon={Upload01Icon} strokeWidth={2} size={22} />
            <span className="tool-dropzone-title">Choose a file</span>
            <span className="tool-dropzone-hint">
              Gzip, Deflate or raw Deflate · processed locally in chunks
            </span>
          </label>
        ) : (
          <div className="tool-file-row">
            <span className="tool-file-icon" aria-hidden>
              <HugeiconsIcon icon={FileArchiveIcon} strokeWidth={2} size={18} />
            </span>
            <div className="tool-file-meta">
              <span className="tool-file-name">{file.name}</span>
              <span className="tool-file-size">{formatSize(file.size)}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              Replace
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClear}
              aria-label="Clear file"
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} size={14} />
            </Button>
          </div>
        )}

        <div className="tool-form-grid tool-form-grid-single">
          <ToolSelectField
            label="Algorithm"
            items={FORMAT_ITEMS}
            value={format}
            onValueChange={handleFormat}
          />
        </div>

        <ToolActions>
          <Button
            onClick={() => void handleTransform("compress")}
            disabled={!file || busy || !support.compression}
          >
            {busy ? "Processing…" : "Compress"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void handleTransform("decompress")}
            disabled={!file || busy || !support.decompression}
          >
            Decompress
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={!resultBlob}
          >
            <HugeiconsIcon icon={Download01Icon} strokeWidth={2} size={14} />
            Download result
          </Button>
          <Button variant="ghost" onClick={handleClear} disabled={!file}>
            Clear
          </Button>
        </ToolActions>

        {!support.compression || !support.decompression ? (
          <ToolStatus tone="warning">
            {!support.compression && !support.decompression
              ? "CompressionStream and DecompressionStream are unavailable in this browser."
              : !support.compression
                ? "CompressionStream is unavailable; decompression may still work."
                : "DecompressionStream is unavailable; compression may still work."}
          </ToolStatus>
        ) : (
          <ToolStatus tone="neutral">
            Streaming APIs detected. Select a format, then compress or
            decompress.
          </ToolStatus>
        )}

        {error ? <ToolStatus tone="error">{error}</ToolStatus> : null}

        {resultBlob ? (
          <ToolResultGrid>
            <ToolResultCard label="Original" value={formatSize(originalSize)} />
            <ToolResultCard
              label="Result"
              value={formatSize(resultSize)}
              detail={
                lastDirection === "compress" ? "Compressed" : "Decompressed"
              }
              tone="success"
            />
            <ToolResultCard
              label="Size ratio"
              value={savings ? `${(savings.ratio * 100).toFixed(1)}%` : "—"}
              unit="of original"
            />
          </ToolResultGrid>
        ) : null}

        <ToolOption
          label="Local processing"
          hint="No upload, no server call and no persistent storage."
        >
          <ToolBadge tone="success">Private</ToolBadge>
        </ToolOption>
        <span className="tool-hidden" aria-hidden="true">
          {toolId}
        </span>
      </ToolSection>
    </ToolView>
  );
}
