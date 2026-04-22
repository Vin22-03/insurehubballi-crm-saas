import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdvisorShell from "../components/AdvisorShell";
import API from "../api/axios";
import {
  FiUploadCloud,
  FiUserPlus,
  FiUsers,
  FiLayers,
  FiPhoneCall,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

function AdvisorContactsHome() {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchContactsSummary = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const [contactsRes, batchesRes] = await Promise.all([
        API.get("/contacts"),
        API.get("/contacts/batches"),
      ]);

      setContacts(contactsRes.data.contacts || []);
      setBatches(batchesRes.data.batches || []);
    } catch (error) {
      console.error("Failed to load contacts home summary:", error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to load contacts summary."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContactsSummary();
  }, []);

  const summary = useMemo(() => {
    const totalContacts = contacts.length;
    const manualContacts = contacts.filter(
      (contact) => contact.importSource === "MANUAL"
    ).length;
    const importedContacts = contacts.filter(
      (contact) => contact.importSource === "EXCEL"
    ).length;
    const totalBatches = batches.length;
    const hasLeadCount = contacts.filter((contact) => contact.hasLead).length;
    const whatsappDone = contacts.filter(
      (contact) =>
        contact.actionStatus === "WHATSAPP" || contact.actionStatus === "BOTH"
    ).length;
    const callDone = contacts.filter(
      (contact) =>
        contact.actionStatus === "CALL" || contact.actionStatus === "BOTH"
    ).length;

    return {
      totalContacts,
      manualContacts,
      importedContacts,
      totalBatches,
      hasLeadCount,
      whatsappDone,
      callDone,
    };
  }, [contacts, batches]);

  const latestBatch = useMemo(() => {
    if (!batches.length) return null;

    const sorted = [...batches].sort(
      (a, b) =>
        new Date(b.latestCreatedAt || 0).getTime() -
        new Date(a.latestCreatedAt || 0).getTime()
    );

    return sorted[0];
  }, [batches]);

  return (
    <AdvisorShell
      title="Contacts Workspace"
      subtitle="Import, create, browse, and manage your personal contacts before converting them into active leads."
      activeTab="contacts"
    >
      {errorMsg ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {/* TOP KPI CARDS */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Total Contacts
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {loading ? "…" : summary.totalContacts}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            All saved contacts in your workspace
          </p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Manual vs Imported
          </p>
          <p className="mt-3 text-lg font-bold text-slate-900">
            {loading ? "…" : `${summary.manualContacts} / ${summary.importedContacts}`}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Manual contacts and Excel imported contacts
          </p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Converted to Leads
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {loading ? "…" : summary.hasLeadCount}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Contacts already moved into lead workflow
          </p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-5 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Import Batches
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {loading ? "…" : summary.totalBatches}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Total Excel import batches created
          </p>
        </div>
      </div>

      {/* ACTION CARDS */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => navigate("/advisor/contacts/import")}
          className="group rounded-[28px] border border-blue-100 bg-white/85 p-5 text-left shadow-[0_12px_30px_rgba(37,99,235,0.05)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700">
            <FiUploadCloud size={22} />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">
            Import Contacts
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Upload Excel contacts in bulk and organize them into import batches.
          </p>
          <p className="mt-4 text-sm font-semibold text-blue-700">
            Open import page →
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate("/advisor/contacts/create")}
          className="group rounded-[28px] border border-blue-100 bg-white/85 p-5 text-left shadow-[0_12px_30px_rgba(37,99,235,0.05)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
            <FiUserPlus size={22} />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">
            Create Contact
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Add one contact manually with name, phone, city, and optional details.
          </p>
          <p className="mt-4 text-sm font-semibold text-blue-700">
            Open create page →
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate("/advisor/contacts/browse")}
          className="group rounded-[28px] border border-blue-100 bg-white/85 p-5 text-left shadow-[0_12px_30px_rgba(37,99,235,0.05)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-700">
            <FiUsers size={22} />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">
            Browse Contacts
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Search, filter, sort, edit, delete, and act on all saved contacts.
          </p>
          <p className="mt-4 text-sm font-semibold text-blue-700">
            Open browse page →
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate("/advisor/contacts/batches")}
          className="group rounded-[28px] border border-blue-100 bg-white/85 p-5 text-left shadow-[0_12px_30px_rgba(37,99,235,0.05)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
            <FiLayers size={22} />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">
            Batch Summary
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            See how many contacts came from each import batch and review batch volume.
          </p>
          <p className="mt-4 text-sm font-semibold text-blue-700">
            Open batch page →
          </p>
        </button>
      </div>

      {/* INSIGHT PANELS */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,249,255,0.96))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            Workflow Guide
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            How contacts move into lead workflow
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-blue-100 bg-white/85 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-green-200 bg-green-50 text-green-700">
                  <FaWhatsapp size={18} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">WhatsApp Flow</p>
                  <p className="text-sm text-slate-500">
                    Contact action tracking
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Clicking WhatsApp from a contact records activity and can move that contact into the lead journey.
              </p>
            </div>

            <div className="rounded-[24px] border border-blue-100 bg-white/85 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                  <FiPhoneCall size={18} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Call Flow</p>
                  <p className="text-sm text-slate-500">
                    Dial + lead activity
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Calling a contact records outreach activity and helps prioritize actively worked contacts.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50/90 p-4">
            <p className="text-sm font-semibold text-amber-900">
              CRM Tip
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-900/90">
              Contacts are your raw data pool. Leads are contacts that have entered active sales follow-up. This separation keeps your CRM cleaner and more professional.
            </p>
          </div>
        </section>

        <section className="rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,249,255,0.96))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            Workspace Snapshot
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Quick overview
          </h2>

          <div className="mt-5 space-y-4">
            <div className="rounded-[24px] border border-blue-100 bg-white/85 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                Latest Batch
              </p>
              <p className="mt-2 text-base font-bold text-slate-900">
                {latestBatch?.batchId || "No batch imported yet"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {latestBatch
                  ? `${latestBatch.count} contacts in latest batch`
                  : "Import Excel contacts to create your first batch"}
              </p>
            </div>

            <div className="rounded-[24px] border border-blue-100 bg-white/85 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                WhatsApp Actions
              </p>
              <p className="mt-2 text-base font-bold text-slate-900">
                {loading ? "…" : summary.whatsappDone}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Contacts with WhatsApp activity recorded
              </p>
            </div>

            <div className="rounded-[24px] border border-blue-100 bg-white/85 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                Call Actions
              </p>
              <p className="mt-2 text-base font-bold text-slate-900">
                {loading ? "…" : summary.callDone}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Contacts with call activity recorded
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/advisor/contacts/browse")}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.24)] transition hover:bg-blue-700"
            >
              Open Browse Contacts
            </button>
          </div>
        </section>
      </div>
    </AdvisorShell>
  );
}

export default AdvisorContactsHome;