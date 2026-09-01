"use client";

import { useState } from "react";
import Papa from "papaparse";
import { UploadCloud, FileText, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { importAssetsCsv, type CsvAssetRow, type ImportResult } from "@/lib/actions/import";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";

const EXPECTED_FIELDS = [
  "asset_name", "asset_type", "serial_number", "manufacturer", "model",
  "purchase_date", "purchase_price", "assigned_to", "location", "status",
  "warranty_expiry", "tag_id",
];

export default function ImportPage() {
  const [rows, setRows] = useState<CsvAssetRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    setParseError(null);
    Papa.parse<CsvAssetRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (res) => {
        if (res.errors.length > 0) {
          setParseError(res.errors[0].message);
          return;
        }
        setRows(res.data);
      },
    });
  }

  async function handleImport() {
    setImporting(true);
    const res = await importAssetsCsv(rows);
    setResult(res);
    setImporting(false);
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="Import Assets from CSV"
        description="Bulk-load assets from a CSV export. Review the preview before confirming."
        actions={<LinkButton href="/assets" variant="outline">Back to Register</LinkButton>}
      />

      <div className="px-4 md:px-6 space-y-4">
        <Card>
          <h3 className="text-[13px] font-semibold text-ink mb-2">Expected columns</h3>
          <div className="flex flex-wrap gap-1.5">
            {EXPECTED_FIELDS.map((f) => (
              <code key={f} className="text-[11px] bg-surface-sunken px-1.5 py-0.5 rounded-[3px] text-ink-soft">
                {f}
              </code>
            ))}
          </div>
          <p className="text-[12px] text-ink-soft mt-3">
            Only <code className="text-[11px]">asset_name</code> is required. Unrecognised categories, locations, or
            statuses will be flagged for review rather than silently guessed.
          </p>
        </Card>

        <Card>
          <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-line-strong rounded-[3px] py-10 cursor-pointer hover:border-black transition-colors">
            <UploadCloud size={22} className="text-ink-soft" />
            <span className="text-[13px] text-ink">
              {fileName ? fileName : "Click to choose a CSV file"}
            </span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          {parseError && <p className="text-[12px] text-red mt-2">{parseError}</p>}
        </Card>

        {rows.length > 0 && !result && (
          <Card padded={false}>
            <div className="flex items-center justify-between px-4 pt-4">
              <h3 className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                <FileText size={14} /> Preview — {rows.length} row{rows.length === 1 ? "" : "s"}
              </h3>
              <Button variant="primary" onClick={handleImport} disabled={importing}>
                {importing ? "Importing..." : `Import ${rows.length} assets`}
              </Button>
            </div>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-black text-white">
                    {EXPECTED_FIELDS.map((f) => (
                      <th key={f} className="text-left font-medium px-2.5 py-2 whitespace-nowrap">{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 25).map((r, i) => (
                    <tr key={i} className={i % 2 === 1 ? "bg-surface-muted" : "bg-white"}>
                      {EXPECTED_FIELDS.map((f) => (
                        <td key={f} className="px-2.5 py-1.5 border-t border-line text-ink-soft whitespace-nowrap">
                          {r[f as keyof CsvAssetRow] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 25 && (
                <p className="text-[11px] text-ink-soft px-2.5 py-2">
                  Showing first 25 of {rows.length} rows.
                </p>
              )}
            </div>
          </Card>
        )}

        {result && (
          <Card>
            <h3 className="text-[13px] font-semibold text-ink mb-3">Import complete</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="border border-line rounded-[3px] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[12px] text-ink-soft"><CheckCircle2 size={13} /> Imported</div>
                <div className="text-[20px] font-semibold text-ink mt-1">{result.imported}</div>
              </div>
              <div className="border border-line rounded-[3px] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[12px] text-ink-soft"><XCircle size={13} /> Failed</div>
                <div className="text-[20px] font-semibold text-ink mt-1">{result.failed.length}</div>
              </div>
              <div className="border border-line rounded-[3px] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[12px] text-ink-soft"><AlertTriangle size={13} /> Duplicates</div>
                <div className="text-[20px] font-semibold text-ink mt-1">{result.duplicates.length}</div>
              </div>
            </div>

            {result.failed.length > 0 && (
              <div className="mb-4">
                <h4 className="text-[12px] font-medium text-ink mb-1.5">Validation errors</h4>
                <div className="divide-y divide-line border border-line rounded-[3px]">
                  {result.failed.map((f, i) => (
                    <div key={i} className="px-2.5 py-1.5 text-[12px] text-ink-soft">
                      Row {f.row}: {f.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.duplicates.length > 0 && (
              <div className="mb-4">
                <h4 className="text-[12px] font-medium text-ink mb-1.5">Duplicate records (skipped)</h4>
                <div className="divide-y divide-line border border-line rounded-[3px]">
                  {result.duplicates.map((d, i) => (
                    <div key={i} className="px-2.5 py-1.5 text-[12px] text-ink-soft">
                      Row {d.row}: serial number {d.serial_number} already exists
                    </div>
                  ))}
                </div>
              </div>
            )}

            <LinkButton href="/assets" variant="primary">Go to Asset Register</LinkButton>
          </Card>
        )}
      </div>
    </div>
  );
}
