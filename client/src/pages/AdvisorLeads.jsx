import { useEffect, useMemo, useState } from "react";
import AdvisorShell from "../components/AdvisorShell";
import API from "../api/axios";
import { FaWhatsapp } from "react-icons/fa";
import {
  FiPhone,
  FiEdit,
  FiX,
  FiCalendar,
  FiFileText,
  FiMessageSquare,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

const statusStyles = {
  NEW: "bg-blue-50 text-blue-700 border-blue-200",
  FOLLOW_UP: "bg-amber-50 text-amber-700 border-amber-200",
  INTERESTED: "bg-violet-50 text-violet-700 border-violet-200",
  CONVERTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  NOT_INTERESTED: "bg-rose-50 text-rose-700 border-rose-200",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
};

function formatDateTime12h(value) {
  if (!value) return "No follow-up set";

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

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];

  for (let i = 0; i < startDay; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  return cells;
}

function formatDateKey(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

function DetailBox({ label, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-blue-100 bg-[#f8fbff] p-4 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold text-slate-900">{children}</div>
    </div>
  );
}

function LeadActionButtons({ lead, onEdit, onCall, onWhatsApp }) {
  const phone = lead?.phone || "";

  const openWhatsApp = async (e) => {
    e.stopPropagation();
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned) return;

    await onWhatsApp?.(lead);
    window.open(`https://wa.me/91${cleaned}`, "_blank");
  };

  const makeCall = async (e) => {
    e.stopPropagation();
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned) return;

    await onCall?.(lead);
    window.location.href = `tel:${cleaned}`;
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        title="Edit Lead"
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.(lead);
        }}
        className="rounded-xl border border-blue-200 bg-white p-2 text-blue-600 transition hover:bg-blue-50"
      >
        <FiEdit size={16} />
      </button>

      <button
        type="button"
        title="Send WhatsApp"
        onClick={openWhatsApp}
        className="rounded-xl border border-green-200 bg-white p-2 text-green-600 transition hover:bg-green-50"
      >
        <FaWhatsapp size={16} />
      </button>

      <button
        type="button"
        title="Call Client"
        onClick={makeCall}
        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
      >
        <FiPhone size={16} />
      </button>
    </div>
  );
}
function AdvisorLeads() {
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedLead, setSelectedLead] = useState(null);

  const [calendarCursor, setCalendarCursor] = useState(new Date());
  const [leads, setLeads] = useState([]);
  const [selectedDateLeads, setSelectedDateLeads] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [reminderDates, setReminderDates] = useState([]);
  const [remarksInput, setRemarksInput] = useState("");
  const [followUpInput, setFollowUpInput] = useState("");
  useEffect(() => {
  if (selectedLead) {
    setRemarksInput(selectedLead.remarks || "");
    setFollowUpInput(
      selectedLead.nextFollowUp
        ? selectedLead.nextFollowUp.slice(0, 16)
        : ""
    );
  }
}, [selectedLead]);

  const [kpis, setKpis] = useState({
    totalLeads: 0,
    todayFollowUps: 0,
    upcomingFollowUps: 0,
    convertedLeads: 0,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const calendarYear = calendarCursor.getFullYear();
  const calendarMonth = calendarCursor.getMonth();
  const calendarDays = getMonthDays(calendarYear, calendarMonth);

  const reminderDateSet = useMemo(
    () => new Set(reminderDates),
    [reminderDates]
  );

  const fetchLeads = async (currentPage = page, currentSearch = search, currentFilter = activeFilter) => {
    try {
      setLoading(true);
      setErrorMsg("");

      const params = {
        page: currentPage,
        limit: 10,
        search: currentSearch,
        status: currentFilter,
        selectedDate: formatDateKey(selectedDate),
        calendarMonth,
        calendarYear,
      };

      const res = await API.get("/leads/my", { params });

      setLeads(res.data.leads || []);
      setSelectedDateLeads(res.data.selectedDateLeads || []);
      setUpcomingReminders(res.data.upcomingReminders || []);
      setReminderDates(res.data.reminderDates || []);
      setKpis(
        res.data.kpis || {
          totalLeads: 0,
          todayFollowUps: 0,
          upcomingFollowUps: 0,
          convertedLeads: 0,
        }
      );
      setPagination(
        res.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        }
      );
    } catch (error) {
      console.error("Failed to load leads:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to load leads."
      );
    } finally {
      setLoading(false);
    }
  };
  const updateLeadAPI = async () => {
  try {
    await API.patch(`/leads/${selectedLead.id}`, {
      remarks: remarksInput,
      nextFollowUpAt: followUpInput,
      status: selectedLead.status,
    });

    await fetchLeads(page, search, activeFilter);
    setSelectedLead(null);
  } catch (err) {
    console.error("Update failed", err);
    alert("Failed to update lead");
  }
};

  useEffect(() => {
    fetchLeads(page, search, activeFilter);
  }, [page, selectedDate, calendarMonth, calendarYear]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
    fetchLeads(1, value, activeFilter);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setPage(1);
    fetchLeads(1, search, filter);
  };
 const createLeadActivityAPI = async ({
  lead,
  activityType,
  note = "",
}) => {
  try {
    await API.post(`/leads/${lead.id}/activities`, {
      activityType,
      note,
      sourcePage: "LEADS_PAGE",
      templateId: lead?.template?.id || null,
      nextFollowUpAt: lead?.nextFollowUp || null,
    });

    await fetchLeads(page, search, activeFilter);

    if (selectedLead?.id === lead.id) {
      const refreshed = await API.get("/leads/my", {
        params: {
          page,
          limit: 10,
          search,
          status: activeFilter,
          selectedDate: formatDateKey(selectedDate),
          calendarMonth,
          calendarYear,
        },
      });

      const updatedLead = (refreshed.data.leads || []).find(
        (item) => item.id === lead.id
      );

      if (updatedLead) {
        setSelectedLead(updatedLead);
      }
    }
  } catch (error) {
    console.error("Failed to save activity:", error);
    alert("Failed to save activity.");
  }
};

const handleCallActivity = async (lead) => {
  await createLeadActivityAPI({
    lead,
    activityType: "CALL",
    note: "Call initiated from leads page",
  });
};

const handleWhatsAppActivity = async (lead) => {
  await createLeadActivityAPI({
    lead,
    activityType: "WHATSAPP",
    note: "WhatsApp opened from leads page",
  });
};

const handleModalWhatsApp = async () => {
  if (!selectedLead?.phone) return;

  const cleaned = selectedLead.phone.replace(/\D/g, "");
  if (!cleaned) return;

  await handleWhatsAppActivity(selectedLead);
  window.open(`https://wa.me/91${cleaned}`, "_blank");
};

const handleModalCall = async () => {
  if (!selectedLead?.phone) return;

  const cleaned = selectedLead.phone.replace(/\D/g, "");
  if (!cleaned) return;

  await handleCallActivity(selectedLead);
  window.location.href = `tel:${cleaned}`;
};
  return (
    <AdvisorShell
      title="My Leads"
      subtitle="Track leads, monitor follow-ups, and manage daily advisor activity from one place."
      activeTab="leads"
    >
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Total Leads
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{kpis.totalLeads}</p>
          <p className="mt-2 text-sm text-slate-600">
            All leads assigned to you
          </p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Today Follow-ups
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {kpis.todayFollowUps}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Scheduled for today
          </p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Upcoming
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {kpis.upcomingFollowUps}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Future follow-up reminders
          </p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Converted
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {kpis.convertedLeads}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Successfully converted leads
          </p>
        </div>
      </div>

      {errorMsg ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="min-w-0">
          <div className="mb-6 rounded-[28px] border border-blue-100 bg-white/75 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by name, phone, company, or source"
                className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 lg:max-w-md"
              />

              <div className="flex flex-wrap gap-2">
                {["ALL", "NEW", "FOLLOW_UP", "INTERESTED", "CONVERTED"].map(
                  (filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => handleFilterChange(filter)}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        activeFilter === filter
                          ? "bg-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.18)]"
                          : "border border-blue-100 bg-white text-slate-700 hover:bg-blue-50"
                      }`}
                    >
                      {filter === "FOLLOW_UP" ? "FOLLOW UP" : filter}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-[28px] border border-blue-100 bg-white/80 shadow-[0_12px_30px_rgba(37,99,235,0.05)] lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-blue-50/70">
                  <tr className="text-left text-sm text-slate-700">
                    <th className="px-5 py-4 font-semibold">Lead</th>
                    <th className="px-5 py-4 font-semibold">Company</th>
                    <th className="px-5 py-4 font-semibold">Source</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Next Follow-up</th>
                    <th className="px-5 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-5 py-8 text-sm text-slate-600">
                        Loading leads...
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-5 py-8 text-sm text-slate-600">
                        No leads found.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="cursor-pointer border-t border-blue-100 transition hover:bg-blue-50/40"
                        title="Open lead details"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {lead.name}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {maskPhone(lead.phone)} · Age {lead.age ?? "-"}
                          </div>
                          <div className="mt-1 text-xs font-medium text-blue-700">
                            Template: {lead.template?.title || "No template"}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
  Latest:{" "}
  {lead.latestActivity
    ? `${lead.latestActivity.activityType} · ${formatDateTime12h(
        lead.latestActivity.createdAt
      )}`
    : "No activity yet"}
</div>

<div className="mt-1 text-[11px] text-slate-500">
  Note: {lead.remarks || "No remarks yet"}
</div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {lead.company?.name || "-"}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                            {lead.source}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              statusStyles[lead.status] || statusStyles.CLOSED
                            }`}
                          >
                            {lead.status.replace("_", " ")}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {formatDateTime12h(lead.nextFollowUp)}
                        </td>

                        <td className="px-5 py-4">
                          <LeadActionButtons
  lead={lead}
  onEdit={(lead) => setSelectedLead(lead)}
  onCall={handleCallActivity}
  onWhatsApp={handleWhatsAppActivity}
/>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4 lg:hidden">
            {loading ? (
              <div className="rounded-[24px] border border-blue-100 bg-white/80 p-4 text-sm text-slate-600 shadow-sm">
                Loading leads...
              </div>
            ) : leads.length === 0 ? (
              <div className="rounded-[24px] border border-blue-100 bg-white/80 p-4 text-sm text-slate-600 shadow-sm">
                No leads found.
              </div>
            ) : (
              leads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="cursor-pointer rounded-[24px] border border-blue-100 bg-white/80 p-4 shadow-sm transition hover:bg-blue-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {lead.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {maskPhone(lead.phone)} · Age {lead.age ?? "-"}
                      </p>
                      <p className="mt-1 text-xs font-medium text-blue-700">
                        Template: {lead.template?.title || "No template"}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
  Latest:{" "}
  {lead.latestActivity
    ? `${lead.latestActivity.activityType} · ${formatDateTime12h(
        lead.latestActivity.createdAt
      )}`
    : "No activity yet"}
</p>

<p className="mt-1 text-[11px] text-slate-500">
  Note: {lead.remarks || "No remarks yet"}
</p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        statusStyles[lead.status] || statusStyles.CLOSED
                      }`}
                    >
                      {lead.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p>Company: {lead.company?.name || "-"}</p>
                    <p>Source: {lead.source}</p>
                    <p>Next: {formatDateTime12h(lead.nextFollowUp)}</p>
                  </div>

                  <div className="mt-4">
                    <LeadActionButtons
  lead={lead}
  onEdit={(lead) => setSelectedLead(lead)}
  onCall={handleCallActivity}
  onWhatsApp={handleWhatsAppActivity}
/>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PAGINATION */}
          <div className="mt-5 flex flex-col gap-3 rounded-[24px] border border-blue-100 bg-white/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Showing page <span className="font-semibold">{pagination.page}</span> of{" "}
              <span className="font-semibold">{pagination.totalPages}</span> · Total leads:{" "}
              <span className="font-semibold">{pagination.total}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, pagination.totalPages))
                }
                className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-blue-100 bg-white/80 p-5 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  Reminder Planner
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  Mini Calendar
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarCursor(
                      new Date(calendarYear, calendarMonth - 1, 1)
                    )
                  }
                  className="rounded-xl border border-blue-200 bg-white p-2 text-slate-700 transition hover:bg-blue-50"
                >
                  <FiChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCalendarCursor(
                      new Date(calendarYear, calendarMonth + 1, 1)
                    )
                  }
                  className="rounded-xl border border-blue-200 bg-white p-2 text-slate-700 transition hover:bg-blue-50"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            </div>

            <p className="mt-2 text-sm text-slate-600">
              Dates with follow-ups show blue dots. Click a date to view saved reminders.
            </p>

            <div className="mt-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">
                  {calendarCursor.toLocaleString("en-IN", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-7 gap-2">
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="h-10" />;
                  }

                  const dateKey = formatDateKey(date);
                  const hasReminder = reminderDateSet.has(dateKey);
                  const isSelected =
                    date.toDateString() === selectedDate.toDateString();

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                      title={
                        hasReminder
                          ? "Follow-up exists on this day"
                          : "No follow-up on this day"
                      }
                      className={`relative h-10 rounded-xl text-sm font-medium transition ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-[#f8fbff] text-slate-700 hover:bg-blue-50"
                      }`}
                    >
                      {date.getDate()}
                      {hasReminder && (
                        <span
                          className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                            isSelected ? "bg-white" : "bg-blue-600"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-blue-100 bg-white/80 p-5 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Selected Date
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              {selectedDate.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </h2>

            <div className="mt-4 space-y-3">
              {selectedDateLeads.length === 0 ? (
                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-4 text-sm text-slate-600">
                  No follow-ups scheduled on this date.
                </div>
              ) : (
                selectedDateLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3"
                  >
                    <p className="font-semibold text-slate-900">{lead.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDateTime12h(lead.nextFollowUp)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {lead.remarks || "No remarks"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-blue-100 bg-white/80 p-5 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Upcoming Reminders
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Follow-up Highlights
            </h2>

            <div className="mt-4 space-y-3">
              {upcomingReminders.length === 0 ? (
                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-4 text-sm text-slate-600">
                  No upcoming reminders found.
                </div>
              ) : (
                upcomingReminders.map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3"
                  >
                    <p className="font-semibold text-slate-900">{lead.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDateTime12h(lead.nextFollowUp)}
                    </p>
                    <p className="mt-1 text-xs text-blue-700">
                      {lead.template?.title || "No template"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedLead(null)}
          />

          <div className="relative mx-4 w-full max-w-2xl overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between border-b border-blue-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedLead.name}
                </h2>
                <p className="text-sm text-slate-500">
                  Lead details & follow-up
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="text-slate-400 transition hover:text-slate-700"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="max-h-[65vh] space-y-4 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailBox label="Phone">{selectedLead.phone}</DetailBox>
                <DetailBox label="Age">{selectedLead.age ?? "-"}</DetailBox>
                <DetailBox label="Company">
                  {selectedLead.company?.name || "-"}
                </DetailBox>
                <DetailBox label="Source">{selectedLead.source}</DetailBox>

                <DetailBox label="Status" className="sm:col-span-2">
  <select
    value={selectedLead.status}
    onChange={(e) =>
      setSelectedLead((prev) => ({
        ...prev,
        status: e.target.value,
      }))
    }
    className="w-full rounded-xl border border-blue-200 bg-white p-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400"
  >
    <option value="NEW">NEW</option>
    <option value="FOLLOW_UP">FOLLOW UP</option>
    <option value="INTERESTED">INTERESTED</option>
    <option value="CONVERTED">CONVERTED</option>
    <option value="NOT_INTERESTED">NOT INTERESTED</option>
    <option value="CLOSED">CLOSED</option>
  </select>
</DetailBox>

                <DetailBox label="Shared Template" className="sm:col-span-2">
                  <div className="flex items-start gap-2">
                    <FiFileText className="mt-0.5 text-blue-600" size={16} />
                    <span>{selectedLead.template?.title || "No template"}</span>
                  </div>
                </DetailBox>

               <DetailBox label="Next Follow-up" className="sm:col-span-2">
  <input
    type="datetime-local"
    value={followUpInput}
    onChange={(e) => setFollowUpInput(e.target.value)}
    className="w-full rounded-xl border border-blue-200 p-2 text-sm outline-none"
  />
</DetailBox>

                <DetailBox label="Remarks" className="sm:col-span-2">
  <textarea
    value={remarksInput}
    onChange={(e) => setRemarksInput(e.target.value)}
    className="w-full rounded-xl border border-blue-200 p-2 text-sm outline-none"
  />
</DetailBox>
<DetailBox label="Latest Activity" className="sm:col-span-2">
  {selectedLead.latestActivity ? (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-slate-900">
        {selectedLead.latestActivity.activityType}
      </p>
      <p className="text-xs text-slate-500">
        {formatDateTime12h(selectedLead.latestActivity.createdAt)}
      </p>
      <p className="text-sm text-slate-600">
        {selectedLead.latestActivity.note || "No note"}
      </p>
    </div>
  ) : (
    <p className="text-sm text-slate-500">No activity yet.</p>
  )}
</DetailBox>

<DetailBox label="Activity Timeline" className="sm:col-span-2">
  <div className="space-y-3">
    {selectedLead.activityTimeline?.length ? (
      selectedLead.activityTimeline.map((activity) => (
        <div
          key={activity.id}
          className="rounded-xl border border-blue-100 bg-white px-3 py-3"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">
              {activity.activityType}
            </p>
            <p className="text-xs text-slate-500">
              {formatDateTime12h(activity.createdAt)}
            </p>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {activity.note || "No note"}
          </p>
          {activity.template?.title ? (
            <p className="mt-1 text-xs text-blue-700">
              Template: {activity.template.title}
            </p>
          ) : null}
        </div>
      ))
    ) : (
      <p className="text-sm text-slate-500">No activity history available.</p>
    )}
  </div>
</DetailBox>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-blue-100 bg-blue-50/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  title="Edit Lead"
                  className="rounded-xl border border-blue-200 bg-white p-2 text-blue-600 transition hover:bg-blue-50"
                >
                  <FiEdit size={18} />
                </button>
<button
  type="button"
  title="Send WhatsApp"
  onClick={handleModalWhatsApp}
  className="rounded-xl border border-green-200 bg-white p-2 text-green-600 transition hover:bg-green-50"
>
  <FaWhatsapp size={18} />
</button>

                <button
  type="button"
  title="Call Client"
  onClick={handleModalCall}
  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
>
  <FiPhone size={18} />
</button>
              </div>

              <div className="flex flex-wrap gap-3">

                <button
  onClick={updateLeadAPI}
  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
>
  Save Changes
</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdvisorShell>
  );
}

export default AdvisorLeads;