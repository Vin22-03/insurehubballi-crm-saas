import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "../components/AdminShell";
import API from "../api/axios";

function formatDateTime12h(value) {
  if (!value) return "No activity yet";

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

function AdminAdvisorPerformance() {
  const navigate = useNavigate();

  const [advisors, setAdvisors] = useState([]);
  const [summary, setSummary] = useState({
    totalAdvisors: 0,
    activeAdvisors: 0,
    totalLeads: 0,
    totalConverted: 0,
  });

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("top-performer");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const fetchAdvisorPerformance = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const res = await API.get("/admin/advisors/performance");

      setAdvisors(res.data.advisors || []);
      setSummary(
        res.data.summary || {
          totalAdvisors: 0,
          activeAdvisors: 0,
          totalLeads: 0,
          totalConverted: 0,
        }
      );
    } catch (error) {
      console.error("Failed to load advisor performance:", error);
      setErrorMsg(
        error?.response?.data?.message ||
          "Failed to load advisor performance."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisorPerformance();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, sortBy, pageSize]);

  const filteredAdvisors = useMemo(() => {
    return advisors.filter((advisor) => {
      const q = search.toLowerCase();
      return (
        advisor.name?.toLowerCase().includes(q) ||
        advisor.phone?.includes(search)
      );
    });
  }, [advisors, search]);

  const sortedAdvisors = useMemo(() => {
    return [...filteredAdvisors].sort((a, b) => {
      switch (sortBy) {
        case "converted":
          return (
            b.convertedLeads - a.convertedLeads ||
            b.conversionRate - a.conversionRate ||
            b.totalLeads - a.totalLeads
          );

        case "conversion-rate":
          return (
            b.conversionRate - a.conversionRate ||
            b.convertedLeads - a.convertedLeads ||
            b.totalLeads - a.totalLeads
          );

        case "total-leads":
          return (
            b.totalLeads - a.totalLeads ||
            b.followUpLeads - a.followUpLeads ||
            b.newLeads - a.newLeads
          );

        case "last-activity":
          return (
            new Date(b.lastActivity?.createdAt || 0) -
            new Date(a.lastActivity?.createdAt || 0)
          );

        case "name":
          return a.name.localeCompare(b.name);

        case "top-performer":
        default:
          return (
            (b.performanceScore || 0) - (a.performanceScore || 0) ||
            b.convertedLeads - a.convertedLeads ||
            b.interestedLeads - a.interestedLeads ||
            b.totalLeads - a.totalLeads
          );
      }
    });
  }, [filteredAdvisors, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedAdvisors.length / pageSize));

  const safePage = Math.min(page, totalPages);

  const paginatedAdvisors = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return sortedAdvisors.slice(start, end);
  }, [sortedAdvisors, safePage, pageSize]);

  const topPerformerId = sortedAdvisors.length > 0 ? sortedAdvisors[0].id : null;
  const topPerformer = sortedAdvisors.length > 0 ? sortedAdvisors[0] : null;

  const startItem =
    sortedAdvisors.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, sortedAdvisors.length);

  return (
    <AdminShell
      title="Advisor Performance"
      subtitle="Track team productivity, lead quality, conversions, and follow-up activity across all advisors."
      activeTab="advisor-performance"
    >
      {/* KPI CARDS */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Total Advisors
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {summary.totalAdvisors}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Team members under admin view
          </p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Active Advisors
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {summary.activeAdvisors}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Currently active advisors
          </p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Total Leads
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {summary.totalLeads}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Leads assigned to team
          </p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Total Converted
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {summary.totalConverted}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Successful team conversions
          </p>
        </div>
      </div>

      {/* TOP PERFORMER STRIP */}
      {topPerformer ? (
        <div className="mb-6 rounded-[24px] border border-amber-200 bg-[linear-gradient(180deg,#fffdf5,#fff8e7)] p-4 shadow-[0_10px_25px_rgba(245,158,11,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Top Performer Snapshot
          </p>
          <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                ⭐ {topPerformer.name}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Leads: {topPerformer.totalLeads} · Converted: {topPerformer.convertedLeads} · Conversion: {topPerformer.conversionRate}%
              </p>
            </div>
            <p className="text-sm text-slate-600">
              Last activity:{" "}
              <span className="font-semibold text-slate-800">
                {topPerformer.lastActivity
                  ? `${topPerformer.lastActivity.activityType} · ${formatDateTime12h(
                      topPerformer.lastActivity.createdAt
                    )}`
                  : "No activity yet"}
              </span>
            </p>
          </div>
        </div>
      ) : null}

      {/* SEARCH + SORT */}
      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_180px]">
        <div className="rounded-[28px] border border-blue-100 bg-white/75 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by advisor name or mobile"
            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div className="rounded-[28px] border border-blue-100 bg-white/75 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="top-performer">Top Performer</option>
            <option value="converted">Converted High to Low</option>
            <option value="conversion-rate">Conversion % High to Low</option>
            <option value="total-leads">Total Leads High to Low</option>
            <option value="last-activity">Last Activity Newest</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>

        <div className="rounded-[28px] border border-blue-100 bg-white/75 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
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

      {/* NOTE BOX */}
      <div className="mb-6 rounded-[24px] border border-amber-200 bg-amber-50/80 p-4 shadow-[0_10px_25px_rgba(245,158,11,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          Ranking Logic
        </p>
        <h3 className="mt-2 text-base font-bold text-slate-900">
          How Star Performer is calculated
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Advisors are ranked by performance score, not just lead count.
        </p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-emerald-700">
            Converted × 5
          </span>
          <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-violet-700">
            Interested × 3
          </span>
          <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-amber-700">
            Follow Up × 1
          </span>
          <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-blue-700">
            Total Leads × 0.25
          </span>
        </div>

        <p className="mt-3 text-xs text-slate-600">
          If scores are equal, advisors are ranked by Converted leads, then Interested leads, then Total leads.
        </p>
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
                <th className="px-5 py-4 font-semibold">Advisor</th>
                <th className="px-5 py-4 font-semibold">Total</th>
                <th className="px-5 py-4 font-semibold">New</th>
                <th className="px-5 py-4 font-semibold">Follow Up</th>
                <th className="px-5 py-4 font-semibold">Interested</th>
                <th className="px-5 py-4 font-semibold">Converted</th>
                <th className="px-5 py-4 font-semibold">Closed</th>
                <th className="px-5 py-4 font-semibold">Today</th>
                <th className="px-5 py-4 font-semibold">Conversion %</th>
                <th className="px-5 py-4 font-semibold">Last Activity</th>
                <th className="px-5 py-4 font-semibold">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" className="px-5 py-8 text-sm text-slate-600">
                    Loading advisor performance...
                  </td>
                </tr>
              ) : paginatedAdvisors.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-5 py-8 text-sm text-slate-600">
                    No advisors found.
                  </td>
                </tr>
              ) : (
                paginatedAdvisors.map((advisor) => (
                  <tr
                    key={advisor.id}
                    className="border-t border-blue-100 transition hover:bg-blue-50/30"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {advisor.name}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {maskPhone(advisor.phone)}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            advisor.isActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-100 text-slate-600"
                          }`}
                        >
                          {advisor.isActive ? "Active" : "Inactive"}
                        </span>

                        {advisor.id === topPerformerId ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            ⭐ Star Performer
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                      {advisor.totalLeads}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {advisor.newLeads}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {advisor.followUpLeads}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {advisor.interestedLeads}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-emerald-700">
                      {advisor.convertedLeads}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {advisor.closedLeads}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {advisor.todayFollowUps}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-blue-700">
                      {advisor.conversionRate}%
                    </td>

                    <td className="px-5 py-4">
                      {advisor.lastActivity ? (
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            {advisor.lastActivity.activityType}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatDateTime12h(advisor.lastActivity.createdAt)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">
                          No activity yet
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/admin/advisors/${advisor.id}/leads`)
                        }
                        className="rounded-2xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                      >
                        View Leads
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
          <div className="rounded-[24px] border border-blue-100 bg-white/80 p-4 text-sm text-slate-600 shadow-sm">
            Loading advisor performance...
          </div>
        ) : paginatedAdvisors.length === 0 ? (
          <div className="rounded-[24px] border border-blue-100 bg-white/80 p-4 text-sm text-slate-600 shadow-sm">
            No advisors found.
          </div>
        ) : (
          paginatedAdvisors.map((advisor) => (
            <div
              key={advisor.id}
              className="rounded-[24px] border border-blue-100 bg-white/85 p-4 shadow-[0_10px_25px_rgba(37,99,235,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {advisor.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {maskPhone(advisor.phone)}
                  </p>
                </div>

                {advisor.id === topPerformerId ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                    ⭐ Star
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    advisor.isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-100 text-slate-600"
                  }`}
                >
                  {advisor.isActive ? "Active" : "Inactive"}
                </span>

                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Conversion {advisor.conversionRate}%
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    Total
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {advisor.totalLeads}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    Converted
                  </p>
                  <p className="mt-1 text-lg font-bold text-emerald-700">
                    {advisor.convertedLeads}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    Follow Up
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {advisor.followUpLeads}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    Interested
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {advisor.interestedLeads}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  Last Activity
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {advisor.lastActivity?.activityType || "No activity yet"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {advisor.lastActivity
                    ? formatDateTime12h(advisor.lastActivity.createdAt)
                    : "No recent update"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/admin/advisors/${advisor.id}/leads`)}
                className="mt-4 w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                View Leads
              </button>
            </div>
          ))
        )}
      </div>

      {/* PAGINATION */}
      <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-blue-100 bg-white/75 px-4 py-4 shadow-[0_10px_25px_rgba(37,99,235,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Showing <span className="font-semibold">{startItem}</span>–
          <span className="font-semibold">{endItem}</span> of{" "}
          <span className="font-semibold">{sortedAdvisors.length}</span> advisors
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

export default AdminAdvisorPerformance;