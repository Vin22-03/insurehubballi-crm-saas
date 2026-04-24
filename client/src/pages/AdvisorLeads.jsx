import { useEffect, useMemo, useState } from "react";
import AdvisorShell from "../components/AdvisorShell";
import API from "../api/axios";
import { FaWhatsapp } from "react-icons/fa";
import { createPortal } from "react-dom";
import {
  FiPhone,
  FiEdit,
  FiX,
  FiFileText,
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
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DetailBox({ label, children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-blue-100 bg-[#f8fbff] p-4 ${className}`}
    >
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

  const reminderDateSet = useMemo(() => new Set(reminderDates), [reminderDates]);

  useEffect(() => {
    if (selectedLead) {
      setRemarksInput(selectedLead.remarks || "");
      setFollowUpInput(
        selectedLead.nextFollowUp ? selectedLead.nextFollowUp.slice(0, 16) : ""
      );
    }
  }, [selectedLead]);

  useEffect(() => {
  if (!selectedLead) return;

  const oldOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  return () => {
    document.body.style.overflow = oldOverflow;
  };
}, [selectedLead]);

  const fetchLeads = async (
    currentPage = page,
    currentSearch = search,
    currentFilter = activeFilter
  ) => {
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
      setErrorMsg(error?.response?.data?.message || "Failed to load leads.");
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

  const createLeadActivityAPI = async ({ lead, activityType, note = "" }) => {
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
      subtitle=""
      activeTab="leads"
    >
      {errorMsg ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <aside className="space-y-4">
          <section className="rounded-[22px] border border-blue-100 bg-white/80 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
                  Reminder Planner
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
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
                  <FiChevronLeft size={15} />
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
                  <FiChevronRight size={15} />
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-600">
              Dates with blue dots have follow-ups.
            </p>

            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">
                  {calendarCursor.toLocaleString("en-IN", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-1.5">
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="h-9" />;
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
                      className={`relative h-9 rounded-xl text-xs font-semibold transition ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)]"
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

          <section className="rounded-[22px] border border-blue-100 bg-white/80 p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
              Selected Date
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {selectedDate.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </h2>

            <div className="mt-3 space-y-2">
              {selectedDateLeads.length === 0 ? (
                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-3 py-3 text-xs text-slate-600">
                  No follow-ups scheduled on this date.
                </div>
              ) : (
                selectedDateLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-3 py-3"
                  >
                    <p className="text-sm font-bold text-slate-900">
                      {lead.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
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

          <section className="rounded-[22px] border border-blue-100 bg-white/80 p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
              Upcoming Reminders
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Follow-up Highlights
            </h2>

            <div className="mt-3 space-y-2">
              {upcomingReminders.length === 0 ? (
                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-3 py-3 text-xs text-slate-600">
                  No upcoming reminders found.
                </div>
              ) : (
                upcomingReminders.slice(0, 4).map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-3 py-3"
                  >
                    <p className="text-sm font-bold text-slate-900">
                      {lead.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatDateTime12h(lead.nextFollowUp)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-blue-700">
                      {lead.template?.title || "No template"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 rounded-[22px] border border-blue-100 bg-white/75 p-3 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by name, phone, company, or source"
                className="w-full rounded-xl border border-blue-100 bg-[#f8fbff] px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 lg:max-w-md"
              />

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold">
  {["ALL", "NEW", "FOLLOW_UP", "INTERESTED", "CONVERTED"].map((filter) => (
    <button
      key={filter}
      type="button"
      onClick={() => handleFilterChange(filter)}
      className={`relative px-1 py-[2px] transition ${
        activeFilter === filter
          ? "text-blue-700 font-bold after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-full after:bg-blue-600"
          : "text-slate-500"
      }`}
    >
      {filter === "FOLLOW_UP" ? "FOLLOW" : filter}
    </button>
  ))}
</div>
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-[24px] border border-blue-100 bg-white/80 shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-blue-50/70">
                  <tr className="text-left text-sm text-slate-700">
                    <th className="px-4 py-3 font-semibold">Lead</th>
                    <th className="px-4 py-3 font-semibold">Company</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Next Follow-up</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-7 text-sm text-slate-600">
                        Loading leads...
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-7 text-sm text-slate-600">
                        No leads found.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="border-t border-blue-100 transition hover:bg-blue-50/40"
                      >
                        <td className="px-4 py-3">
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

                        <td className="px-4 py-3 text-sm text-slate-700">
                          {lead.company?.name || "-"}
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                            {lead.source}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span
  className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-[2px] text-[10px] font-bold leading-none ${
    statusStyles[lead.status] || statusStyles.CLOSED
  }`}
>
                            {lead.status.replace("_", " ")}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatDateTime12h(lead.nextFollowUp)}
                        </td>

                        <td className="px-4 py-3">
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

          <div className="space-y-3 lg:hidden">
            {loading ? (
              <div className="rounded-[20px] border border-blue-100 bg-white/80 p-3 text-sm text-slate-600 shadow-sm">
                Loading leads...
              </div>
            ) : leads.length === 0 ? (
              <div className="rounded-[20px] border border-blue-100 bg-white/80 p-3 text-sm text-slate-600 shadow-sm">
                No leads found.
              </div>
            ) : (
              leads.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-[20px] border border-blue-100 bg-white/80 p-3 shadow-sm transition hover:bg-blue-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-900">
                        {lead.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600">
                        {maskPhone(lead.phone)} · Age {lead.age ?? "-"}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-blue-700">
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
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                        statusStyles[lead.status] || statusStyles.CLOSED
                      }`}
                    >
                      {lead.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <p>Company: {lead.company?.name || "-"}</p>
                    <p>Source: {lead.source}</p>
                    <p>Next: {formatDateTime12h(lead.nextFollowUp)}</p>
                  </div>

                  <div className="mt-3">
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

          <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-blue-100 bg-white/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-600">
              Page <span className="font-semibold">{pagination.page}</span> of{" "}
              <span className="font-semibold">{pagination.totalPages}</span> · Total:{" "}
              <span className="font-semibold">{pagination.total}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, pagination.totalPages))
                }
                className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Total Leads", kpis.totalLeads, "All assigned"],
          ["Today", kpis.todayFollowUps, "Follow-ups"],
          ["Upcoming", kpis.upcomingFollowUps, "Reminders"],
          ["Converted", kpis.convertedLeads, "Success"],
        ].map(([label, value, sub]) => (
          <div
            key={label}
            className="rounded-2xl border border-blue-100 bg-white/80 px-4 py-3 shadow-sm"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{sub}</p>
          </div>
        ))}
      </div>

      {selectedLead &&
  createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 sm:px-4">
      <div
        className="absolute inset-0"
        onClick={() => setSelectedLead(null)}
      />

      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-[0_30px_80px_rgba(0,0,0,0.2)] sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-[24px]">
        <div className="shrink-0 flex items-center justify-between border-b border-blue-100 px-5 py-4">
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

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
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
          </div>
        </div>

        <div className="shrink-0 flex flex-col gap-4 border-t border-blue-100 bg-blue-50/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              title="Send WhatsApp"
              onClick={handleModalWhatsApp}
              className="rounded-xl border border-green-200 bg-white p-2 text-green-600"
            >
              <FaWhatsapp size={18} />
            </button>

            <button
              type="button"
              title="Call Client"
              onClick={handleModalCall}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700"
            >
              <FiPhone size={18} />
            </button>
          </div>

          <button
            onClick={updateLeadAPI}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  )}
    </AdvisorShell>
  );
}

export default AdvisorLeads;
