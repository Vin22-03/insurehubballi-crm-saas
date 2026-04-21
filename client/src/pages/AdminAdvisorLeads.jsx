import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminShell from "../components/AdminShell";
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

function getStatusClass(status) {
  switch (status) {
    case "NEW":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "CONTACTED":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    case "FOLLOW_UP":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "INTERESTED":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "CONVERTED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "NOT_INTERESTED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "CLOSED":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function AdminAdvisorLeads() {
  const { advisorId } = useParams();
  const navigate = useNavigate();

  const [advisor, setAdvisor] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const fetchAdvisorLeads = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const res = await API.get(`/admin/advisors/${advisorId}/leads`);

      setAdvisor(res.data.advisor || null);
      setLeads(res.data.leads || []);
    } catch (error) {
      console.error("Failed to load advisor leads:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to load advisor leads."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisorLeads();
  }, [advisorId]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const q = search.toLowerCase();

      const matchesSearch =
        lead.name?.toLowerCase().includes(q) ||
        lead.phone?.includes(search) ||
        lead.template?.title?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" ? true : lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leads, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedLeads = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filteredLeads.slice(start, end);
  }, [filteredLeads, safePage, pageSize]);

  const startItem =
    filteredLeads.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filteredLeads.length);

  return (
    <AdminShell
      title="Advisor Leads"
      subtitle="Read-only view of one advisor’s assigned leads, shared templates, and follow-up status."
      activeTab="advisor-performance"
    >
      {/* TOP HEADER */}
      <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-blue-100 bg-white/80 p-5 shadow-[0_12px_30px_rgba(37,99,235,0.05)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate("/admin/advisors/performance")}
            className="mb-3 rounded-2xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            ← Back to Performance
          </button>

          <h2 className="text-2xl font-bold text-slate-900">
            {advisor?.name || "Advisor"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Mobile: {advisor?.phone || "—"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Total Leads: <span className="font-semibold">{leads.length}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${
              advisor?.isActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-100 text-slate-600"
            }`}
          >
            {advisor?.isActive ? "Active Advisor" : "Inactive Advisor"}
          </span>
        </div>
      </div>

      {/* SEARCH + FILTER + PAGE SIZE */}
      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_220px_160px]">
        <div className="rounded-[24px] border border-blue-100 bg-white/80 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by lead name, phone, or template"
            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-white/80 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="CONTACTED">CONTACTED</option>
            <option value="FOLLOW_UP">FOLLOW_UP</option>
            <option value="INTERESTED">INTERESTED</option>
            <option value="CONVERTED">CONVERTED</option>
            <option value="NOT_INTERESTED">NOT_INTERESTED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-white/80 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
          </select>
        </div>
      </div>

      {errorMsg ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {/* DESKTOP TABLE */}
      <div className="hidden overflow-hidden rounded-[28px] border border-blue-100 bg-white/80 shadow-[0_12px_30px_rgba(37,99,235,0.05)] lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-blue-50/70">
              <tr className="text-left text-sm text-slate-700">
                <th className="px-5 py-4 font-semibold">Lead</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Company</th>
                <th className="px-5 py-4 font-semibold">Template Shared</th>
                <th className="px-5 py-4 font-semibold">Next Follow Up</th>
                <th className="px-5 py-4 font-semibold">Last Activity</th>
                <th className="px-5 py-4 font-semibold">Created At</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-8 text-sm text-slate-600">
                    Loading advisor leads...
                  </td>
                </tr>
              ) : paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-8 text-sm text-slate-600">
                    No leads found.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-t border-blue-100 transition hover:bg-blue-50/30"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {lead.name}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {lead.phone}
                      </div>
                      {lead.altPhone ? (
                        <div className="mt-1 text-xs text-slate-400">
                          Alt: {lead.altPhone}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                          lead.status
                        )}`}
                      >
                        {lead.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {lead.company?.name || "—"}
                    </td>

                    <td className="px-5 py-4">
                      {lead.template ? (
                        <div className="text-sm font-semibold text-slate-800">
                          {lead.template.title}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">No template</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {formatDateTime12h(lead.nextFollowUpAt || lead.nextFollowUp)}
                    </td>

                    <td className="px-5 py-4">
                      {lead.lastActivity ? (
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            {lead.lastActivity.activityType}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatDateTime12h(lead.lastActivity.createdAt)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">
                          No activity yet
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {formatDateTime12h(lead.createdAt)}
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
            Loading advisor leads...
          </div>
        ) : paginatedLeads.length === 0 ? (
          <div className="rounded-[24px] border border-blue-100 bg-white/85 p-4 text-sm text-slate-600 shadow-sm">
            No leads found.
          </div>
        ) : (
          paginatedLeads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-[24px] border border-blue-100 bg-white/85 p-4 shadow-[0_10px_25px_rgba(37,99,235,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {lead.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{lead.phone}</p>
                  {lead.altPhone ? (
                    <p className="mt-1 text-xs text-slate-400">
                      Alt: {lead.altPhone}
                    </p>
                  ) : null}
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                    lead.status
                  )}`}
                >
                  {lead.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    Company
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {lead.company?.name || "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    Template Shared
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {lead.template?.title || "No template"}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    Next Follow Up
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDateTime12h(lead.nextFollowUpAt || lead.nextFollowUp)}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    Created At
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDateTime12h(lead.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  Last Activity
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {lead.lastActivity?.activityType || "No activity yet"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {lead.lastActivity
                    ? formatDateTime12h(lead.lastActivity.createdAt)
                    : "No recent update"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PAGINATION */}
      <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-blue-100 bg-white/75 px-4 py-4 shadow-[0_10px_25px_rgba(37,99,235,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Showing <span className="font-semibold">{startItem}</span>–
          <span className="font-semibold">{endItem}</span> of{" "}
          <span className="font-semibold">{filteredLeads.length}</span> leads
        </p>

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
    </AdminShell>
  );
}

export default AdminAdvisorLeads;