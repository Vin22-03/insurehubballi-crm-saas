import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import API from "../api/axios";
import { FiX, FiChevronLeft, FiChevronRight, FiEye } from "react-icons/fi";

function maskPhone(phone) {
  if (!phone) return "";
  return `${phone.slice(0, 2)}****${phone.slice(-4)}`;
}

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

function getSourceBadgeClass(source) {
  switch (source) {
    case "EXCEL":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "MANUAL":
    default:
      return "border-violet-200 bg-violet-50 text-violet-700";
  }
}

function AdminContacts() {
  const [contacts, setContacts] = useState([]);
  const [advisors, setAdvisors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [search, setSearch] = useState("");
  const [advisorId, setAdvisorId] = useState("");
  const [source, setSource] = useState("ALL");
  const [leadFilter, setLeadFilter] = useState("ALL");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedContact, setSelectedContact] = useState(null);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const res = await API.get("/contacts", {
        params: {
          search,
          advisorId,
          source,
        },
      });

      setContacts(res.data.contacts || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load contacts.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvisors = async () => {
    try {
      const res = await API.get("/admin/advisors");
      setAdvisors(res.data.advisors || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAdvisors();
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [search, advisorId, source]);

  useEffect(() => {
    setPage(1);
  }, [search, advisorId, source, leadFilter, pageSize]);

  const filteredContacts = useMemo(() => {
    let data = contacts;

    if (leadFilter !== "ALL") {
      data = data.filter((c) =>
        leadFilter === "HAS_LEAD" ? c.hasLead : !c.hasLead
      );
    }

    return data;
  }, [contacts, leadFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedContacts = filteredContacts.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const startItem =
    filteredContacts.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filteredContacts.length);

  const stats = useMemo(() => {
    return {
      total: contacts.length,
      imported: contacts.filter((c) => c.importSource === "EXCEL").length,
      manual: contacts.filter((c) => c.importSource === "MANUAL").length,
      converted: contacts.filter((c) => c.hasLead).length,
    };
  }, [contacts]);

  return (
    <AdminShell
      title="Admin Contacts"
      subtitle="Monitor advisor contact uploads, contact quality, and contact-to-lead conversion across the team."
      activeTab="contacts"
    >
      {errorMsg ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {/* KPI CARDS */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Total Contacts" value={stats.total} />
        <Card label="Imported Contacts" value={stats.imported} />
        <Card label="Manual Contacts" value={stats.manual} />
        <Card label="Converted to Leads" value={stats.converted} />
      </div>

      {/* FILTERS */}
      <div className="mb-6 rounded-[26px] border border-blue-100 bg-white/85 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <input
            placeholder="Search by contact name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <select
            value={advisorId}
            onChange={(e) => setAdvisorId(e.target.value)}
            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">All Advisors</option>
            {advisors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="ALL">All Source</option>
            <option value="MANUAL">Manual</option>
            <option value="EXCEL">Imported</option>
          </select>

          <select
            value={leadFilter}
            onChange={(e) => setLeadFilter(e.target.value)}
            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="ALL">All Leads</option>
            <option value="HAS_LEAD">Has Lead</option>
            <option value="NO_LEAD">No Lead</option>
          </select>
        </div>
      </div>

      {/* INFO STRIP */}
      <div className="mb-6 rounded-[22px] border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
        Admin view is for monitoring only. Advisors create and work contacts; admin tracks usage, source quality, and conversion.
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden overflow-hidden rounded-[28px] border border-blue-100 bg-white/85 shadow-[0_12px_30px_rgba(37,99,235,0.05)] lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-blue-50/70">
              <tr className="text-left text-sm text-slate-700">
                <th className="w-[20%] px-4 py-4 font-semibold">Advisor</th>
                <th className="w-[36%] px-4 py-4 font-semibold">Contact</th>
                <th className="w-[14%] px-4 py-4 text-center font-semibold">Source</th>
                <th className="w-[14%] px-4 py-4 text-center font-semibold">Lead</th>
                <th className="w-[16%] px-4 py-4 text-center font-semibold">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-sm text-slate-600">
                    Loading contacts...
                  </td>
                </tr>
              ) : paginatedContacts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-sm text-slate-600">
                    No contacts found.
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-blue-100 transition hover:bg-blue-50/30"
                  >
                    <td className="px-4 py-4 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">
                        {c.advisor?.name || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">
                        {c.name || "Unnamed Contact"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {maskPhone(c.phone)}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getSourceBadgeClass(
                          c.importSource
                        )}`}
                      >
                        {c.importSource === "EXCEL" ? "Imported" : "Manual"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                          c.hasLead
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-600"
                        }`}
                      >
                        {c.hasLead ? "Lead Created" : "No Lead"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => setSelectedContact(c)}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                      >
                        <FiEye size={15} />
                        View
                      </button>
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
        {loading ? (
          <div className="rounded-[24px] border border-blue-100 bg-white/85 p-4 text-sm text-slate-600 shadow-sm">
            Loading contacts...
          </div>
        ) : paginatedContacts.length === 0 ? (
          <div className="rounded-[24px] border border-blue-100 bg-white/85 p-4 text-sm text-slate-600 shadow-sm">
            No contacts found.
          </div>
        ) : (
          paginatedContacts.map((c) => (
            <div
              key={c.id}
              className="rounded-[24px] border border-blue-100 bg-white/85 p-4 shadow-[0_10px_25px_rgba(37,99,235,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {c.name || "Unnamed Contact"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {maskPhone(c.phone)}
                  </p>
                </div>

                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                    c.hasLead
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-600"
                  }`}
                >
                  {c.hasLead ? "Lead" : "No Lead"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    Advisor
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {c.advisor?.name || "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    Source
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {c.importSource === "EXCEL" ? "Imported" : "Manual"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedContact(c)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                <FiEye size={16} />
                View Details
              </button>
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
            <span className="font-semibold">{filteredContacts.length}</span> contacts
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
            disabled={safePage === 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiChevronLeft size={16} />
          </button>

          <div className="rounded-xl border border-blue-100 bg-[#f8fbff] px-4 py-2 text-sm font-semibold text-slate-700">
            Page {safePage} of {totalPages}
          </div>

          <button
            disabled={safePage === totalPages}
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* MODAL */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedContact(null)}
          />

          <div className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between border-b border-blue-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Contact Details
                </h2>
                <p className="text-sm text-slate-500">
                  Admin monitoring view
                </p>
              </div>

              <button
                onClick={() => setSelectedContact(null)}
                className="text-slate-400 transition hover:text-slate-700"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <DetailBox label="Advisor">
                {selectedContact.advisor?.name || "—"}
              </DetailBox>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailBox label="Contact Name">
                  {selectedContact.name || "Unnamed Contact"}
                </DetailBox>

                <DetailBox label="Phone">
                  {selectedContact.phone || "—"}
                </DetailBox>

                <DetailBox label="Source">
                  {selectedContact.importSource === "EXCEL" ? "Imported" : "Manual"}
                </DetailBox>

                <DetailBox label="Lead Status">
                  {selectedContact.hasLead ? "Lead Created" : "No Lead"}
                </DetailBox>
              </div>
            </div>

            <div className="border-t border-blue-100 bg-blue-50/40 px-6 py-4">
              <button
                onClick={() => setSelectedContact(null)}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function Card({ label, value }) {
  return (
    <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function DetailBox({ label, children }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold text-slate-900">{children}</div>
    </div>
  );
}

export default AdminContacts;