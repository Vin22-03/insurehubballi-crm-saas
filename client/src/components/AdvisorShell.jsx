import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiHome,
  FiUsers,
  FiUser,
  FiPhone,
  FiBook,
  FiMenu,
  FiX,
  FiLogOut,
} from "react-icons/fi";

const navItems = [
  { key: "dashboard", label: "Dashboard", path: "/advisor", icon: <FiHome /> },
  { key: "leads", label: "My Leads", path: "/advisor/leads", icon: <FiUsers /> },
  { key: "profile", label: "Profile", path: "/advisor/profile", icon: <FiUser /> },
  { key: "contacts", label: "Contacts", path: "/advisor/contacts", icon: <FiPhone /> },
  { key: "resources", label: "Resources", path: "/advisor/resources", icon: <FiBook /> },
];

function AdvisorShell({ title, subtitle, activeTab = "dashboard", children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const userName = user?.name || "Advisor";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_28%),linear-gradient(180deg,#edf6ff_0%,#f3f9ff_45%,#f8fbff_100%)] text-slate-900">
      <div className="mx-auto w-full max-w-[1700px] px-3 py-3 sm:px-5 sm:py-5 lg:px-6">
        <div className="flex min-h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/58 shadow-[0_28px_90px_rgba(30,64,175,0.10)] backdrop-blur-2xl sm:min-h-[calc(100vh-2.5rem)] sm:rounded-[32px]">
          <header className="border-b border-blue-100/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(241,248,255,0.82))]">
            <div className="px-5 py-5 sm:px-6 lg:px-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/75 px-3 py-1 text-[11px] font-bold tracking-wide text-blue-700 shadow-[0_8px_22px_rgba(37,99,235,0.10)]">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)]" />
                    Team - insurehubballi
                  </div>

                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/75 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm lg:hidden">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-sky-500 text-[10px] font-bold text-white">
                      {userInitial}
                    </span>
                    <span>{userName}</span>
                  </div>

                  <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    {title}
                  </h1>

                  {subtitle ? (
                    <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 sm:text-base">
                      {subtitle}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setMobileOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white/80 px-4 py-2 text-sm font-bold text-slate-700 shadow-[0_10px_25px_rgba(15,23,42,0.07)] transition hover:bg-white lg:hidden"
                >
                  {mobileOpen ? <FiX size={16} /> : <FiMenu size={16} />}
                  {mobileOpen ? "Close" : ""}
                </button>
              </div>

              {/* DESKTOP NAV */}
              <div className="mt-5 hidden items-center gap-4 lg:flex">
                <div className="flex flex-wrap items-center gap-1 rounded-full bg-white/66 p-1.5 shadow-[inset_0_0_0_1px_rgba(191,219,254,0.75),0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                  {navItems.map((item) => {
                    const isActive = activeTab === item.key;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => navigate(item.path)}
                        className={`group relative flex items-center gap-2 overflow-hidden rounded-full px-4 py-2 text-sm font-bold transition-all duration-300 ${
                          isActive
                            ? "bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)]"
                            : "text-slate-600 hover:bg-white/75 hover:text-blue-700 hover:shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
                        }`}
                      >
                        {isActive ? (
                          <span className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.20),transparent)] opacity-70" />
                        ) : null}
                        <span className="relative text-base transition-transform duration-300 group-hover:-translate-y-0.5">
                          {item.icon}
                        </span>
                        <span className="relative">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="ml-auto flex items-center gap-3 border-l border-blue-100 pl-4">
                  <div className="hidden items-center gap-2 rounded-full border border-blue-100 bg-white/78 px-3 py-2 text-sm font-semibold text-slate-600 shadow-[0_8px_22px_rgba(15,23,42,0.05)] xl:flex">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-sky-500 text-xs font-black text-white shadow-[0_8px_18px_rgba(37,99,235,0.25)]">
                      {userInitial}
                    </span>
                    <span>{userName}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="group inline-flex items-center gap-2 rounded-full border border-red-200 bg-white/82 px-4 py-2.5 text-sm font-bold text-red-600 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-[0_12px_28px_rgba(239,68,68,0.12)]"
                  >
                    <FiLogOut className="transition-transform group-hover:translate-x-0.5" />
                    Logout
                  </button>
                </div>
              </div>

              {/* MOBILE NAV */}
              {mobileOpen && (
                <div className="mt-4 rounded-[26px] border border-blue-100 bg-white/92 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.10)] backdrop-blur-xl lg:hidden">
                  <div className="mb-3 flex items-center gap-2 rounded-2xl bg-blue-50/70 px-3 py-2 text-sm font-bold text-slate-700">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-sky-500 text-xs font-black text-white">
                      {userInitial}
                    </span>
                    <span>{userName}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {navItems.map((item) => {
                      const isActive = activeTab === item.key;

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setMobileOpen(false);
                            navigate(item.path);
                          }}
                          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                            isActive
                              ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)]"
                              : "bg-blue-50/65 text-slate-700 hover:bg-blue-100/75"
                          }`}
                        >
                          <span className="text-base">{item.icon}</span>
                          {item.label}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-bold text-red-600"
                    >
                      <FiLogOut />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>

          <footer className="border-t border-blue-100/70 bg-white/45 px-5 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 text-center text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <p>© {new Date().getFullYear()} Team - insurehubballi</p>
              <p>Secure advisor workspace · Premium CRM</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default AdvisorShell;
