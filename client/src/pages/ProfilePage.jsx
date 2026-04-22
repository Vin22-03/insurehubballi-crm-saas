import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  Mail,
  Phone,
  Building2,
  CalendarDays,
  ShieldCheck,
  Lock,
  BadgeCheck,
  UserCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import AdvisorShell from "../components/AdvisorShell";
import AdminShell from "../components/AdminShell";

function ProfileContent() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "",
    dob: "",
    bio: "",
    photo: null,
  });

  const fetchProfile = async () => {
    try {
      setError("");
      const res = await API.get("/profile/me");

      setProfile(res.data);
      setPreview(
        res.data.photoUrl ? `http://localhost:5000${res.data.photoUrl}` : ""
      );
      setForm({
        email: res.data.email || "",
        dob: res.data.dob ? res.data.dob.slice(0, 10) : "",
        bio: res.data.bio || "",
        photo: null,
      });
    } catch (err) {
      console.error("fetchProfile error:", err);
      setError(err?.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const initials = useMemo(() => {
    if (!profile?.name) return "U";

    return profile.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [profile?.name]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "photo" && files?.[0]) {
      setForm((prev) => ({ ...prev, photo: files[0] }));
      setPreview(URL.createObjectURL(files[0]));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const data = new FormData();
      data.append("email", form.email);
      data.append("dob", form.dob);
      data.append("bio", form.bio);

      if (form.photo) {
        data.append("photo", form.photo);
      }

      await API.put("/profile/me", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await fetchProfile();
      alert("Profile updated successfully");
    } catch (err) {
      console.error("handleSave error:", err);
      alert(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-[28px] border border-blue-100 bg-white/85 p-6 shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
        <p className="text-sm text-slate-600">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-red-50/90 p-5 text-sm text-red-700 shadow-sm">
        {error}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-[28px] border border-blue-100 bg-white/85 p-6 text-sm text-slate-600 shadow-sm">
        Profile not found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
      {/* LEFT COLUMN */}
      <div className="space-y-6">
        {/* PROFILE IDENTITY CARD */}
        <section className="rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,249,255,0.98))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
          <div className="rounded-[26px] border border-blue-100 bg-white/85 p-5">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="h-36 w-36 overflow-hidden rounded-[2rem] border border-blue-100 bg-[#f8fbff] shadow-[0_18px_40px_rgba(37,99,235,0.12)] ring-4 ring-blue-50">
                  {preview ? (
                    <img
                      src={preview}
                      alt="profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 via-sky-50 to-cyan-100 text-[42px] font-bold tracking-wide text-blue-700">
                      {initials || <UserCircle2 size={72} />}
                    </div>
                  )}
                </div>

                <label className="absolute -bottom-2 -right-2 flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] transition duration-150 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98]">
                  <Camera size={18} />
                  <input
                    type="file"
                    name="photo"
                    accept="image/*"
                    className="hidden"
                    onChange={handleChange}
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <span
                  className={`h-3 w-3 rounded-full ${
                    profile.isActive
                      ? "bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.85)]"
                      : "bg-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.55)]"
                  }`}
                />
                <span className="text-sm font-semibold text-slate-600">
                  {profile.isActive ? "Active Account" : "Inactive Account"}
                </span>
              </div>

              <h2 className="mt-4 text-[30px] font-bold tracking-tight text-slate-900">
                {profile.name}
              </h2>

              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                <BadgeCheck size={14} />
                {profile.role}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <InfoRow
                icon={<Phone size={18} className="text-blue-700" />}
                label="Phone"
                value={profile.phone}
              />
              <InfoRow
                icon={<Mail size={18} className="text-blue-700" />}
                label="Email"
                value={profile.email || "No email added yet"}
              />
              <InfoRow
  icon={<CalendarDays size={18} className="text-blue-700" />}
  label="Joining Date"
  value={
    profile.dob
      ? new Date(profile.dob).toLocaleDateString("en-IN")
      : "Not added yet"
  }
/>
            </div>

            {/* COMPACT STATS */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <MiniStat
                label="Leads"
                value={profile.stats?.leads ?? 0}
                tone="blue"
              />
              <MiniStat
                label="Msgs"
                value={profile.stats?.messages ?? 0}
                tone="violet"
              />
              <MiniStat
                label="Companies"
                value={profile.stats?.companies ?? 0}
                tone="emerald"
              />
            </div>
          </div>
        </section>

        {/* ASSIGNED COMPANIES */}
        <section className="rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,249,255,0.98))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
          <div className="rounded-[26px] border border-blue-100 bg-white/85 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700">
                <Building2 size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                  Companies
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  Assigned Companies
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {profile.assignedCompanies?.length ? (
                profile.assignedCompanies.map((company) => (
                  <span
                    key={company.id}
                    className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_6px_16px_rgba(15,23,42,0.06)]"
                  >
                    {company.name}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-500">No assigned companies</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* RIGHT COLUMN */}
      <section className="rounded-[30px] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,249,255,0.98))] p-5 shadow-[0_18px_45px_rgba(37,99,235,0.07)] sm:p-6">
        <div className="rounded-[26px] border border-blue-100 bg-white/85 p-5 sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                Profile Details
              </p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">
                Personal Information
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Field label="Name" locked>
              <input
                value={profile.name}
                disabled
                className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-500 outline-none"
              />
            </Field>

            <Field label="Phone Number" locked>
              <input
                value={profile.phone}
                disabled
                className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-500 outline-none"
              />
            </Field>

            <Field label="Email Address">
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </Field>

            <Field label="Joining Date">
              <input
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                className="w-full rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </Field>

            <div className="xl:col-span-2">
              <Field label="Bio">
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Write a short professional bio"
                  className="w-full resize-none rounded-2xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Lock size={16} />
              Name and phone can only be changed by admin.
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(37,99,235,0.28)] transition duration-150 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfilePage() {
  const { user } = useAuth();

  if (user?.role === "ADMIN") {
    return (
      <AdminShell
        title="My Profile"
        subtitle="Manage your admin identity, account details, and profile information from one premium control space."
        activeTab="profile"
      >
        <ProfileContent />
      </AdminShell>
    );
  }

  return (
    <AdvisorShell
      title="My Profile"
      subtitle="Manage your advisor profile, personal details, and workspace identity in one premium dashboard."
      activeTab="profile"
    >
      <ProfileContent />
    </AdvisorShell>
  );
}

function MiniStat({ label, value, tone = "blue" }) {
  const toneMap = {
    blue: "border-blue-100 bg-blue-50/70 text-blue-700",
    violet: "border-violet-100 bg-violet-50/70 text-violet-700",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
  };

  return (
    <div className={`rounded-[20px] border p-3 ${toneMap[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1.5 text-xl font-bold">{value}</p>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-blue-100 bg-[#f8fbff] px-4 py-3">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-medium text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}

function Field({ label, children, locked = false }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        {locked ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <Lock size={10} />
            Locked
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export default ProfilePage;