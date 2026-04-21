import { useEffect, useMemo, useState } from "react";
import AdvisorShell from "../components/AdvisorShell";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";

const AGE_OPTIONS = Array.from({ length: 83 }, (_, i) => i + 18);

function AdvisorDashboard() {
  const { user } = useAuth();

  const [allowedCompanies, setAllowedCompanies] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [generatedMessage, setGeneratedMessage] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    companyId: "",
    clientName: "",
    clientMobile: "",
    age: "",
    templateId: "",
  });

  useEffect(() => {
    const fetchAdvisorCompanies = async () => {
      try {
        setErrorMsg("");
        const res = await API.get("/auth/me");

        const companies =
          res?.data?.user?.advisorCompanies?.map((item) => item.company) ||
          res?.data?.user?.companies ||
          [];

        setAllowedCompanies(companies);
      } catch (error) {
        console.error("Failed to load advisor profile:", error);
        setErrorMsg(
          error?.response?.data?.message || "Failed to load advisor companies."
        );
      }
    };

    fetchAdvisorCompanies();
  }, []);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!form.companyId || !form.age) {
        setTemplates([]);
        setSelectedTemplate(null);
        setForm((prev) => ({ ...prev, templateId: "" }));
        return;
      }

      try {
        setLoadingTemplates(true);
        setErrorMsg("");
        setTemplates([]);
        setSelectedTemplate(null);
        setGeneratedMessage("");
        setForm((prev) => ({ ...prev, templateId: "" }));

        const res = await API.get(
          `/templates?companyId=${form.companyId}&age=${form.age}`
        );

        setTemplates(res.data.templates || []);
      } catch (error) {
        console.error("Failed to load templates:", error);
        setErrorMsg(
          error?.response?.data?.message || "Failed to load templates."
        );
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [form.companyId, form.age]);

  const selectedCompany = useMemo(() => {
    return allowedCompanies.find(
      (company) => String(company.id) === String(form.companyId)
    );
  }, [allowedCompanies, form.companyId]);

  const templateInfo = useMemo(() => {
    return templates.find(
      (template) => String(template.id) === String(form.templateId)
    );
  }, [templates, form.templateId]);

  useEffect(() => {
    setSelectedTemplate(templateInfo || null);
  }, [templateInfo]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setSuccessMsg("");
    setErrorMsg("");

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "companyId" || name === "age"
        ? { templateId: "" }
        : {}),
    }));

    if (name === "companyId" || name === "age") {
      setSelectedTemplate(null);
      setGeneratedMessage("");
    }
  };

  const replaceTemplateVariables = (body) => {
    if (!body) return "";

    return body
      .replaceAll("{client_name}", form.clientName || "Client")
      .replaceAll("{age}", form.age || "")
      .replaceAll("{advisor_name}", user?.name || "Advisor")
      .replaceAll("{advisor_mobile}", user?.phone || "")
      .replaceAll("{company_name}", selectedCompany?.name || "")
      .replaceAll("{template_title}", selectedTemplate?.title || "Plan");
  };

  const handleTemplateSelection = (e) => {
    const value = e.target.value;

    setForm((prev) => ({
      ...prev,
      templateId: value,
    }));

    const template = templates.find((item) => String(item.id) === String(value));
    setSelectedTemplate(template || null);
    setGeneratedMessage("");
  };

  const generateMessage = () => {
    if (!form.companyId || !form.clientName || !form.clientMobile || !form.age || !form.templateId) {
      setErrorMsg("Please select company, fill client details, age, and template.");
      return;
    }

    if (!selectedTemplate?.body) {
      setErrorMsg("Selected template has no message body.");
      return;
    }

    const finalMessage = replaceTemplateVariables(selectedTemplate.body);
    setGeneratedMessage(finalMessage);
    setSuccessMsg("Message generated successfully.");
    setErrorMsg("");
  };

  const openWhatsApp = () => {
    if (!generatedMessage.trim()) {
      setErrorMsg("Please generate the message first.");
      return;
    }

    const mobile = form.clientMobile.replace(/\D/g, "");
    if (!mobile) {
      setErrorMsg("Please enter a valid client mobile number.");
      return;
    }

    const whatsappUrl = `https://wa.me/91${mobile}?text=${encodeURIComponent(
      generatedMessage
    )}`;

    window.open(whatsappUrl, "_blank");
  };

  const openPdfLink = () => {
    if (!selectedTemplate?.pdfUrl) {
      setErrorMsg("No PDF link available for this template.");
      return;
    }

    window.open(selectedTemplate.pdfUrl, "_blank");
  };

  const copyMessage = async () => {
    if (!generatedMessage.trim()) {
      setErrorMsg("No generated message to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedMessage);
      setSuccessMsg("Message copied successfully.");
    } catch (error) {
      console.error("Copy failed:", error);
      setErrorMsg("Failed to copy message.");
    }
  };

  const clearForm = () => {
    setForm({
      companyId: "",
      clientName: "",
      clientMobile: "",
      age: "",
      templateId: "",
    });
    setTemplates([]);
    setSelectedTemplate(null);
    setGeneratedMessage("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const confirmSentAndSaveLead = async () => {
    if (!generatedMessage.trim()) {
      setErrorMsg("Generate the message before saving the lead.");
      return;
    }

    if (!selectedTemplate) {
      setErrorMsg("Please select a template first.");
      return;
    }

    try {
      setErrorMsg("");
      setSuccessMsg("");

      await API.post("/leads", {
        name: form.clientName.trim(),
        phone: form.clientMobile.trim(),
        age: form.age ? Number(form.age) : null,
        companyId: Number(form.companyId),
        templateId: selectedTemplate.id,
        remarks: "Template shared from dashboard",
        sourcePage: "DASHBOARD_PAGE",
      });

      setSuccessMsg("Lead saved successfully.");
    } catch (error) {
      console.error("Lead save failed:", error);
      setErrorMsg(
        error?.response?.data?.message ||
          "Failed to save lead. If backend route is not ready, we’ll add it next."
      );
    }
  };

  return (
    <AdvisorShell
      title="Advisor Dashboard"
      subtitle="Select company, client details, age, and suitable template. Generate the message, open WhatsApp, and continue the follow-up flow."
      activeTab="dashboard"
    >
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-4 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Allowed Companies
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {allowedCompanies.length
              ? allowedCompanies.map((c) => c.name).join(", ")
              : "No mapped companies found."}
          </p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-4 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Template Logic
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Select company + age first to unlock the right template options.
          </p>
        </div>

        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)] p-4 shadow-[0_10px_25px_rgba(37,99,235,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Message Flow
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Generate → WhatsApp → Confirm Sent → Save Lead.
          </p>
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,249,255,0.96))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Setup Workspace
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Client & Template Setup
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Fill client details, choose company and age, then select the most suitable template.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Select Company
              </label>
              <select
                name="companyId"
                value={form.companyId}
                onChange={handleInputChange}
                className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Select Company</option>
                {allowedCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Client Name
              </label>
              <input
                type="text"
                name="clientName"
                value={form.clientName}
                onChange={handleInputChange}
                placeholder="Enter client name"
                className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Client Mobile
              </label>
              <input
                type="text"
                name="clientMobile"
                value={form.clientMobile}
                onChange={handleInputChange}
                placeholder="Enter client mobile number"
                className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Select Age
              </label>
              <select
                name="age"
                value={form.age}
                onChange={handleInputChange}
                className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Select Age</option>
                {AGE_OPTIONS.map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Select Template
              </label>
              <select
                name="templateId"
                value={form.templateId}
                onChange={handleTemplateSelection}
                disabled={!form.companyId || !form.age || loadingTemplates}
                className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="">
                  {loadingTemplates
                    ? "Loading templates..."
                    : "Select Template"}
                </option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/75 px-4 py-4 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">
                Template Selection Logic
              </span>
              <br />
              First select <span className="font-semibold">Company + Age</span>,
              then choose the most suitable template from the dropdown.
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm text-amber-900">
              <span className="font-semibold">Important</span>
              <br />
              Please use only your own mobile or your own WhatsApp Web account before sending client messages.
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button
              onClick={generateMessage}
              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.24)] transition hover:bg-blue-700"
            >
              Generate Message
            </button>

            <button
              onClick={openWhatsApp}
              className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(5,150,105,0.20)] transition hover:bg-emerald-700"
            >
              Open WhatsApp
            </button>

            <button
              onClick={confirmSentAndSaveLead}
              className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(2,132,199,0.20)] transition hover:bg-sky-700"
            >
              Confirm Sent & Save Lead
            </button>

            <button
              onClick={openPdfLink}
              className="rounded-2xl border border-blue-200 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
            >
              Open PDF
            </button>
          </div>
        </section>

        <section className="rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,249,255,0.96))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Live Preview
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Message Workspace
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review selected template details and the final generated message before opening WhatsApp.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-[#f4f9ff] px-4 py-4 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">
              Selected Template
            </span>
            <br />
            <span>{selectedTemplate?.title || "No template selected"}</span>
            <br />
            <span className="text-slate-500">
              {selectedTemplate?.tagline || "Tagline will appear here"}
            </span>
          </div>

          <div className="mt-4 rounded-[28px] border border-blue-200 bg-white/75 p-3 shadow-inner">
            <textarea
              value={generatedMessage}
              onChange={(e) => setGeneratedMessage(e.target.value)}
              placeholder="Generated message will appear here"
              className="min-h-[360px] w-full resize-none rounded-[22px] border border-blue-100 bg-[#f8fbff] px-4 py-4 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={copyMessage}
              className="rounded-2xl border border-blue-200 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
            >
              Copy Message
            </button>
            <button
              onClick={clearForm}
              className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear Form
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/65 px-4 py-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Preview Tip:</span>{" "}
            Always verify the client name, age, and company before sharing the final message.
          </div>
        </section>
      </div>
    </AdvisorShell>
  );
}

export default AdvisorDashboard;