import AdminShell from "../components/AdminShell";

function AdminDashboard() {
  return (
    <AdminShell
      title="Admin Dashboard"
      subtitle="Manage advisors, templates, password reset requests, and monitor platform-wide CRM activity."
      activeTab="dashboard"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Total Advisors
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">0</p>
          <p className="mt-2 text-sm text-slate-600">
            Active advisor accounts on the platform
          </p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Total Templates
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">0</p>
          <p className="mt-2 text-sm text-slate-600">
            Company-wise templates available
          </p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Total Leads
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">0</p>
          <p className="mt-2 text-sm text-slate-600">
            Leads tracked across all advisors
          </p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Pending Requests
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">0</p>
          <p className="mt-2 text-sm text-slate-600">
            Password reset requests awaiting review
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-blue-100 bg-white/75 p-6 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
        <h2 className="text-xl font-bold text-slate-900">Admin Workspace</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This is the shared admin shell test page. Next we’ll connect real cards
          and build Advisors and Templates management screens.
        </p>
      </div>
    </AdminShell>
  );
}

export default AdminDashboard;