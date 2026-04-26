import { useEffect, useMemo, useState } from "react";
import AdvisorShell from "../components/AdvisorShell";
import API from "../api/axios";
import { FaWhatsapp } from "react-icons/fa";
import {
  FiPhone,
  FiEdit,
  FiTrash2,
  FiX,
  FiChevronLeft,
  FiChevronRight,
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

function maskPhone(phone) {
  if (!phone || phone.length < 4) return phone;
  return `${phone.slice(0, 2)}****${phone.slice(-4)}`;
}

function getSourceBadgeClass(source) {
  switch (source) {
    case "EXCEL":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "MANUAL":
    default:
      return "border-violet-200 bg-violet-50 text-violet-700";
  }
}

function getActionBadgeClass(actionStatus) {
  switch (actionStatus) {
    case "BOTH":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "WHATSAPP":
      return "border-green-200 bg-green-50 text-green-700";
    case "CALL":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "NONE":
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function getActionLabel(actionStatus) {
  switch (actionStatus) {
    case "BOTH":
      return "Both Done";
    case "WHATSAPP":
      return "WhatsApp Done";
    case "CALL":
      return "Call Done";
    case "NONE":
    default:
      return "No Action";
  }
}

function ContactDetailBox({ label, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-blue-100 bg-[#f8fbff] p-4 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold text-slate-900">{children}</div>
    </div>
  );
}

function AdvisorBrowseContacts() {
  const [contacts, setContacts] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [leadFilter, setLeadFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");

  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [tagFilter, setTagFilter] = useState("ALL");

  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    altPhone: "",
    age: "",
    city: "",
    sourceNote: "",
    tags: "",
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const params = {};
      if (sourceFilter !== "ALL") params.source = sourceFilter;
      if (actionFilter !== "ALL") params.actionStatus = actionFilter;
      if (batchFilter !== "ALL") params.batchId = batchFilter;
      if (tagFilter !== "ALL") params.tag = tagFilter;

      const [contactsRes, batchesRes] = await Promise.all([
        API.get("/contacts", { params }),
        API.get("/contacts/batches"),
      ]);

      setContacts(contactsRes.data.contacts || []);
      setBatches(batchesRes.data.batches || []);
    } catch (error) {
      console.error("Failed to load contacts:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to load contacts."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [sourceFilter, actionFilter, batchFilter, tagFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, sortBy, pageSize, sourceFilter, actionFilter, leadFilter, batchFilter]);

  const filteredContacts = useMemo(() => {
    const q = search.toLowerCase();

    return contacts
      .filter((contact) => {
        const matchesSearch =
          contact.name?.toLowerCase().includes(q) ||
          contact.phone?.includes(search) ||
          contact.city?.toLowerCase().includes(q) ||
          contact.importBatchId?.toLowerCase().includes(q);

        const matchesLead =
          leadFilter === "ALL"
            ? true
            : leadFilter === "HAS_LEAD"
            ? contact.hasLead
            : !contact.hasLead;

        return matchesSearch && matchesLead;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "oldest":
            return new Date(a.createdAt) - new Date(b.createdAt);

          case "name-az":
            return (a.name || "").localeCompare(b.name || "");

          case "name-za":
            return (b.name || "").localeCompare(a.name || "");

          case "recent-activity":
            return (
              new Date(b.lastActivity?.createdAt || 0) -
              new Date(a.lastActivity?.createdAt || 0)
            );

          case "whatsapp-first": {
            const score = (c) =>
              c.actionStatus === "WHATSAPP"
                ? 3
                : c.actionStatus === "BOTH"
                ? 2
                : 0;
            return score(b) - score(a);
          }

          case "call-first": {
            const score = (c) =>
              c.actionStatus === "CALL"
                ? 3
                : c.actionStatus === "BOTH"
                ? 2
                : 0;
            return score(b) - score(a);
          }

          case "both-first": {
            const score = (c) => (c.actionStatus === "BOTH" ? 1 : 0);
            return score(b) - score(a);
          }

          case "newest":
          default:
            return new Date(b.createdAt) - new Date(a.createdAt);
        }
      });
  }, [contacts, search, leadFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedContacts = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filteredContacts.slice(start, end);
  }, [filteredContacts, safePage, pageSize]);

  const startItem =
    filteredContacts.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filteredContacts.length);

  const totalContacts = contacts.length;
  const manualContacts = contacts.filter((c) => c.importSource === "MANUAL").length;
  const importedContacts = contacts.filter((c) => c.importSource === "EXCEL").length;
  const actedContacts = contacts.filter((c) => c.actionStatus !== "NONE").length;

  const isAllOnPageSelected =
    paginatedContacts.length > 0 &&
    paginatedContacts.every((contact) => selectedIds.includes(contact.id));

  const toggleSelectAllOnPage = () => {
    if (isAllOnPageSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !paginatedContacts.some((c) => c.id === id))
      );
    } else {
      setSelectedIds((prev) => [
        ...new Set([...prev, ...paginatedContacts.map((c) => c.id)]),
      ]);
    }
  };

  const toggleSingleSelect = (contactId) => {
    setSelectedIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const openEditModal = (contact) => {
    setEditingContact(contact);
    setEditForm({
      name: contact.name || "",
      phone: contact.phone || "",
      altPhone: contact.altPhone || "",
      age: contact.age ?? "",
      city: contact.city || "",
      sourceNote: contact.sourceNote || "",
      tags: Array.isArray(contact.tags) ? contact.tags.join(", ") : "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingContact) return;

    try {
      setErrorMsg("");
      setSuccessMsg("");

      await API.patch(`/contacts/${editingContact.id}`, {
        name: editForm.name,
        phone: editForm.phone,
        altPhone: editForm.altPhone,
        age: editForm.age === "" ? null : Number(editForm.age),
        city: editForm.city,
        sourceNote: editForm.sourceNote,
        tags: editForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });

      setSuccessMsg("Contact updated successfully.");
      setEditingContact(null);
      await fetchContacts();
    } catch (error) {
      console.error("Failed to update contact:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to update contact."
      );
    }
  };
  const availableTags = useMemo(() => {
  return [
    ...new Set(
      contacts.flatMap((contact) =>
        Array.isArray(contact.tags) ? contact.tags : []
      )
    ),
  ].sort();
}, [contacts]);

  const handleDeleteSingle = async (contactId) => {
    const confirmed = window.confirm("Delete this contact?");
    if (!confirmed) return;

    try {
      setErrorMsg("");
      setSuccessMsg("");

      await API.delete(`/contacts/${contactId}`);
      setSuccessMsg("Contact deleted successfully.");
      setSelectedIds((prev) => prev.filter((id) => id !== contactId));
      await fetchContacts();
    } catch (error) {
      console.error("Failed to delete contact:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to delete contact."
      );
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      setErrorMsg("Select contacts first.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected contact(s)?`
    );
    if (!confirmed) return;

    try {
      setErrorMsg("");
      setSuccessMsg("");

      await API.post("/contacts/bulk-delete", {
        contactIds: selectedIds,
      });

      setSuccessMsg("Selected contacts deleted successfully.");
      setSelectedIds([]);
      await fetchContacts();
    } catch (error) {
      console.error("Failed to bulk delete contacts:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to delete selected contacts."
      );
    }
  };

  const ensureLeadExists = async (contact) => {
    if (contact.hasLead) return;

    await API.post(`/contacts/${contact.id}/convert-to-lead`, {
      remarks: "Lead generated from contacts page",
    });
  };

  const handleWhatsApp = async (contact) => {
    try {
      setErrorMsg("");
      await ensureLeadExists(contact);

      await API.post(`/contacts/${contact.id}/activities`, {
        activityType: "WHATSAPP",
        note: "WhatsApp opened from contacts page",
      });

      const cleaned = contact.phone.replace(/\D/g, "");
      if (!cleaned) return;

      window.open(`https://wa.me/91${cleaned}`, "_blank");
      await fetchContacts();
    } catch (error) {
      console.error("WhatsApp action failed:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to process WhatsApp action."
      );
    }
  };

  const handleCall = async (contact) => {
    try {
      setErrorMsg("");
      await ensureLeadExists(contact);

      await API.post(`/contacts/${contact.id}/activities`, {
        activityType: "CALL",
        note: "Call opened from contacts page",
      });

      const cleaned = contact.phone.replace(/\D/g, "");
      if (!cleaned) return;

      window.location.href = `tel:${cleaned}`;
      await fetchContacts();
    } catch (error) {
      console.error("Call action failed:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to process call action."
      );
    }
  };

  return (
    <AdvisorShell
      title="Browse Contacts"
      subtitle="Search, filter, sort, edit, and act on all your contacts from one place."
      activeTab="contacts"
    >
      {/* KPI CARDS */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Total Contacts
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{totalContacts}</p>
          <p className="mt-2 text-sm text-slate-600">All saved contacts</p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Manual
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{manualContacts}</p>
          <p className="mt-2 text-sm text-slate-600">Created one by one</p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Imported
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{importedContacts}</p>
          <p className="mt-2 text-sm text-slate-600">From Excel batches</p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Action Taken
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{actedContacts}</p>
          <p className="mt-2 text-sm text-slate-600">WhatsApp / Call done</p>
        </div>
      </div>

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

      {/* FILTERS */}
      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_160px_160px_160px_160px_160px_160px]">
        <div className="rounded-[24px] border border-blue-100 bg-white/80 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, city, or batch"
            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-white/80 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="ALL">All Source</option>
            <option value="MANUAL">Manual</option>
            <option value="EXCEL">Imported</option>
          </select>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-white/80 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="ALL">All Actions</option>
            <option value="NONE">No Action</option>
            <option value="WHATSAPP">WhatsApp Done</option>
            <option value="CALL">Call Done</option>
            <option value="BOTH">Both Done</option>
          </select>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-white/80 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
          <select
            value={leadFilter}
            onChange={(e) => setLeadFilter(e.target.value)}
            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="ALL">All Leads</option>
            <option value="HAS_LEAD">Has Lead</option>
            <option value="NO_LEAD">No Lead</option>
          </select>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-white/80 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="ALL">All Batches</option>
            {batches.map((batch) => (
              <option key={batch.batchId} value={batch.batchId}>
                {batch.batchId}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-white/80 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name-az">Name A-Z</option>
            <option value="name-za">Name Z-A</option>
            <option value="recent-activity">Recently Contacted</option>
            <option value="whatsapp-first">WhatsApp Done First</option>
            <option value="call-first">Call Done First</option>
            <option value="both-first">Both Done First</option>
          </select>
        </div>
           <div className="rounded-[24px] border border-blue-100 bg-white/80 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
  <select
    value={tagFilter}
    onChange={(e) => setTagFilter(e.target.value)}
    className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
  >
    <option value="ALL">All Tags</option>
    {availableTags.map((tag) => (
      <option key={tag} value={tag}>
        {tag}
      </option>
    ))}
  </select>
</div>
      </div>
   

      {/* BULK ACTION BAR */}
      <div className="mb-6 flex flex-col gap-3 rounded-[24px] border border-blue-100 bg-white/80 px-4 py-4 shadow-[0_10px_25px_rgba(37,99,235,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Selected Contacts:{" "}
          <span className="font-semibold text-slate-900">{selectedIds.length}</span>
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={selectedIds.length === 0}
            className="rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete Selected
          </button>
        </div>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden overflow-hidden rounded-[28px] border border-blue-100 bg-white/85 shadow-[0_12px_30px_rgba(37,99,235,0.05)] lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-blue-50/70">
              <tr className="text-left text-sm text-slate-700">
                <th className="px-5 py-4 font-semibold">
                  <input
                    type="checkbox"
                    checked={isAllOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    className="h-4 w-4 rounded border-blue-300"
                  />
                </th>
                <th className="px-5 py-4 font-semibold">Contact</th>
                <th className="px-5 py-4 font-semibold">City</th>
                <th className="px-5 py-4 font-semibold">Tags</th>
                <th className="px-5 py-4 font-semibold">Source</th>
                <th className="px-5 py-4 font-semibold">Batch</th>
                <th className="px-5 py-4 font-semibold">Action Status</th>
                <th className="px-5 py-4 font-semibold">Lead</th>
                <th className="px-5 py-4 font-semibold">Last Activity</th>
                <th className="px-5 py-4 font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-5 py-8 text-sm text-slate-600">
                    Loading contacts...
                  </td>
                </tr>
              ) : paginatedContacts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-5 py-8 text-sm text-slate-600">
                    No contacts found.
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-t border-blue-100 transition hover:bg-blue-50/30"
                  >
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(contact.id)}
                        onChange={() => toggleSingleSelect(contact.id)}
                        className="h-4 w-4 rounded border-blue-300"
                      />
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedContact(contact)}
                        className="text-left"
                      >
                        <div className="font-semibold text-slate-900">
                          {contact.name || "Unnamed Contact"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {maskPhone(contact.phone)}
                        </div>
                      </button>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {contact.city || "—"}
                    </td>
                    <td className="px-5 py-4">
  <div className="flex flex-wrap gap-1.5">
    {Array.isArray(contact.tags) && contact.tags.length > 0 ? (
      contact.tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
        >
          {tag}
        </span>
      ))
    ) : (
      <span className="text-sm text-slate-500">—</span>
    )}
  </div>
</td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getSourceBadgeClass(
                          contact.importSource
                        )}`}
                      >
                        {contact.importSource === "EXCEL" ? "Imported" : "Manual"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {contact.importBatchId || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getActionBadgeClass(
                          contact.actionStatus
                        )}`}
                      >
                        {getActionLabel(contact.actionStatus)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          contact.hasLead
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {contact.hasLead ? "Lead Created" : "No Lead"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {contact.lastActivity ? (
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            {contact.lastActivity.activityType}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatDateTime12h(contact.lastActivity.createdAt)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">No activity</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleWhatsApp(contact)}
                          className="rounded-xl border border-green-200 bg-white p-2 text-green-600 transition hover:bg-green-50"
                          title="WhatsApp"
                        >
                          <FaWhatsapp size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCall(contact)}
                          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
                          title="Call"
                        >
                          <FiPhone size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(contact)}
                          className="rounded-xl border border-blue-200 bg-white p-2 text-blue-600 transition hover:bg-blue-50"
                          title="Edit"
                        >
                          <FiEdit size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSingle(contact.id)}
                          className="rounded-xl border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50"
                          title="Delete"
                        >
                          <FiTrash2 size={16} />
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
          <div className="rounded-[24px] border border-blue-100 bg-white/85 p-4 text-sm text-slate-600 shadow-sm">
            Loading contacts...
          </div>
        ) : paginatedContacts.length === 0 ? (
          <div className="rounded-[24px] border border-blue-100 bg-white/85 p-4 text-sm text-slate-600 shadow-sm">
            No contacts found.
          </div>
        ) : (
          paginatedContacts.map((contact) => (
            <div
              key={contact.id}
              className="rounded-[24px] border border-blue-100 bg-white/85 p-4 shadow-[0_10px_25px_rgba(37,99,235,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(contact.id)}
                    onChange={() => toggleSingleSelect(contact.id)}
                    className="mt-1 h-4 w-4 rounded border-blue-300"
                  />

                  <button
                    type="button"
                    onClick={() => setSelectedContact(contact)}
                    className="text-left"
                  >
                    <h3 className="text-lg font-bold text-slate-900">
                      {contact.name || "Unnamed Contact"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {maskPhone(contact.phone)}
                    </p>
                  </button>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getActionBadgeClass(
                    contact.actionStatus
                  )}`}
                >
                  {getActionLabel(contact.actionStatus)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    City
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {contact.city || "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    Source
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {contact.importSource === "EXCEL" ? "Imported" : "Manual"}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    Batch
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {contact.importBatchId || "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    Lead Status
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {contact.hasLead ? "Lead Created" : "No Lead"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-100 bg-[#f8fbff] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  Last Activity
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {contact.lastActivity?.activityType || "No activity"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {contact.lastActivity
                    ? formatDateTime12h(contact.lastActivity.createdAt)
                    : "No recent update"}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleWhatsApp(contact)}
                  className="rounded-xl border border-green-200 bg-white p-3 text-green-600"
                  title="WhatsApp"
                >
                  <FaWhatsapp size={16} className="mx-auto" />
                </button>

                <button
                  type="button"
                  onClick={() => handleCall(contact)}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-slate-700"
                  title="Call"
                >
                  <FiPhone size={16} className="mx-auto" />
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(contact)}
                  className="rounded-xl border border-blue-200 bg-white p-3 text-blue-600"
                  title="Edit"
                >
                  <FiEdit size={16} className="mx-auto" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteSingle(contact.id)}
                  className="rounded-xl border border-red-200 bg-white p-3 text-red-600"
                  title="Delete"
                >
                  <FiTrash2 size={16} className="mx-auto" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PAGINATION */}
      <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-blue-100 bg-white/75 px-4 py-4 shadow-[0_10px_25px_rgba(37,99,235,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <p className="text-sm text-slate-600">
            Showing <span className="font-semibold">{startItem}</span>–
            <span className="font-semibold">{endItem}</span> of{" "}
            <span className="font-semibold">{filteredContacts.length}</span> contacts
          </p>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-xl border border-blue-100 bg-[#f8fbff] px-3 py-2 text-sm text-slate-700 outline-none"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiChevronLeft size={16} />
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
            <FiChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* VIEW MODAL */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedContact(null)}
          />

          <div className="relative mx-4 w-full max-w-2xl overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between border-b border-blue-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedContact.name || "Unnamed Contact"}
                </h2>
                <p className="text-sm text-slate-500">Contact details</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                className="text-slate-400 transition hover:text-slate-700"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="max-h-[65vh] space-y-4 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ContactDetailBox label="Phone">{selectedContact.phone}</ContactDetailBox>
                <ContactDetailBox label="Alt Phone">
                  {selectedContact.altPhone || "—"}
                </ContactDetailBox>
                <ContactDetailBox label="City">
                  {selectedContact.city || "—"}
                </ContactDetailBox>
                <ContactDetailBox label="Source">
                  {selectedContact.importSource === "EXCEL" ? "Imported" : "Manual"}
                </ContactDetailBox>
                <ContactDetailBox label="Batch ID">
                  {selectedContact.importBatchId || "—"}
                </ContactDetailBox>
                <ContactDetailBox label="Lead Status">
                  {selectedContact.hasLead ? "Lead Created" : "No Lead"}
                </ContactDetailBox>
                <ContactDetailBox label="Action Status" className="sm:col-span-2">
                  {getActionLabel(selectedContact.actionStatus)}
                </ContactDetailBox>
                <ContactDetailBox label="Last Activity" className="sm:col-span-2">
                  {selectedContact.lastActivity
                    ? `${selectedContact.lastActivity.activityType} · ${formatDateTime12h(
                        selectedContact.lastActivity.createdAt
                      )}`
                    : "No activity"}
                </ContactDetailBox>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-blue-100 bg-blue-50/40 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedContact(null);
                  openEditModal(selectedContact);
                }}
                className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-600"
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() => handleWhatsApp(selectedContact)}
                className="rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-600"
              >
                WhatsApp
              </button>

              <button
                type="button"
                onClick={() => handleCall(selectedContact)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setEditingContact(null)}
          />

          <div className="relative mx-4 w-full max-w-2xl overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between border-b border-blue-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Edit Contact
                </h2>
                <p className="text-sm text-slate-500">Update contact details</p>
              </div>

              <button
                type="button"
                onClick={() => setEditingContact(null)}
                className="text-slate-400 transition hover:text-slate-700"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Name"
                  className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none"
                />
                <input
  type="text"
  value={editForm.tags}
  onChange={(e) =>
    setEditForm((prev) => ({ ...prev, tags: e.target.value }))
  }
  placeholder="Tags: Health, Life, Hot"
  className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none"
/>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="Phone"
                  className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none"
                />
                <input
                  type="text"
                  value={editForm.altPhone}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, altPhone: e.target.value }))
                  }
                  placeholder="Alt Phone"
                  className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none"
                />
                <input
                  type="number"
                  value={editForm.age}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, age: e.target.value }))
                  }
                  placeholder="Age"
                  className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none"
                />
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, city: e.target.value }))
                  }
                  placeholder="City"
                  className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none"
                />
                <input
                  type="text"
                  value={editForm.sourceNote}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, sourceNote: e.target.value }))
                  }
                  placeholder="Source note"
                  className="rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 border-t border-blue-100 bg-blue-50/40 px-6 py-4">
              <button
                type="button"
                onClick={handleSaveEdit}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Save Changes
              </button>

              <button
                type="button"
                onClick={() => setEditingContact(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdvisorShell>
  );
}

export default AdvisorBrowseContacts;