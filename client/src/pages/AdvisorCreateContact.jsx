import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdvisorShell from "../components/AdvisorShell";
import API from "../api/axios";

function AdvisorCreateContact() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const normalizeTags = (value) =>
    value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(digitsOnly);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMsg("");
    setSuccessMsg("");

    if (!phone) {
      setErrorMsg("Phone number is required.");
      return;
    }

    if (phone.length !== 10) {
      setErrorMsg("Phone number must be exactly 10 digits.");
      return;
    }

    try {
      setLoading(true);

      await API.post("/contacts", {
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        sourceNote: notes.trim(),
        tags: normalizeTags(tags),
      });

      setSuccessMsg("Contact created successfully ✅");

      setName("");
      setPhone("");
      setCity("");
      setTags("");
      setNotes("");

      setTimeout(() => {
        navigate("/advisor/contacts/browse");
      }, 800);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err?.response?.data?.message || "Failed to create contact."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdvisorShell
      title="Create Contact"
      subtitle="Add a contact manually before moving it into active lead follow-up."
      activeTab="contacts"
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

      <div className="mx-auto max-w-3xl rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,249,255,0.98))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Manual Contact Entry
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              New Contact Details
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Save the contact first. You can call, WhatsApp, edit, or convert it into a lead later from the contacts workflow.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/advisor/contacts")}
            className="inline-flex items-center justify-center rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-blue-50 active:translate-y-0 active:scale-[0.99]"
          >
            ← Back to Contacts
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Client Name
            </label>
            <input
              type="text"
              placeholder="Enter name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter 10 digit mobile number"
              value={phone}
              onChange={handlePhoneChange}
              maxLength={10}
              className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
            <p className="mt-2 text-xs text-slate-500">
              Only 10 digits allowed.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              City
            </label>
            <input
              type="text"
              placeholder="Enter city (optional)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={60}
              className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Tags
            </label>
            <input
              type="text"
              placeholder="e.g. Health, Life, Hot"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              maxLength={150}
              className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
            <p className="mt-2 text-xs text-slate-500">
              Separate multiple tags with comma. Example: Health, Life
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Notes
            </label>
            <textarea
              placeholder="Optional remarks about this contact..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={300}
              className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => navigate("/advisor/contacts")}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 active:scale-[0.99]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.24)] transition duration-150 hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Creating..." : "Create Contact"}
            </button>
          </div>
        </form>
      </div>
    </AdvisorShell>
  );
}

export default AdvisorCreateContact;