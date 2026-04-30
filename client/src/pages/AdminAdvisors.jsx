import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import API from "../api/axios";

const initialForm = {
  name: "",
  phone: "",
  password: "",
  advisorUrl: "",
  companyIds: [],
};

function AdminAdvisors() {
  const [companies, setCompanies] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit | password
  const [selectedAdvisor, setSelectedAdvisor] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [passwordForm, setPasswordForm] = useState({ newPassword: "" });

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const [companiesRes, advisorsRes] = await Promise.all([
        API.get("/admin/companies"),
        API.get("/admin/advisors"),
      ]);

      setCompanies(companiesRes.data.companies || []);
      setAdvisors(advisorsRes.data.advisors || []);
    } catch (error) {
      console.error("Failed to load advisors data:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to load advisors data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const filteredAdvisors = useMemo(() => {
    return advisors.filter((advisor) => {
      const matchSearch =
        advisor.name.toLowerCase().includes(search.toLowerCase()) ||
        advisor.phone.includes(search);

      const matchStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "ACTIVE"
          ? advisor.isActive
          : !advisor.isActive;

      return matchSearch && matchStatus;
    });
  }, [advisors, search, statusFilter]);

  const openCreateModal = () => {
    setMode("create");
    setSelectedAdvisor(null);
    setForm(initialForm);
    setPasswordForm({ newPassword: "" });
    setErrorMsg("");
    setSuccessMsg("");
    setShowModal(true);
  };

  const openEditModal = (advisor) => {
    setMode("edit");
    setSelectedAdvisor(advisor);
    setForm({
      name: advisor.name,
      phone: advisor.phone,
      password: "",
      companyIds: advisor.companies?.map((c) => c.id) || [],
    });
    setPasswordForm({ newPassword: "" });
    setErrorMsg("");
    setSuccessMsg("");
    setShowModal(true);
  };

  const openPasswordModal = (advisor) => {
    setMode("password");
    setSelectedAdvisor(advisor);
    setPasswordForm({ newPassword: "" });
    setErrorMsg("");
    setSuccessMsg("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAdvisor(null);
    setForm(initialForm);
    setPasswordForm({ newPassword: "" });
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCompanyToggle = (companyId) => {
    setForm((prev) => {
      const exists = prev.companyIds.includes(companyId);
      return {
        ...prev,
        companyIds: exists
          ? prev.companyIds.filter((id) => id !== companyId)
          : [...prev.companyIds, companyId],
      };
    });
  };

  const handleCreateOrEdit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setErrorMsg("");
      setSuccessMsg("");

      if (mode === "create") {
        await API.post("/admin/advisors", {
          name: form.name.trim(),
          phone: form.phone.trim(),
          password: form.password,
          companyIds: form.companyIds,
        });
        setSuccessMsg("Advisor created successfully.");
      }

      if (mode === "edit" && selectedAdvisor) {
        await API.patch(`/admin/advisors/${selectedAdvisor.id}`, {
          name: form.name.trim(),
          phone: form.phone.trim(),
          advisorUrl: form.advisorUrl?.trim() || null,
          companyIds: form.companyIds,
        });
        setSuccessMsg("Advisor updated successfully.");
      }

      await fetchInitialData();
      closeModal();
    } catch (error) {
      console.error("Save advisor failed:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to save advisor."
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setErrorMsg("");
      setSuccessMsg("");

      await API.patch(`/admin/advisors/${selectedAdvisor.id}/password`, {
        newPassword: passwordForm.newPassword,
      });

      await fetchInitialData();
      closeModal();
    } catch (error) {
      console.error("Reset password failed:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to reset password."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (advisor) => {
    try {
      setErrorMsg("");
      setSuccessMsg("");

      await API.patch(`/admin/advisors/${advisor.id}/status`);
      await fetchInitialData();
    } catch (error) {
      console.error("Toggle advisor status failed:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to update advisor status."
      );
    }
  };

  return (
    <AdminShell
      title="Advisor Management"
      subtitle="Create, update, and manage advisor access, assigned companies, and passwords."
      activeTab="advisors"
    >
      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-blue-100 bg-white/70 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)] lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[520px]">
          <input
            type="text"
            placeholder="Search by advisor name or mobile"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="ALL">All Advisors</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>

        <button
          onClick={openCreateModal}
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.24)] transition hover:bg-blue-700"
        >
          + Add Advisor
        </button>
      </div>

      {errorMsg ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-[28px] border border-blue-100 bg-white/75 shadow-[0_12px_30px_rgba(37,99,235,0.05)] lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-blue-50/70">
              <tr className="text-left text-sm text-slate-700">
                <th className="px-5 py-4 font-semibold">Advisor</th>
                <th className="px-5 py-4 font-semibold">Mobile</th>
                <th className="px-5 py-4 font-semibold">Companies</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Password Flag</th>
                <th className="px-5 py-4 font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-6 text-sm text-slate-600">
                    Loading advisors...
                  </td>
                </tr>
              ) : filteredAdvisors.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-6 text-sm text-slate-600">
                    No advisors found.
                  </td>
                </tr>
              ) : (
                filteredAdvisors.map((advisor) => (
                  <tr key={advisor.id} className="border-t border-blue-100">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {advisor.name}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {advisor.phone}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {advisor.companies?.map((company) => (
                          <span
                            key={company.id}
                            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                          >
                            {company.code}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          advisor.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {advisor.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {advisor.mustChangePassword ? (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          Must change
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEditModal(advisor)}
                          className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openPasswordModal(advisor)}
                          className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleToggleStatus(advisor)}
                          className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                            advisor.isActive
                              ? "border border-red-200 bg-white text-red-600 hover:bg-red-50"
                              : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {advisor.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-4 lg:hidden">
        {loading ? (
          <div className="rounded-2xl border border-blue-100 bg-white/75 px-4 py-4 text-sm text-slate-600">
            Loading advisors...
          </div>
        ) : filteredAdvisors.length === 0 ? (
          <div className="rounded-2xl border border-blue-100 bg-white/75 px-4 py-4 text-sm text-slate-600">
            No advisors found.
          </div>
        ) : (
          filteredAdvisors.map((advisor) => (
            <div
              key={advisor.id}
              className="rounded-[24px] border border-blue-100 bg-white/80 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {advisor.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{advisor.phone}</p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    advisor.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {advisor.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {advisor.companies?.map((company) => (
                  <span
                    key={company.id}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                  >
                    {company.code}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  onClick={() => openEditModal(advisor)}
                  className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => openPasswordModal(advisor)}
                  className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-700"
                >
                  Password
                </button>
                <button
                  onClick={() => handleToggleStatus(advisor)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                    advisor.isActive
                      ? "border border-red-200 bg-white text-red-600"
                      : "border border-emerald-200 bg-white text-emerald-700"
                  }`}
                >
                  {advisor.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
           {/* Slide-over Panel */}
      {showModal && (
        <div className="fixed inset-0 z-50">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]"
            onClick={closeModal}
          />

          {/* Panel */}
         <div className="absolute inset-y-0 right-0 flex w-full justify-end overflow-hidden">
<div className="h-full w-full max-w-[920px] border-l border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f7fbff)] shadow-[-20px_0_60px_rgba(15,23,42,0.16)] xl:max-w-[980px]">              <div className="flex h-full flex-col">
                {/* Header */}
                <div className="sticky top-0 z-10 border-b border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f7fbff)] px-5 py-5 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                        {mode === "create"
                          ? "Create Advisor"
                          : mode === "edit"
                          ? "Edit Advisor"
                          : "Reset Password"}
                      </p>

                      <h2 className="mt-2 text-2xl font-bold text-slate-900">
                        {mode === "create"
                          ? "Add New Advisor"
                          : mode === "edit"
                          ? "Update Advisor"
                          : `Reset Password for ${selectedAdvisor?.name || ""}`}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {mode === "password"
                          ? "Set a fresh password and force the advisor to change it after login."
                          : "Configure advisor details, mobile number, and assigned companies."}
                      </p>
                    </div>

                    <button
                      onClick={closeModal}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                  {errorMsg ? (
                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorMsg}
                    </div>
                  ) : null}

                  {(mode === "create" || mode === "edit") && (
                    <form
                      id="advisor-form"
                      onSubmit={handleCreateOrEdit}
                      className="space-y-5"
                    >
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Advisor Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={form.name}
                          onChange={handleInputChange}
                          placeholder="Enter advisor name"
                          className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Mobile Number
                        </label>
                        <input
                          type="text"
                          name="phone"
                          value={form.phone}
                          onChange={handleInputChange}
                          placeholder="Enter mobile number"
                          className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      {mode === "create" && (
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Initial Password
                          </label>
                          <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleInputChange}
                            placeholder="Set initial password"
                            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                          />
                        </div>
                      )}

                      <div>
                        <label className="mb-3 block text-sm font-semibold text-slate-700">
                          Assign Companies
                        </label>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {companies.map((company) => {
                            const checked = form.companyIds.includes(company.id);

                            return (
                              <label
                                key={company.id}
                                className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition ${
                                  checked
                                    ? "border-blue-300 bg-blue-50"
                                    : "border-blue-100 bg-white hover:bg-blue-50/60"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleCompanyToggle(company.id)}
                                  className="mt-1 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                  <p className="font-semibold text-slate-800">
                                    {company.name}
                                  </p>
                                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                                    {company.code}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </form>
                  )}

                  {mode === "password" && (
                    <form
                      id="password-form"
                      onSubmit={handlePasswordReset}
                      className="space-y-5"
                    >
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm({ newPassword: e.target.value })
                          }
                          placeholder="Enter new password"
                          className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        This will set a new password and force the advisor to change it after login.
                      </div>
                    </form>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="border-t border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),#f7fbff)] px-5 py-4 sm:px-6">
                  {(mode === "create" || mode === "edit") && (
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="submit"
                        form="advisor-form"
                        disabled={saving}
                        className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.24)] transition hover:bg-blue-700 disabled:opacity-70"
                      >
                        {saving
                          ? "Saving..."
                          : mode === "create"
                          ? "Create Advisor"
                          : "Save Changes"}
                      </button>

                      <button
                        type="button"
                        onClick={closeModal}
                        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {mode === "password" && (
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="submit"
                        form="password-form"
                        disabled={saving}
                        className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-70"
                      >
                        {saving ? "Resetting..." : "Reset Password"}
                      </button>

                      <button
                        type="button"
                        onClick={closeModal}
                        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

export default AdminAdvisors;