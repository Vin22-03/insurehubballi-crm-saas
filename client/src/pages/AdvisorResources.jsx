import { useEffect, useMemo, useState } from "react";
import AdvisorShell from "../components/AdvisorShell";
import API from "../api/axios";
import {
  FileText,
  Image as ImageIcon,
  Presentation,
  Search,
  Building2,
  Filter,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function AdvisorResources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  const fetchResources = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const res = await API.get("/resources/advisor");
      setResources(res.data.resources || []);
    } catch (error) {
      console.error("Failed to load advisor resources:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to load resources."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const companies = useMemo(() => {
    const map = new Map();

    resources.forEach((resource) => {
      if (resource.company?.id) {
        map.set(resource.company.id, resource.company);
      }
    });

    return Array.from(map.values());
  }, [resources]);

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const q = search.toLowerCase();

      const matchesSearch =
        resource.title?.toLowerCase().includes(q) ||
        resource.description?.toLowerCase().includes(q) ||
        resource.company?.name?.toLowerCase().includes(q) ||
        resource.category?.toLowerCase().includes(q) ||
        resource.fileType?.toLowerCase().includes(q);

      const matchesCompany =
        companyFilter === "ALL"
          ? true
          : String(resource.company?.id || "") === String(companyFilter);

      const matchesCategory =
        categoryFilter === "ALL" ? true : resource.category === categoryFilter;

      return matchesSearch && matchesCompany && matchesCategory;
    });
  }, [resources, search, companyFilter, categoryFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, companyFilter, categoryFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedResources = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filteredResources.slice(start, end);
  }, [filteredResources, safePage, pageSize]);

  const startItem =
    filteredResources.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filteredResources.length);

  const getFileTypeIcon = (type) => {
    if (type === "PDF") return <FileText size={18} />;
    if (type === "IMAGE") return <ImageIcon size={18} />;
    return <Presentation size={18} />;
  };

  const getCategoryBadge = (category) => {
    const styles = {
      PRODUCT: "border-blue-200 bg-blue-50 text-blue-700",
      FAQ: "border-violet-200 bg-violet-50 text-violet-700",
      TRAINING: "border-emerald-200 bg-emerald-50 text-emerald-700",
      SALES: "border-cyan-200 bg-cyan-50 text-cyan-700",
      CLAIMS: "border-amber-200 bg-amber-50 text-amber-700",
      BENEFITS: "border-sky-200 bg-sky-50 text-sky-700",
      COMPARISON: "border-indigo-200 bg-indigo-50 text-indigo-700",
      OTHER: "border-slate-200 bg-slate-100 text-slate-700",
    };

    return styles[category] || styles.OTHER;
  };

  const getFileTypeCardTone = (type) => {
    if (type === "PDF") {
      return "border-red-100 bg-[linear-gradient(180deg,#ffffff,#fff7f7)]";
    }

    if (type === "IMAGE") {
      return "border-emerald-100 bg-[linear-gradient(180deg,#ffffff,#f6fffb)]";
    }

    return "border-violet-100 bg-[linear-gradient(180deg,#ffffff,#faf7ff)]";
  };

  return (
    <AdvisorShell
      title="Resource Library"
      subtitle="Browse company materials, FAQs, brochures, and training files during client discussions."
      activeTab="resources"
    >
      {errorMsg ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {/* FILTER STRIP */}
      <div className="mb-6 rounded-[28px] border border-blue-100 bg-white/75 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr_160px]">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search by title, category, company, or file type"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] py-3 pl-11 pr-4 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="relative">
            <Building2
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-blue-100 bg-[#f8fbff] py-3 pl-11 pr-4 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="ALL">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Filter
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-blue-100 bg-[#f8fbff] py-3 pl-11 pr-4 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
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

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value={6}>6 / page</option>
            <option value={9}>9 / page</option>
            <option value={12}>12 / page</option>
          </select>
        </div>
      </div>

      {/* RESOURCE GRID */}
      {loading ? (
        <div className="rounded-[28px] border border-blue-100 bg-white/80 p-5 text-sm text-slate-600 shadow-sm">
          Loading resources...
        </div>
      ) : paginatedResources.length === 0 ? (
        <div className="rounded-[28px] border border-blue-100 bg-white/80 p-5 text-sm text-slate-600 shadow-sm">
          No resources found for the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {paginatedResources.map((resource) => (
            <div
              key={resource.id}
              className={`group rounded-[28px] border p-5 shadow-[0_12px_30px_rgba(37,99,235,0.05)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(37,99,235,0.10)] ${getFileTypeCardTone(
                resource.fileType
              )}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-white text-blue-700 shadow-sm">
                  {getFileTypeIcon(resource.fileType)}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getCategoryBadge(
                      resource.category
                    )}`}
                  >
                    {resource.category}
                  </span>

                  <span className="rounded-full border border-blue-100 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                    {resource.fileType}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <h3 className="line-clamp-2 text-xl font-bold tracking-tight text-slate-900">
                  {resource.title}
                </h3>

                <p className="mt-2 text-sm font-medium text-blue-700">
                  {resource.company?.name || "All Companies"}
                </p>

                <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-600">
                  {resource.description || "Useful reference material for client discussion and advisor guidance."}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  {resource.createdAt
                    ? new Date(resource.createdAt).toLocaleDateString("en-IN")
                    : "Recently added"}
                </div>

                <a
                  href={`http://localhost:5000${resource.fileUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-blue-50 active:translate-y-0 active:scale-[0.99]"
                >
                  Open Resource
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION */}
      <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-blue-100 bg-white/75 px-4 py-4 shadow-[0_10px_25px_rgba(37,99,235,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Showing <span className="font-semibold">{startItem}</span>–
          <span className="font-semibold">{endItem}</span> of{" "}
          <span className="font-semibold">{filteredResources.length}</span> resources
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <div className="rounded-xl border border-blue-100 bg-[#f8fbff] px-4 py-2 text-sm font-semibold text-slate-700">
            Page {safePage} of {totalPages}
          </div>

          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </AdvisorShell>
  );
}

export default AdvisorResources;