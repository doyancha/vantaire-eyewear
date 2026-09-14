"use client";

import { useState } from "react";
import { ShieldAlert, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  getOrphansForProductAction,
  cleanupProductOrphansAction,
  OrphanFileInfo,
} from "@/lib/admin/media-actions";

interface OrphanCleanupSectionProps {
  productId: string;
  productSlug: string;
}

export function OrphanCleanupSection({
  productId,
  productSlug,
}: OrphanCleanupSectionProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [orphans, setOrphans] = useState<OrphanFileInfo[] | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleScan = async () => {
    setIsScanning(true);
    setMessage(null);
    try {
      const res = await getOrphansForProductAction(productId);
      if (res.success && res.data) {
        setOrphans(res.data);
        if (res.data.length === 0) {
          setMessage({
            type: "success",
            text: `Folder products/${productSlug}/ is completely clean. No orphan storage files detected.`,
          });
        }
      } else {
        setMessage({ type: "error", text: res.message || "Failed to scan storage folder." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error scanning storage folder." });
    } finally {
      setIsScanning(false);
    }
  };

  const handleCleanup = async () => {
    if (!orphans || orphans.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to permanently delete ${orphans.length} unreferenced storage file(s)?`
      )
    ) {
      return;
    }

    setIsCleaning(true);
    setMessage(null);
    try {
      const res = await cleanupProductOrphansAction(productId);
      if (res.success) {
        setMessage({
          type: "success",
          text: `Cleaned up ${res.data?.deletedCount ?? orphans.length} orphan storage file(s).`,
        });
        setOrphans([]);
      } else {
        setMessage({ type: "error", text: res.message || "Failed to clean up files." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error cleaning up orphan files." });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="p-5 bg-vantaire-charcoal/20 border border-vantaire-border space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h3 className="text-xs uppercase font-mono tracking-luxury text-vantaire-champagne flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-vantaire-champagne" />
            Storage Integrity &amp; Orphan Maintenance
          </h3>
          <p className="text-[11px] text-vantaire-muted">
            Audits folder <code className="text-vantaire-sand">products/{productSlug}/</code> for unreferenced files resulting from aborted uploads or replaced assets.
          </p>
        </div>

        <button
          type="button"
          disabled={isScanning || isCleaning}
          onClick={handleScan}
          className="px-3 py-1.5 bg-vantaire-charcoal text-vantaire-warmWhite border border-vantaire-border hover:border-vantaire-champagne/60 text-xs font-mono transition flex items-center gap-1.5"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Scanning...</span>
            </>
          ) : (
            <span>Scan For Orphans</span>
          )}
        </button>
      </div>

      {message && (
        <div
          className={`p-3 text-xs flex items-center gap-2 border ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {orphans && orphans.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-vantaire-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-amber-400">
              Found {orphans.length} unreferenced file(s) in Storage
            </span>
            <button
              type="button"
              disabled={isCleaning}
              onClick={handleCleanup}
              className="px-3 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-mono transition flex items-center gap-1.5"
            >
              {isCleaning ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3 h-3" />
                  <span>Delete {orphans.length} Orphan(s)</span>
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto border border-vantaire-border bg-vantaire-black/40">
            <table className="w-full text-left text-[11px] font-mono">
              <thead className="bg-vantaire-charcoal/60 text-vantaire-muted border-b border-vantaire-border">
                <tr>
                  <th className="p-2">Filename</th>
                  <th className="p-2">Storage Path</th>
                  <th className="p-2">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vantaire-border">
                {orphans.map((orph) => (
                  <tr key={orph.storagePath} className="hover:bg-vantaire-charcoal/30">
                    <td className="p-2 text-vantaire-warmWhite">{orph.name}</td>
                    <td className="p-2 text-vantaire-muted">{orph.storagePath}</td>
                    <td className="p-2 text-vantaire-sand">
                      {orph.size ? (orph.size / 1024).toFixed(1) : "0"} KB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
