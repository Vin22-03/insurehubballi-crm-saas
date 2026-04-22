import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdvisorShell from "../components/AdvisorShell";
import API from "../api/axios";

function formatDateTime12h(value) {
  if (!value) return "—";

  const date = new Date(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function maskPhone(phone) {
  if (!phone || phone.length < 4) return phone;
  return `${phone.slice(0, 2)}****${phone.slice(-4)}`;
}

function getSourceBadgeClass(source) {
  switch (source) {
    case "EXCEL":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "MANUAL":
    default:
      return "border-violet-200 bg-violet-50 text-violet-700";
  }
}

function AdvisorContactBatches() {
  const navigate = useNavigate();

  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [batchContacts, setBatchContacts] = useState([]);

  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchBatches = async () => {
    try {
      setLoadingBatches(true);
      setErrorMsg("");

      const res = await API.get("/contacts/batches");
      const fetchedBatches = res.data.batches || [];

      setBatches(fetchedBatches);

      if (fetchedBatches.length > 0 && !selectedBatchId) {
        setSelectedBatchId(fetchedBatches[0].batchId);
      }
    } catch (error) {
      console.error("Failed to load contact batches:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to load contact batches."
      );
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchBatchContacts = async (batchId) => {
    if (!batchId) {
      setBatchContacts([]);
      return;
    }

    try {
      setLoadingContacts(true);
      setErrorMsg("");

      const res = await API.get("/contacts", {
        params: { batchId },
      });

      setBatchContacts(res.data.contacts || []);
    } catch (error) {
      console.error("Failed to load batch contacts:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to load selected batch contacts."
      );
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      fetchBatchContacts(selectedBatchId);
    }
  }, [selectedBatchId]);

  useEffect(() => {
    setPage(1);
  }, [selectedBatchId, pageSize]);

  const selectedBatch = useMemo(() => {
    return batches.find((batch) => batch.batchId === selectedBatchId) || null;
  }, [batches, selectedBatchId]);

  const totalPages = Math.max(1, Math.ceil(batchContacts.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedContacts = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return batchContacts.slice(start, end);
  }, [batchContacts, safePage, pageSize]);

  const startItem =
    batchContacts.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, batchContacts.length);

  const totalBatches = batches.length;
  const totalImportedContacts = batches.reduce(
    (sum, batch) => sum + (batch.count || 0),
    0
  );
  const latestBatch = batches[0] || null;

  return (
    <AdvisorShell
      title="Batch Summary"
      subtitle="Review all contact import batches, their volume, and the contacts saved inside each batch."
      activeTab="contacts"
    >
      {errorMsg ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {/* KPI CARDS */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Total Batches
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {loadingBatches ? "…" : totalBatches}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Excel import batches created
          </p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Imported Contacts
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {loadingBatches ? "…" : totalImportedContacts}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Contacts created from all batches
          </p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Latest Batch
          </p>
          <p className="mt-3 text-base font-bold text-slate-900">
            {loadingBatches ? "…" : latestBatch?.batchId || "No batch yet"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {latestBatch?.latestCreatedAt
              ? formatDateTime12h(latestBatch.latestCreatedAt)
              : "Upload Excel contacts to create your first batch"}
          </p>
        </div>
      </div>

      {/* TOP LAYOUT */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        {/* LEFT SIDE BATCH LIST */}
        <section className="rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,249,255,0.96))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Batch History
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">
                Import Batches
              </h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/advisor/contacts/import")}
              className="rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-blue-50 active:translate-y-0 active:scale-[0.99]"
            >
              + Import More
            </button>
          </div>

          <div className="space-y-4">
            {loadingBatches ? (
              <div className="rounded-2xl border border-blue-100 bg-white/85 p-4 text-sm text-slate-600">
                Loading batches...
              </div>
            ) : batches.length === 0 ? (
              <div className="rounded-2xl border border-blue-100 bg-white/85 p-4 text-sm text-slate-600">
                No batches available yet.
              </div>
            ) : (
              batches.map((batch) => {
                const isActive = batch.batchId === selectedBatchId;

                return (
                  <button
                    key={batch.batchId}
                    type="button"
                    onClick={() => setSelectedBatchId(batch.batchId)}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                      isActive
                        ? "border-blue-300 bg-blue-50/70 shadow-[0_10px_24px_rgba(37,99,235,0.10)]"
                        : "border-blue-100 bg-white/85 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {batch.batchId}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {batch.count} contact{batch.count === 1 ? "" : "s"}
                        </p>
                      </div>

                      <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                        Imported
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      Latest entry: {formatDateTime12h(batch.latestCreatedAt)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* RIGHT SIDE SELECTED BATCH */}
        <section className="rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,249,255,0.96))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Selected Batch
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">
                {selectedBatch?.batchId || "No batch selected"}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {selectedBatch
                  ? `${selectedBatch.count} contacts inside this batch`
                  : "Select a batch to inspect imported contacts"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/advisor/contacts/browse")}
              className="rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-blue-50 active:translate-y-0 active:scale-[0.99]"
            >
              Open Browse Contacts
            </button>
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden overflow-hidden rounded-[28px] border border-blue-100 bg-white/85 shadow-[0_12px_30px_rgba(37,99,235,0.05)] lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-blue-50/70">
                  <tr className="text-left text-sm text-slate-700">
                    <th className="px-5 py-4 font-semibold">Contact</th>
                    <th className="px-5 py-4 font-semibold">City</th>
                    <th className="px-5 py-4 font-semibold">Source</th>
                    <th className="px-5 py-4 font-semibold">Lead</th>
                    <th className="px-5 py-4 font-semibold">Created At</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingContacts ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-8 text-sm text-slate-600">
                        Loading batch contacts...
                      </td>
                    </tr>
                  ) : paginatedContacts.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-8 text-sm text-slate-600">
                        No contacts found in this batch.
                      </td>
                    </tr>
                  ) : (
                    paginatedContacts.map((contact) => (
                      <tr
                        key={contact.id}
                        className="border-t border-blue-100 transition hover:bg-blue-50/30"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {contact.name || "Unnamed Contact"}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {maskPhone(contact.phone)}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {contact.city || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getSourceBadgeClass(
                              contact.importSource
                            )}`}
                          >
                            {contact.importSource === "EXCEL" ? "Imported" : "Manual"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              contact.hasLead
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {contact.hasLead ? "Lead Created" : "No Lead"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {formatDateTime12h(contact.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS */}
          <div className="space-y-4 lg:hidden">
            {loadingContacts ? (
              <div className="rounded-[24px] border border-blue-100 bg-white/85 p-4 text-sm text-slate-600 shadow-sm">
                Loading batch contacts...
              </div>
            ) : paginatedContacts.length === 0 ? (
              <div className="rounded-[24px] border border-blue-100 bg-white/85 p-4 text-sm text-slate-600 shadow-sm">
                No contacts found in this batch.
              </div>
            ) : (
              paginatedContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="rounded-[24px] border border-blue-100 bg-white/85 p-4 shadow-[0_10px_25px_rgba(37,99,235,0.06)]"
                >
                  <h3 className="text-lg font-bold text-slate-900">
                    {contact.name || "Unnamed Contact"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {maskPhone(contact.phone)}
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                        City
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {contact.city || "—"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                        Source
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {contact.importSource === "EXCEL" ? "Imported" : "Manual"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                        Lead Status
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {contact.hasLead ? "Lead Created" : "No Lead"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                        Created At
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatDateTime12h(contact.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PAGINATION */}
          <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-blue-100 bg-white/75 px-4 py-4 shadow-[0_10px_25px_rgba(37,99,235,0.04)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <p className="text-sm text-slate-600">
                Showing <span className="font-semibold">{startItem}</span>–
                <span className="font-semibold">{endItem}</span> of{" "}
                <span className="font-semibold">{batchContacts.length}</span> contacts
              </p>

              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-xl border border-blue-100 bg-[#f8fbff] px-3 py-2 text-sm text-slate-700 outline-none"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <div className="rounded-xl border border-blue-100 bg-[#f8fbff] px-4 py-2 text-sm font-semibold text-slate-700">
                Page {safePage} of {totalPages}
              </div>

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </AdvisorShell>
  );
}

export default AdvisorContactBatches;