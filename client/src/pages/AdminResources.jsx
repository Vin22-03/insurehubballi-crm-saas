import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import API from "../api/axios";
import { Pencil, Trash2, Power, FileText, Image as ImageIcon, Presentation, UploadCloud } from "lucide-react";

const initialForm = {
  title: "",
  description: "",
  companyId: "",
  category: "PRODUCT",
  file: null,
};

function AdminResources() {
  const [resources, setResources] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [showPanel, setShowPanel] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [selectedResource, setSelectedResource] = useState(null);

  const [form, setForm] = useState(initialForm);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const [resourcesRes, companiesRes] = await Promise.all([
        API.get("/resources/admin"),
        API.get("/admin/companies"),
      ]);

      setResources(resourcesRes.data.resources || []);
      setCompanies(companiesRes.data.companies || []);
    } catch (error) {
      console.error("Failed to load resources:", error);
      setErrorMsg(error?.response?.data?.message || "Failed to load resources.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        resource.title?.toLowerCase().includes(searchText) ||
        resource.description?.toLowerCase().includes(searchText) ||
        resource.company?.name?.toLowerCase().includes(searchText) ||
        resource.company?.code?.toLowerCase().includes(searchText) ||
        resource.fileType?.toLowerCase().includes(searchText);

      const matchesCompany =
        companyFilter === "ALL"
          ? true
          : String(resource.company?.id || "") === String(companyFilter);

      const matchesCategory =
        categoryFilter === "ALL"
          ? true
          : resource.category === categoryFilter;

      return matchesSearch && matchesCompany && matchesCategory;
    });
  }, [resources, search, companyFilter, categoryFilter]);

  const openCreatePanel = () => {
    setMode("create");
    setSelectedResource(null);
    setForm(initialForm);
    setErrorMsg("");
    setSuccessMsg("");
    setShowPanel(true);
  };

  const openEditPanel = (resource) => {
    setMode("edit");
    setSelectedResource(resource);
    setForm({
      title: resource.title || "",
      description: resource.description || "",
      companyId: String(resource.company?.id || ""),
      category: resource.category || "PRODUCT",
      file: null,
    });
    setErrorMsg("");
    setSuccessMsg("");
    setShowPanel(true);
  };

  const closePanel = () => {
    setShowPanel(false);
    setSelectedResource(null);
    setForm(initialForm);
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "file") {
      setForm((prev) => ({
        ...prev,
        file: files?.[0] || null,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveResource = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setErrorMsg("");
      setSuccessMsg("");

      if (mode === "create") {
        if (!form.title.trim() || !form.file) {
          setErrorMsg("Title and file are required.");
          setSaving(false);
          return;
        }

        const data = new FormData();
        data.append("title", form.title.trim());
        data.append("description", form.description.trim());
        data.append("companyId", form.companyId);
        data.append("category", form.category);
        data.append("file", form.file);

        await API.post("/resources/admin", data, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        setSuccessMsg("Resource uploaded successfully.");
      } else if (mode === "edit" && selectedResource) {
        await API.patch(`/resources/admin/${selectedResource.id}`, {
          title: form.title.trim(),
          description: form.description.trim(),
          companyId: form.companyId,
          category: form.category,
        });

        setSuccessMsg("Resource updated successfully.");
      }

      await fetchInitialData();
      closePanel();
    } catch (error) {
      console.error("Save resource failed:", error);
      setErrorMsg(error?.response?.data?.message || "Failed to save resource.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (resource) => {
    try {
      setErrorMsg("");
      setSuccessMsg("");

      await API.patch(`/resources/admin/${resource.id}/status`, {
        isActive: !resource.isActive,
      });

      setSuccessMsg(
        resource.isActive
          ? "Resource deactivated successfully."
          : "Resource activated successfully."
      );

      await fetchInitialData();
    } catch (error) {
      console.error("Toggle resource status failed:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to update resource status."
      );
    }
  };

  const handleDeleteResource = async (resource) => {
    const confirmed = window.confirm(
      `Delete resource "${resource.title}"? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setErrorMsg("");
      setSuccessMsg("");

      await API.delete(`/resources/admin/${resource.id}`);
      setSuccessMsg("Resource deleted successfully.");
      await fetchInitialData();
    } catch (error) {
      console.error("Delete resource failed:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to delete resource."
      );
    }
  };

  const getFileTypeIcon = (type) => {
    if (type === "PDF") return <FileText size={16} />;
    if (type === "IMAGE") return <ImageIcon size={16} />;
    return <Presentation size={16} />;
  };

  const getCategoryBadge = (category) => {
    const styles = {
      PRODUCT: "bg-blue-50 text-blue-700 border-blue-200",
      FAQ: "bg-violet-50 text-violet-700 border-violet-200",
      TRAINING: "bg-emerald-50 text-emerald-700 border-emerald-200",
      SALES: "bg-cyan-50 text-cyan-700 border-cyan-200",
      CLAIMS: "bg-amber-50 text-amber-700 border-amber-200",
      BENEFITS: "bg-sky-50 text-sky-700 border-sky-200",
      COMPARISON: "bg-indigo-50 text-indigo-700 border-indigo-200",
      OTHER: "bg-slate-100 text-slate-700 border-slate-200",
    };

    return styles[category] || styles.OTHER;
  };

  return (
    <AdminShell
      title="Resource Center"
      subtitle="Upload, organize, and manage PDFs, images, and presentations for advisors to use during client discussions."
      activeTab="resources"
    >
      {/* TOP FILTER BAR */}
      <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-blue-100 bg-white/70 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)] lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[920px]">
          <input
            type="text"
            placeholder="Search by title, description, company, or file type"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="ALL">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="ALL">All Categories</option>
            <option value="PRODUCT">Product</option>
            <option value="FAQ">FAQ</option>
            <option value="TRAINING">Training</option>
            <option value="SALES">Sales</option>
            <option value="CLAIMS">Claims</option>
            <option value="BENEFITS">Benefits</option>
            <option value="COMPARISON">Comparison</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <button
          onClick={openCreatePanel}
          className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.24)] transition duration-150 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.99]"
        >
          + Add Resource
        </button>
      </div>

      {/* ALERTS */}
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

      {/* DESKTOP TABLE */}
      <div className="hidden overflow-hidden rounded-[28px] border border-blue-100 bg-white/75 shadow-[0_12px_30px_rgba(37,99,235,0.05)] lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed">
            <thead className="bg-blue-50/70">
              <tr className="text-left text-sm text-slate-700">
                <th className="w-[26%] px-5 py-4 font-semibold">Resource</th>
                <th className="w-[22%] px-5 py-4 font-semibold">Company</th>
                <th className="w-[14%] px-5 py-4 font-semibold">Category</th>
                <th className="w-[12%] px-5 py-4 font-semibold">Type</th>
                <th className="w-[10%] px-5 py-4 font-semibold">Status</th>
                <th className="w-[8%] px-5 py-4 font-semibold">File</th>
                <th className="w-[8%] px-5 py-4 font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-6 text-sm text-slate-600">
                    Loading resources...
                  </td>
                </tr>
              ) : filteredResources.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-6 text-sm text-slate-600">
                    No resources found.
                  </td>
                </tr>
              ) : (
                filteredResources.map((resource) => (
                  <tr key={resource.id} className="border-t border-blue-100 align-top">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {resource.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {resource.description || "No description"}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      <div className="font-medium">{resource.company?.name || "All Companies"}</div>
                      {resource.company?.code ? (
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          {resource.company.code}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getCategoryBadge(
                          resource.category
                        )}`}
                      >
                        {resource.category}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-[#f8fbff] px-3 py-1 text-xs font-semibold text-slate-700">
                        {getFileTypeIcon(resource.fileType)}
                        {resource.fileType}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          resource.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {resource.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <a
                        href={`http://localhost:5000${resource.fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-blue-700 hover:underline"
                      >
                        Open
                      </a>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditPanel(resource)}
                          title="Edit resource"
                          className="rounded-xl border border-blue-200 bg-white p-2 text-slate-700 transition hover:-translate-y-0.5 hover:bg-blue-50 active:translate-y-0 active:scale-[0.98]"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(resource)}
                          title={resource.isActive ? "Deactivate resource" : "Activate resource"}
                          className={`rounded-xl border bg-white p-2 transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${
                            resource.isActive
                              ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          <Power size={16} />
                        </button>

                        <button
                          onClick={() => handleDeleteResource(resource)}
                          title="Delete resource"
                          className="rounded-xl border border-red-200 bg-white p-2 text-red-600 transition hover:-translate-y-0.5 hover:bg-red-50 active:translate-y-0 active:scale-[0.98]"
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

      {/* MOBILE CARDS */}
      <div className="space-y-4 lg:hidden">
        {loading ? (
          <div className="rounded-2xl border border-blue-100 bg-white/75 px-4 py-4 text-sm text-slate-600">
            Loading resources...
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="rounded-2xl border border-blue-100 bg-white/75 px-4 py-4 text-sm text-slate-600">
            No resources found.
          </div>
        ) : (
          filteredResources.map((resource) => (
            <div
              key={resource.id}
              className="rounded-[24px] border border-blue-100 bg-white/80 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {resource.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {resource.company?.name || "All Companies"}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    resource.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {resource.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                {resource.description || "No description"}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getCategoryBadge(
                    resource.category
                  )}`}
                >
                  {resource.category}
                </span>

                <span className="rounded-full border border-blue-100 bg-[#f8fbff] px-3 py-1 text-xs font-semibold text-slate-700">
                  {resource.fileType}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <a
                  href={`http://localhost:5000${resource.fileUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-blue-700 hover:underline"
                >
                  Open File
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditPanel(resource)}
                    className="rounded-xl border border-blue-200 bg-white p-2 text-slate-700"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() => handleToggleStatus(resource)}
                    className={`rounded-xl border bg-white p-2 ${
                      resource.isActive
                        ? "border-amber-200 text-amber-700"
                        : "border-emerald-200 text-emerald-700"
                    }`}
                  >
                    <Power size={16} />
                  </button>

                  <button
                    onClick={() => handleDeleteResource(resource)}
                    className="rounded-xl border border-red-200 bg-white p-2 text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* SIDE PANEL */}
      {showPanel && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]"
            onClick={closePanel}
          />

          <div className="absolute inset-y-0 right-0 flex w-full justify-end overflow-hidden">
            <div className="h-full w-full max-w-[900px] border-l border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f7fbff)] shadow-[-20px_0_60px_rgba(15,23,42,0.16)]">
              <div className="flex h-full flex-col">
                <div className="sticky top-0 z-10 border-b border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f7fbff)] px-5 py-5 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                        {mode === "create" ? "Create Resource" : "Edit Resource"}
                      </p>

                      <h2 className="mt-2 text-2xl font-bold text-slate-900">
                        {mode === "create" ? "Add New Resource" : "Update Resource"}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        Upload and organize brochures, FAQs, training files, and product materials.
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
                  <form
                    id="resource-form"
                    onSubmit={handleSaveResource}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Resource Title
                        </label>
                        <input
                          type="text"
                          name="title"
                          value={form.title}
                          onChange={handleInputChange}
                          placeholder="Enter resource title"
                          className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

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
                          <option value="">All Companies</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Category
                        </label>
                        <select
                          name="category"
                          value={form.category}
                          onChange={handleInputChange}
                          className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        >
                          <option value="PRODUCT">Product</option>
                          <option value="FAQ">FAQ</option>
                          <option value="TRAINING">Training</option>
                          <option value="SALES">Sales</option>
                          <option value="CLAIMS">Claims</option>
                          <option value="BENEFITS">Benefits</option>
                          <option value="COMPARISON">Comparison</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>

                      {mode === "create" ? (
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Upload File
                          </label>
                          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-blue-200 bg-[#f8fbff] px-4 py-3 text-slate-700 transition hover:bg-blue-50">
                            <UploadCloud size={18} className="text-blue-700" />
                            <span className="text-sm font-medium">
                              {form.file ? form.file.name : "Choose PDF, image, PPT, or PPTX"}
                            </span>
                            <input
                              type="file"
                              name="file"
                              className="hidden"
                              onChange={handleInputChange}
                            />
                          </label>
                        </div>
                      ) : (
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Current File
                          </label>
                          <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-sm text-slate-700">
                            File replacement is disabled for now. Edit title, company, category, or description only.
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleInputChange}
                        placeholder="Write a short description for advisors"
                        rows={6}
                        className="w-full resize-none rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </form>
                </div>

                <div className="border-t border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),#f7fbff)] px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      form="resource-form"
                      disabled={saving}
                      className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:opacity-70"
                    >
                      {saving
                        ? "Saving..."
                        : mode === "create"
                        ? "Upload Resource"
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

export default AdminResources;