import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import API from "../api/axios";
import { Pencil, Trash2, Power } from "lucide-react";

const initialForm = {
  companyId: "",
  title: "",
  tagline: "",
  age: "",
  body: "",
  pdfUrl: "",
};

const ITEMS_PER_PAGE = 8;

function AdminTemplates() {
  const [companies, setCompanies] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const [showPanel, setShowPanel] = useState(false);
  const [mode, setMode] = useState("create");
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [form, setForm] = useState(initialForm);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const [companiesRes, templatesRes] = await Promise.all([
        API.get("/admin/companies"),
        API.get("/admin/templates"),
      ]);

      setCompanies(companiesRes.data.companies || []);
      setTemplates(templatesRes.data.templates || []);
    } catch (error) {
      console.error("Failed to load templates data:", error);
      setErrorMsg(error?.response?.data?.message || "Failed to load templates data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, companyFilter]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        template.title?.toLowerCase().includes(searchText) ||
        template.tagline?.toLowerCase().includes(searchText) ||
        template.company?.name?.toLowerCase().includes(searchText) ||
        template.company?.code?.toLowerCase().includes(searchText);

      const matchesCompany =
        companyFilter === "ALL"
          ? true
          : String(template.company?.id) === String(companyFilter);

      return matchesSearch && matchesCompany;
    });
  }, [templates, search, companyFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE)
  );

  const paginatedTemplates = filteredTemplates.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const openCreatePanel = () => {
    setMode("create");
    setSelectedTemplate(null);
    setForm(initialForm);
    setErrorMsg("");
    setSuccessMsg("");
    setShowPanel(true);
  };

  const openEditPanel = (template) => {
    setMode("edit");
    setSelectedTemplate(template);
    setForm({
      companyId: String(template.company?.id || ""),
      title: template.title || "",
      tagline: template.tagline || "",
      age: String(template.minAge ?? ""),
      body: template.body || "",
      pdfUrl: template.pdfUrl || "",
    });
    setErrorMsg("");
    setSuccessMsg("");
    setShowPanel(true);
  };

  const closePanel = () => {
    setShowPanel(false);
    setSelectedTemplate(null);
    setForm(initialForm);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setErrorMsg("");
      setSuccessMsg("");

      const exactAge =
        form.age !== undefined && form.age !== null && form.age !== ""
          ? Number(form.age)
          : null;

      const payload = {
        companyId: Number(form.companyId),
        title: form.title.trim(),
        tagline: form.tagline.trim(),
        minAge: exactAge,
        maxAge: exactAge,
        body: form.body.trim(),
        pdfUrl: form.pdfUrl.trim(),
      };

      if (mode === "create") {
        await API.post("/admin/templates", payload);
        setSuccessMsg("Template created successfully.");
      } else if (mode === "edit" && selectedTemplate) {
        await API.patch(`/admin/templates/${selectedTemplate.id}`, payload);
        setSuccessMsg("Template updated successfully.");
      }

      await fetchInitialData();
      closePanel();
    } catch (error) {
      console.error("Save template failed:", error);
      setErrorMsg(error?.response?.data?.message || "Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (template) => {
    try {
      setErrorMsg("");
      setSuccessMsg("");

      await API.patch(`/admin/templates/${template.id}/status`);
      await fetchInitialData();
    } catch (error) {
      console.error("Template status toggle failed:", error);
      setErrorMsg(error?.response?.data?.message || "Failed to update template status.");
    }
  };

  const handleDeleteTemplate = async (template) => {
    const confirmed = window.confirm(
      `Delete template "${template.title}"? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setErrorMsg("");
      setSuccessMsg("");

      await API.delete(`/admin/templates/${template.id}`);
      await fetchInitialData();
    } catch (error) {
      console.error("Delete template failed:", error);
      setErrorMsg(error?.response?.data?.message || "Failed to delete template.");
    }
  };

  const Pagination = () => {
    if (filteredTemplates.length <= ITEMS_PER_PAGE) return null;

    return (
      <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-blue-100 bg-white/80 px-4 py-4 shadow-[0_10px_24px_rgba(37,99,235,0.05)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-600">
          Showing{" "}
          <span className="font-bold text-slate-900">
            {(currentPage - 1) * ITEMS_PER_PAGE + 1}
          </span>{" "}
          to{" "}
          <span className="font-bold text-slate-900">
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredTemplates.length)}
          </span>{" "}
          of{" "}
          <span className="font-bold text-slate-900">
            {filteredTemplates.length}
          </span>{" "}
          templates
        </p>

        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="rounded-2xl border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <span className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            {currentPage} / {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-2xl border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <AdminShell
      title="Template Management"
      subtitle="Create, organize, and manage company-wise message templates with age rules and PDF links."
      activeTab="templates"
    >
      <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-blue-100 bg-white/70 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)] lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[700px] xl:w-[860px]">
          <input
            type="text"
            placeholder="Search by template title, tagline, or company"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="ALL">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={openCreatePanel}
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.24)] transition hover:bg-blue-700"
        >
          + Add Template
        </button>
      </div>

      {errorMsg ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {successMsg ? (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      ) : null}

      <div className="hidden overflow-hidden rounded-[28px] border border-blue-100 bg-white/75 shadow-[0_12px_30px_rgba(37,99,235,0.05)] lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-blue-50/70">
              <tr className="text-left text-sm text-slate-700">
                <th className="px-5 py-4 font-semibold">Template</th>
                <th className="px-5 py-4 font-semibold">Company</th>
                <th className="px-5 py-4 font-semibold">Age</th>
                <th className="px-5 py-4 font-semibold">PDF</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-6 text-sm text-slate-600">
                    Loading templates...
                  </td>
                </tr>
              ) : filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-6 text-sm text-slate-600">
                    No templates found.
                  </td>
                </tr>
              ) : (
                paginatedTemplates.map((template) => (
                  <tr key={template.id} className="border-t border-blue-100">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {template.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {template.tagline || "No tagline"}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      <div className="font-medium">{template.company?.name}</div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        {template.company?.code}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {template.minAge ?? "—"}
                    </td>

                    <td className="px-5 py-4">
                      {template.pdfUrl ? (
                        <a
                          href={template.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-blue-700 hover:underline"
                        >
                          Open PDF
                        </a>
                      ) : (
                        <span className="text-sm text-slate-500">No PDF</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          template.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {template.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditPanel(template)}
                          title="Edit template"
                          className="rounded-xl border border-blue-200 bg-white p-2 text-slate-700 transition hover:bg-blue-50"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(template)}
                          title={template.isActive ? "Deactivate template" : "Activate template"}
                          className={`rounded-xl border bg-white p-2 transition ${
                            template.isActive
                              ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          <Power size={16} />
                        </button>

                        <button
                          onClick={() => handleDeleteTemplate(template)}
                          title="Delete template"
                          className="rounded-xl border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 size={16} />
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

      <div className="space-y-4 lg:hidden">
        {loading ? (
          <div className="rounded-2xl border border-blue-100 bg-white/75 px-4 py-4 text-sm text-slate-600">
            Loading templates...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-2xl border border-blue-100 bg-white/75 px-4 py-4 text-sm text-slate-600">
            No templates found.
          </div>
        ) : (
          paginatedTemplates.map((template) => (
            <div
              key={template.id}
              className="rounded-[24px] border border-blue-100 bg-white/80 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {template.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {template.company?.name}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    template.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {template.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-600">
                Age: {template.minAge ?? "—"}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                {template.tagline || "No tagline"}
              </p>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => openEditPanel(template)}
                  title="Edit template"
                  className="rounded-xl border border-blue-200 bg-white p-2 text-slate-700"
                >
                  <Pencil size={16} />
                </button>

                <button
                  onClick={() => handleToggleStatus(template)}
                  title={template.isActive ? "Deactivate template" : "Activate template"}
                  className={`rounded-xl border bg-white p-2 ${
                    template.isActive
                      ? "border-amber-200 text-amber-700"
                      : "border-emerald-200 text-emerald-700"
                  }`}
                >
                  <Power size={16} />
                </button>

                <button
                  onClick={() => handleDeleteTemplate(template)}
                  title="Delete template"
                  className="rounded-xl border border-red-200 bg-white p-2 text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Pagination />

      {showPanel && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]"
            onClick={closePanel}
          />

          <div className="absolute inset-y-0 right-0 flex w-full justify-end overflow-hidden">
            <div className="h-full w-full max-w-[980px] border-l border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f7fbff)] shadow-[-20px_0_60px_rgba(15,23,42,0.16)]">
              <div className="flex h-full flex-col">
                <div className="sticky top-0 z-10 border-b border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f7fbff)] px-5 py-5 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                        {mode === "create" ? "Create Template" : "Edit Template"}
                      </p>

                      <h2 className="mt-2 text-2xl font-bold text-slate-900">
                        {mode === "create" ? "Add New Template" : "Update Template"}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        Configure company, age, message content, and PDF link.
                      </p>
                    </div>

                    <button
                      onClick={closePanel}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                  {errorMsg ? (
                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorMsg}
                    </div>
                  ) : null}

                  <form id="template-form" onSubmit={handleSaveTemplate} className="space-y-5">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Company
                        </label>
                        <select
                          name="companyId"
                          value={form.companyId}
                          onChange={handleInputChange}
                          className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        >
                          <option value="">Select company</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Title
                        </label>
                        <input
                          type="text"
                          name="title"
                          value={form.title}
                          onChange={handleInputChange}
                          placeholder="Enter template title"
                          className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Tagline
                        </label>
                        <input
                          type="text"
                          name="tagline"
                          value={form.tagline}
                          onChange={handleInputChange}
                          placeholder="Enter tagline"
                          className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          PDF URL
                        </label>
                        <input
                          type="text"
                          name="pdfUrl"
                          value={form.pdfUrl}
                          onChange={handleInputChange}
                          placeholder="Paste PDF link"
                          className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Age
                        </label>
                        <input
                          type="number"
                          name="age"
                          value={form.age}
                          onChange={handleInputChange}
                          placeholder="e.g. 25"
                          className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Message Body
                      </label>
                      <textarea
                        name="body"
                        value={form.body}
                        onChange={handleInputChange}
                        placeholder="Write the template message here"
                        rows={10}
                        className="w-full resize-none rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </form>
                </div>

                <div className="border-t border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),#f7fbff)] px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      form="template-form"
                      disabled={saving}
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.24)] transition hover:bg-blue-700 disabled:opacity-70"
                    >
                      {saving
                        ? "Saving..."
                        : mode === "create"
                        ? "Create Template"
                        : "Save Changes"}
                    </button>

                    <button
                      type="button"
                      onClick={closePanel}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

export default AdminTemplates;