import { useEffect, useMemo, useState } from "react";
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

function AdminPasswordRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");

  const [activeRequest, setActiveRequest] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const res = await API.get("/admin/password-reset-requests");
      setRequests(res.data.requests || []);
    } catch (error) {
      console.error("Failed to load password reset requests:", error);
      setErrorMsg(
        error?.response?.data?.message ||
          "Failed to load password reset requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const q = search.toLowerCase();

    return requests.filter((request) => {
      const phone = request.phone || "";
      const message = request.message || "";
      const status = request.status || "";

      return (
        phone.includes(search) ||
        message.toLowerCase().includes(q) ||
        status.toLowerCase().includes(q)
      );
    });
  }, [requests, search]);

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const completedCount = requests.filter((r) => r.status === "COMPLETED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  const handleComplete = async () => {
    if (!activeRequest) return;

    if (!newPassword || newPassword.trim().length < 4) {
      setErrorMsg("Please enter a valid new password.");
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      await API.patch(
        `/admin/password-reset-requests/${activeRequest.id}/complete`,
        {
          newPassword: newPassword.trim(),
        }
      );

      setSuccessMsg("Password reset completed successfully.");
      setActiveRequest(null);
      setNewPassword("");
      await fetchRequests();
    } catch (error) {
      console.error("Failed to complete password reset:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to complete password reset."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    const confirmed = window.confirm("Reject this password reset request?");
    if (!confirmed) return;

    try {
      setErrorMsg("");
      setSuccessMsg("");

      await API.patch(
        `/admin/password-reset-requests/${requestId}/reject`
      );

      setSuccessMsg("Password reset request rejected.");
      await fetchRequests();
    } catch (error) {
      console.error("Failed to reject request:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to reject request."
      );
    }
  };

  return (
    <AdminShell
      title="Password Requests"
      subtitle="Review advisor forgot-password requests and reset passwords securely from one place."
      activeTab="passwords"
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

      {/* KPI */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[24px] border border-amber-100 bg-[linear-gradient(180deg,#ffffff,#fffaf0)] p-5 shadow-[0_10px_25px_rgba(245,158,11,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Pending
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{pendingCount}</p>
          <p className="mt-2 text-sm text-slate-600">
            Requests waiting for admin action
          </p>
        </div>

        <div className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff,#f4fff7)] p-5 shadow-[0_10px_25px_rgba(16,185,129,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Completed
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{completedCount}</p>
          <p className="mt-2 text-sm text-slate-600">
            Password resets completed successfully
          </p>
        </div>

        <div className="rounded-[24px] border border-rose-100 bg-[linear-gradient(180deg,#ffffff,#fff5f5)] p-5 shadow-[0_10px_25px_rgba(244,63,94,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
            Rejected
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{rejectedCount}</p>
          <p className="mt-2 text-sm text-slate-600">
            Requests declined or closed
          </p>
        </div>
      </div>

      {/* SEARCH */}
      <div className="mb-6 rounded-[24px] border border-blue-100 bg-white/85 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by phone, message, or status"
          className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      {/* TABLE */}
      <div className="hidden overflow-hidden rounded-[28px] border border-blue-100 bg-white/85 shadow-[0_12px_30px_rgba(37,99,235,0.05)] lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-blue-50/70">
              <tr className="text-left text-sm text-slate-700">
                <th className="px-4 py-4 font-semibold">Phone</th>
                <th className="px-4 py-4 font-semibold">Message</th>
                <th className="px-4 py-4 font-semibold">Requested At</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-sm text-slate-600">
                    Loading password requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-sm text-slate-600">
                    No password reset requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-t border-blue-100 transition hover:bg-blue-50/30"
                  >
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {request.phone}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      {request.message || "—"}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      {formatDateTime12h(request.createdAt)}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                          request.status === "PENDING"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : request.status === "COMPLETED"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-600"
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {request.status === "PENDING" ? (
                          <>
                            <button
                              onClick={() => {
                                setActiveRequest(request);
                                setNewPassword("");
                              }}
                              className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                            >
                              Reset
                            </button>

                            <button
                              onClick={() => handleReject(request.id)}
                              className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-sm text-slate-500">No actions</span>
                        )}
                      </div>
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
            Loading password requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-[24px] border border-blue-100 bg-white/85 p-4 text-sm text-slate-600 shadow-sm">
            No password reset requests found.
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className="rounded-[24px] border border-blue-100 bg-white/85 p-4 shadow-[0_10px_25px_rgba(37,99,235,0.06)]"
            >
              <h3 className="text-lg font-bold text-slate-900">{request.phone}</h3>
              <p className="mt-2 text-sm text-slate-600">
                {request.message || "—"}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                {formatDateTime12h(request.createdAt)}
              </p>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                    request.status === "PENDING"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : request.status === "COMPLETED"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-600"
                  }`}
                >
                  {request.status}
                </span>

                {request.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setActiveRequest(request);
                        setNewPassword("");
                      }}
                      className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {/* RESET MODAL */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setActiveRequest(null)}
          />

          <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.15)]">
            <div className="border-b border-blue-100 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">
                Reset Advisor Password
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Set a new password for {activeRequest.phone}
              </p>
            </div>

            <div className="p-6">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                New Password
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex gap-3 border-t border-blue-100 bg-blue-50/40 px-6 py-4">
              <button
                onClick={handleComplete}
                disabled={actionLoading}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
              >
                {actionLoading ? "Resetting..." : "Complete Reset"}
              </button>

              <button
                onClick={() => setActiveRequest(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

export default AdminPasswordRequests;