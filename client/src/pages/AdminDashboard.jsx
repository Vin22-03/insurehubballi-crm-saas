import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "../components/AdminShell";
import API from "../api/axios";
import {
  FiArrowRight,
  FiAlertTriangle,
  FiUsers,
  FiFileText,
  FiPhoneCall,
  FiShield,
} from "react-icons/fi";

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

function AdminDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [performanceSummary, setPerformanceSummary] = useState({
    totalAdvisors: 0,
    activeAdvisors: 0,
    totalLeads: 0,
    totalConverted: 0,
  });

  const [advisorPerformance, setAdvisorPerformance] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [passwordRequests, setPasswordRequests] = useState([]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const [performanceRes, templatesRes, contactsRes, passwordRes] =
        await Promise.all([
          API.get("/admin/advisors/performance"),
          API.get("/admin/templates"),
          API.get("/contacts"),
          API.get("/admin/password-reset-requests"),
        ]);

      setPerformanceSummary(
        performanceRes.data.summary || {
          totalAdvisors: 0,
          activeAdvisors: 0,
          totalLeads: 0,
          totalConverted: 0,
        }
      );

      setAdvisorPerformance(performanceRes.data.advisors || []);
      setTemplates(templatesRes.data.templates || []);
      setContacts(contactsRes.data.contacts || []);
      setPasswordRequests(passwordRes.data.requests || []);
    } catch (error) {
      console.error("Failed to load admin dashboard:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const topPerformer = useMemo(() => {
    if (!advisorPerformance.length) return null;

    const sorted = [...advisorPerformance].sort((a, b) => {
      const aScore =
        (a.convertedLeads || 0) * 5 +
        (a.interestedLeads || 0) * 3 +
        (a.followUpLeads || 0) * 1 +
        (a.totalLeads || 0) * 0.25;

      const bScore =
        (b.convertedLeads || 0) * 5 +
        (b.interestedLeads || 0) * 3 +
        (b.followUpLeads || 0) * 1 +
        (b.totalLeads || 0) * 0.25;

      return bScore - aScore;
    });

    return sorted[0];
  }, [advisorPerformance]);

  const leaderboard = useMemo(() => {
    const scored = advisorPerformance.map((advisor) => ({
      ...advisor,
      performanceScore:
        (advisor.convertedLeads || 0) * 5 +
        (advisor.interestedLeads || 0) * 3 +
        (advisor.followUpLeads || 0) * 1 +
        (advisor.totalLeads || 0) * 0.25,
    }));

    return scored
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 3);
  }, [advisorPerformance]);

  const pipeline = useMemo(() => {
    return advisorPerformance.reduce(
      (acc, advisor) => {
        acc.newLeads += advisor.newLeads || 0;
        acc.followUpLeads += advisor.followUpLeads || 0;
        acc.interestedLeads += advisor.interestedLeads || 0;
        acc.convertedLeads += advisor.convertedLeads || 0;
        acc.closedLeads += advisor.closedLeads || 0;
        return acc;
      },
      {
        newLeads: 0,
        followUpLeads: 0,
        interestedLeads: 0,
        convertedLeads: 0,
        closedLeads: 0,
      }
    );
  }, [advisorPerformance]);

  const contactInsights = useMemo(() => {
    const totalContacts = contacts.length;
    const importedContacts = contacts.filter(
      (contact) => contact.importSource === "EXCEL"
    ).length;
    const manualContacts = contacts.filter(
      (contact) => contact.importSource === "MANUAL"
    ).length;
    const convertedContacts = contacts.filter((contact) => contact.hasLead).length;

    const contactConversionRate =
      totalContacts > 0
        ? Number(((convertedContacts / totalContacts) * 100).toFixed(1))
        : 0;

    return {
      totalContacts,
      importedContacts,
      manualContacts,
      convertedContacts,
      contactConversionRate,
    };
  }, [contacts]);

  const recentActivity = useMemo(() => {
    return advisorPerformance
      .filter((advisor) => advisor.lastActivity)
      .sort(
        (a, b) =>
          new Date(b.lastActivity?.createdAt || 0) -
          new Date(a.lastActivity?.createdAt || 0)
      )
      .slice(0, 5);
  }, [advisorPerformance]);

  const adminAlerts = useMemo(() => {
    const alerts = [];

    const inactiveAdvisors = advisorPerformance.filter(
      (advisor) => !advisor.lastActivity
    ).length;

    const zeroLeadAdvisors = advisorPerformance.filter(
      (advisor) => (advisor.totalLeads || 0) === 0
    ).length;

    const pendingPasswordCount = passwordRequests.filter(
      (request) => request.status === "PENDING"
    ).length;

    const overdueFollowUps = advisorPerformance.reduce(
      (sum, advisor) => sum + (advisor.todayFollowUps || 0),
      0
    );

    if (inactiveAdvisors > 0) {
      alerts.push(`${inactiveAdvisors} advisor(s) have no recorded activity yet.`);
    }

    if (zeroLeadAdvisors > 0) {
      alerts.push(`${zeroLeadAdvisors} advisor(s) currently have zero assigned leads.`);
    }

    if (pendingPasswordCount > 0) {
      alerts.push(`${pendingPasswordCount} password reset request(s) are pending review.`);
    }

    if (overdueFollowUps > 0) {
      alerts.push(`${overdueFollowUps} follow-up item(s) are due today across the team.`);
    }

    return alerts;
  }, [advisorPerformance, passwordRequests]);

  const overallConversionRate =
    performanceSummary.totalLeads > 0
      ? Number(
          (
            (performanceSummary.totalConverted / performanceSummary.totalLeads) *
            100
          ).toFixed(1)
        )
      : 0;

  const estimatedPremiumPipeline = performanceSummary.totalLeads * 50000;

  return (
    <AdminShell
      title="Admin Dashboard"
      subtitle="Track advisor productivity, lead movement, contact quality, and key admin actions from one premium control center."
      activeTab="dashboard"
    >
      {errorMsg ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {/* STRATEGIC KPI CARDS */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
       <KpiCard
  label="Pending Password Requests"
  value={
    loading
      ? "…"
      : passwordRequests.filter((request) => request.status === "PENDING").length
  }
  note="Advisor password reset requests awaiting admin review"
/>
        <KpiCard
          label="Top Performing Advisor"
          value={loading ? "…" : topPerformer?.name || "No data"}
          note={
            loading
              ? "Loading..."
              : topPerformer
              ? `${topPerformer.convertedLeads || 0} converted · ${
                  topPerformer.totalLeads || 0
                } total leads`
              : "No advisor data available yet"
          }
        />
        <KpiCard
          label="Overall Conversion Rate"
          value={loading ? "…" : `${overallConversionRate}%`}
          note="Converted leads out of total leads across all advisors"
        />
        <KpiCard
          label="Admin Alerts"
          value={loading ? "…" : adminAlerts.length}
          note="Quick signals that need admin attention"
        />
      </div>

      {/* LEADERBOARD + PIPELINE */}
      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,249,255,0.96))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Advisor Leaderboard
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">
                Top 3 performers
              </h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin/advisors/performance")}
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-blue-50 active:translate-y-0 active:scale-[0.99]"
            >
              View Performance
              <FiArrowRight size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <EmptyPanel text="Loading advisor leaderboard..." />
            ) : leaderboard.length === 0 ? (
              <EmptyPanel text="No advisor performance data available yet." />
            ) : (
              leaderboard.map((advisor, index) => (
                <div
                  key={advisor.id}
                  className="rounded-[24px] border border-blue-100 bg-white/85 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-slate-900">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}{" "}
                        {advisor.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {advisor.totalLeads || 0} leads ·{" "}
                        {advisor.convertedLeads || 0} converted
                      </p>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                        Conversion
                      </p>
                      <p className="mt-1 text-base font-bold text-slate-900">
                        {advisor.conversionRate || 0}%
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,249,255,0.96))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            Lead Pipeline
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Current lead movement
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <PipelineCard label="New" value={pipeline.newLeads} tone="blue" />
            <PipelineCard label="Follow Up" value={pipeline.followUpLeads} tone="amber" />
            <PipelineCard label="Interested" value={pipeline.interestedLeads} tone="violet" />
            <PipelineCard label="Converted" value={pipeline.convertedLeads} tone="emerald" />
            <PipelineCard label="Closed" value={pipeline.closedLeads} tone="slate" />
          </div>

          <div className="mt-5 rounded-[24px] border border-blue-100 bg-white/85 p-4">
            <p className="text-sm text-slate-600">
              This funnel helps admin see where the team is getting stuck — whether leads are piling up at new stage, follow-up stage, or moving well into conversion.
            </p>
          </div>
        </section>
      </div>

      {/* ACTIVITY + CONTACT INSIGHTS */}
      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,249,255,0.96))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Recent CRM Activity
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">
                Latest advisor actions
              </h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin/leads")}
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-blue-50 active:translate-y-0 active:scale-[0.99]"
            >
              Open Leads
              <FiArrowRight size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <EmptyPanel text="Loading recent activity..." />
            ) : recentActivity.length === 0 ? (
              <EmptyPanel text="No activity recorded yet." />
            ) : (
              recentActivity.map((advisor) => (
                <div
                  key={advisor.id}
                  className="rounded-[24px] border border-blue-100 bg-white/85 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {advisor.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {advisor.lastActivity?.activityType || "No activity"}
                      </p>
                    </div>

                    <span className="text-xs text-slate-500">
                      {formatDateTime12h(advisor.lastActivity?.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,249,255,0.96))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Contact Insights
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">
                Contact quality snapshot
              </h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin/contacts")}
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-blue-50 active:translate-y-0 active:scale-[0.99]"
            >
              View Contacts
              <FiArrowRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InsightBox
              label="Total Contacts"
              value={contactInsights.totalContacts}
              tone="blue"
            />
            <InsightBox
              label="Imported Contacts"
              value={contactInsights.importedContacts}
              tone="sky"
            />
            <InsightBox
              label="Manual Contacts"
              value={contactInsights.manualContacts}
              tone="violet"
            />
            <InsightBox
              label="Contact Conversion"
              value={`${contactInsights.contactConversionRate}%`}
              tone="emerald"
            />
          </div>
        </section>
      </div>

      {/* ALERTS + QUICK ACTIONS */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,249,255,0.96))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
              <FiAlertTriangle size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Admin Action Center
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Alerts requiring attention
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <EmptyPanel text="Loading alerts..." />
            ) : adminAlerts.length === 0 ? (
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800">
                No urgent alerts right now. Team activity looks healthy.
              </div>
            ) : (
              adminAlerts.map((alert, index) => (
                <div
                  key={index}
                  className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900"
                >
                  {alert}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,249,255,0.96))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Quick Actions
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Jump to admin workflows
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <QuickActionCard
              icon={<FiUsers size={20} />}
              title="Advisor Management"
              desc="Create, edit, reset, and control advisor accounts."
              onClick={() => navigate("/admin/advisors")}
            />
            <QuickActionCard
              icon={<FiFileText size={20} />}
              title="Templates"
              desc="Manage insurance templates and company message logic."
              onClick={() => navigate("/admin/templates")}
            />
            <QuickActionCard
              icon={<FiPhoneCall size={20} />}
              title="Contacts Monitoring"
              desc="Inspect imported and manual contacts across advisors."
              onClick={() => navigate("/admin/contacts")}
            />
            <QuickActionCard
              icon={<FiShield size={20} />}
              title="Password Requests"
              desc="Review pending reset requests and user security issues."
              onClick={() => navigate("/admin/password-requests")}
            />
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function KpiCard({ label, value, note }) {
  return (
    <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-600">{note}</p>
    </div>
  );
}

function PipelineCard({ label, value, tone = "blue" }) {
  const toneMap = {
    blue: "border-blue-100 bg-blue-50/70 text-blue-700",
    amber: "border-amber-100 bg-amber-50/70 text-amber-700",
    violet: "border-violet-100 bg-violet-50/70 text-violet-700",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    slate: "border-slate-100 bg-slate-100/70 text-slate-700",
  };

  return (
    <div className={`rounded-[22px] border p-4 ${toneMap[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}

function InsightBox({ label, value, tone = "blue" }) {
  const toneMap = {
    blue: "border-blue-100 bg-blue-50/70 text-blue-700",
    sky: "border-sky-100 bg-sky-50/70 text-sky-700",
    violet: "border-violet-100 bg-violet-50/70 text-violet-700",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
  };

  return (
    <div className={`rounded-[22px] border p-4 ${toneMap[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}

function QuickActionCard({ icon, title, desc, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[24px] border border-blue-100 bg-white/85 p-4 text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40 active:translate-y-0 active:scale-[0.99]"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
    </button>
  );
}

function EmptyPanel({ text }) {
  return (
    <div className="rounded-[24px] border border-blue-100 bg-white/85 p-4 text-sm text-slate-600">
      {text}
    </div>
  );
}

export default AdminDashboard;