import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import AdvisorShell from "../components/AdvisorShell";
import API from "../api/axios";

function normalizePhone(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(-10);
}

function AdvisorImportContacts() {
  const navigate = useNavigate();

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = async (e) => {
    try {
      setErrorMsg("");
      setSuccessMsg("");
      setResult(null);

      const file = e.target.files?.[0];
      if (!file) return;

      setFileName(file.name);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      const parsedRows = json.map((row, index) => {
        const normalized = {
          rowNumber: index + 2,
          name:
            row.name ||
            row.Name ||
            row.CLIENT_NAME ||
            row.client_name ||
            "",
          phone: normalizePhone(
            row.phone || row.Phone || row.mobile || row.Mobile || row.number || row.Number || ""
          ),
          altPhone: normalizePhone(
            row.altPhone || row.alt_phone || row.alt || row.AltPhone || ""
          ),
          city: row.city || row.City || "",
          sourceNote: row.sourceNote || row.note || row.Note || "Imported from Excel",
        };

        return {
          ...normalized,
          isValid: normalized.phone.length === 10,
        };
      });

      setRows(parsedRows);
    } catch (error) {
      console.error("File read failed:", error);
      setErrorMsg("Failed to read file. Please upload a valid Excel or CSV file.");
    }
  };

  const summary = useMemo(() => {
    const total = rows.length;
    const valid = rows.filter((r) => r.isValid).length;
    const invalid = total - valid;

    return { total, valid, invalid };
  }, [rows]);

  const handleImport = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");
      setResult(null);

      const validRows = rows.filter((r) => r.isValid);

      if (validRows.length === 0) {
        setErrorMsg("No valid contacts found to import.");
        return;
      }

      const payload = {
        contacts: validRows.map((r) => ({
          name: r.name || "Unnamed Contact",
          phone: r.phone,
          altPhone: r.altPhone || "",
          city: r.city || "",
          sourceNote: r.sourceNote || "",
        })),
      };

      const res = await API.post("/contacts/import", payload);

      setSuccessMsg("Contacts imported successfully ✅");
      setResult(res.data || null);
    } catch (error) {
      console.error("Import failed:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to import contacts."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdvisorShell
      title="Import Contacts"
      subtitle="Upload Excel or CSV contacts in bulk and organize them into import batches."
      activeTab="contacts"
    >
      {errorMsg ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {successMsg ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      ) : null}

      <div className="mb-6 rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,249,255,0.98))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Bulk Import
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Upload Excel File
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Accepted columns can include name, phone, altPhone, city, and sourceNote. Only phone is mandatory.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/advisor/contacts")}
            className="inline-flex items-center justify-center rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-blue-50 active:translate-y-0 active:scale-[0.99]"
          >
            ← Back to Contacts
          </button>
        </div>

        <div className="rounded-[24px] border border-dashed border-blue-200 bg-blue-50/40 p-5">
          <label className="block text-sm font-semibold text-slate-700">
            Choose Excel / CSV File
          </label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="mt-3 block w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-700"
          />
          <p className="mt-2 text-xs text-slate-500">
            Selected file: {fileName || "None"}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[24px] border border-blue-100 bg-white/85 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total Rows</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-[24px] border border-emerald-100 bg-white/85 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Valid Rows</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{summary.valid}</p>
        </div>
        <div className="rounded-[24px] border border-red-100 bg-white/85 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Invalid Rows</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{summary.invalid}</p>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="mb-6 rounded-[28px] border border-blue-100 bg-white/85 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
          <div className="flex items-center justify-between border-b border-blue-100 px-5 py-4">
            <h3 className="text-lg font-bold text-slate-900">Preview Contacts</h3>
            <button
              type="button"
              onClick={handleImport}
              disabled={loading}
              className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.24)] transition duration-150 hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Importing..." : "Confirm Import"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-blue-50/70">
                <tr className="text-left text-sm text-slate-700">
                  <th className="px-5 py-4 font-semibold">Row</th>
                  <th className="px-5 py-4 font-semibold">Name</th>
                  <th className="px-5 py-4 font-semibold">Phone</th>
                  <th className="px-5 py-4 font-semibold">City</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((row) => (
                  <tr key={row.rowNumber} className="border-t border-blue-100">
                    <td className="px-5 py-4 text-sm text-slate-700">{row.rowNumber}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {row.name || "Unnamed Contact"}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">{row.phone || "—"}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{row.city || "—"}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          row.isValid
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {row.isValid ? "Valid" : "Invalid"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Import Result
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Batch ID</p>
              <p className="mt-2 text-sm font-bold text-slate-900">{result.batchId || "—"}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Rows</p>
              <p className="mt-2 text-sm font-bold text-slate-900">{result.totalRows ?? "—"}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Imported</p>
              <p className="mt-2 text-sm font-bold text-slate-900">{result.importedCount ?? "—"}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Skipped</p>
              <p className="mt-2 text-sm font-bold text-slate-900">{result.skippedCount ?? "—"}</p>
            </div>
          </div>
        </div>
      ) : null}
    </AdvisorShell>
  );
}

export default AdvisorImportContacts;