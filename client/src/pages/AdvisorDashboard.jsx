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
      ...(name === "companyId" || name === "age" ? { templateId: "" } : {}),
    }));

    if (name === "companyId" || name === "age") {
      setSelectedTemplate(null);
      setGeneratedMessage("");
    }
  };

  const replaceTemplateVariables = (body) => {
  if (!body) return "";

  const isTataAig =
    selectedCompany?.code === "TATA_AIG" ||
    selectedCompany?.name?.toLowerCase().includes("tata aig");

  return body
    .replaceAll("{client_name}", form.clientName || "Client")
    .replaceAll("{age}", form.age || "")
    .replaceAll("{advisor_name}", user?.name || "Advisor")
    .replaceAll("{advisor_mobile}", user?.phone || "")
    .replaceAll("{advisor_url}", "")
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
  if (
    !form.companyId ||
    !form.clientName ||
    !form.clientMobile ||
    !form.age ||
    !form.templateId
  ) {
    setErrorMsg("Please select company, fill client details, age, and template.");
    return;
  }

  if (!selectedTemplate?.body) {
    setErrorMsg("Selected template has no message body.");
    return;
  }

  const bodyWithVariables = replaceTemplateVariables(selectedTemplate.body);

  const companyName =
    selectedCompany?.name ||
    selectedTemplate?.company?.name ||
    "";

  const companyCode =
    selectedCompany?.code ||
    selectedTemplate?.company?.code ||
    "";

  const isTataAig =
    companyName.toLowerCase().includes("tata aig") ||
    companyCode.toLowerCase().includes("tata_aig") ||
    companyCode.toLowerCase().includes("tata-aig");

  const advisorPhone = String(user?.phone || "").replace(/\D/g, "");

  const advisorChatflowUrl = advisorPhone
    ? `${window.location.origin}/chatflow/${advisorPhone}`
    : "";

  const advisorUrlLine =
  isTataAig && advisorChatflowUrl
    ? `\n\nFor more information, please chat with *Shreya* \n${advisorChatflowUrl}`
    : "";

  const finalMessage = `Dear *${form.clientName || "Client"}*,

${bodyWithVariables}

For more details, please contact:
*${user?.name || "Advisor"}*
*${user?.phone || ""}*${advisorUrlLine}

Team - insurehubballi  
Your Cover, Our Care`;

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
    <AdvisorShell title="Advisor Dashboard" activeTab="dashboard">
      {errorMsg ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 sm:text-sm">
          {errorMsg}
        </div>
      ) : null}

      {successMsg ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 sm:text-sm">
          {successMsg}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,249,255,0.98))] p-4 shadow-[0_12px_32px_rgba(37,99,235,0.06)] sm:p-5">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
              Message Setup
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
              Client & Template
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Company
              </label>
              <select
                name="companyId"
                value={form.companyId}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-blue-100 bg-[#f8fbff] px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Client Name
              </label>
              <input
                type="text"
                name="clientName"
                value={form.clientName}
                onChange={handleInputChange}
                placeholder="Enter client name"
                className="w-full rounded-xl border border-blue-100 bg-[#f8fbff] px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Client Mobile
              </label>
              <input
                type="text"
                name="clientMobile"
                value={form.clientMobile}
                onChange={handleInputChange}
                placeholder="Enter mobile number"
                className="w-full rounded-xl border border-blue-100 bg-[#f8fbff] px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Age
              </label>
              <select
                name="age"
                value={form.age}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-blue-100 bg-[#f8fbff] px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Template
              </label>
              <select
                name="templateId"
                value={form.templateId}
                onChange={handleTemplateSelection}
                disabled={!form.companyId || !form.age || loadingTemplates}
                className="w-full rounded-xl border border-blue-100 bg-[#f8fbff] px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="">
                  {loadingTemplates ? "Loading templates..." : "Select Template"}
                </option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
  <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-3 text-xs text-slate-700">
    <span className="font-bold text-slate-900">Template Selection Logic</span>
    <br />
    First select <span className="font-bold">Company + Age</span>, then choose
    the most suitable template from the dropdown.
  </div>

  <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-3 text-xs text-amber-900">
    <span className="font-bold">Important</span>
    <br />
    Please use only your own mobile or your own WhatsApp Web account before sending client messages.
  </div>
</div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              onClick={generateMessage}
              className="rounded-xl bg-blue-600 px-3 py-2.5 text-[11px] font-bold text-white shadow-[0_10px_20px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 sm:text-xs"
            >
              Generate
            </button>

            <button
              onClick={openWhatsApp}
              className="rounded-xl bg-emerald-600 px-3 py-2.5 text-[11px] font-bold text-white shadow-[0_10px_20px_rgba(5,150,105,0.18)] transition hover:bg-emerald-700 sm:text-xs"
            >
              WhatsApp
            </button>

            <button
              onClick={confirmSentAndSaveLead}
              className="rounded-xl bg-sky-600 px-3 py-2.5 text-[11px] font-bold text-white shadow-[0_10px_20px_rgba(2,132,199,0.18)] transition hover:bg-sky-700 sm:text-xs"
            >
              Save Lead
            </button>

            <button
              onClick={openPdfLink}
              className="rounded-xl border border-blue-200 bg-white/90 px-3 py-2.5 text-[11px] font-bold text-slate-700 transition hover:bg-blue-50 sm:text-xs"
            >
              PDF
            </button>
          </div>
        </section>

        <section className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,249,255,0.98))] p-4 shadow-[0_12px_32px_rgba(37,99,235,0.06)] sm:p-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
                Preview
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                Message
              </h2>
            </div>

            <p className="text-xs font-semibold text-blue-700">
              {selectedTemplate?.title || "No template selected"}
            </p>
          </div>

          <div className="rounded-[20px] border border-blue-200 bg-white/75 p-2 shadow-inner">
            <textarea
              value={generatedMessage}
              onChange={(e) => setGeneratedMessage(e.target.value)}
              placeholder="Generated message will appear here"
              className="min-h-[220px] w-full resize-none rounded-2xl border border-blue-100 bg-[#f8fbff] px-3 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:min-h-[300px]"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={copyMessage}
              className="rounded-xl border border-blue-200 bg-white/90 px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-blue-50"
            >
              Copy
            </button>
            <button
              onClick={clearForm}
              className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </section>
      </div>
    </AdvisorShell>
  );
}

export default AdvisorDashboard;
