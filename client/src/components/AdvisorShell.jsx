import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { key: "dashboard", label: "Dashboard", path: "/advisor" },
  { key: "leads", label: "My Leads", path: "/advisor/leads" },
  { key: "contacts", label: "Contacts", path: "/advisor/contacts" },
  { key: "templates", label: "Templates", path: "/advisor/templates" },
  { key: "profile", label: "Profile", path: "/advisor/profile" },
];

function AdvisorShell({ title, subtitle, activeTab = "dashboard", children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_28%),linear-gradient(180deg,#edf6ff_0%,#eef7ff_45%,#f7fbff_100%)] text-slate-900">
      <div className="mx-auto w-full max-w-[1700px] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
        <div className="flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[24px] border border-blue-100/80 bg-white/60 shadow-[0_18px_50px_rgba(30,64,175,0.07)] backdrop-blur-xl sm:min-h-[calc(100vh-2.5rem)]">
          {/* TOP NAVBAR */}
          <header className="border-b border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(240,247,255,0.95))]">
            <div className="px-5 py-5 sm:px-6 lg:px-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700 shadow-sm">
                    Team - insurehubballi
                  </div>

                  <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {title}
                  </h1>

                  <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 sm:text-base">
                    {subtitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileOpen((prev) => !prev)}
                  className="inline-flex items-center rounded-2xl border border-blue-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white lg:hidden"
                >
                  {mobileOpen ? "Close" : "Menu"}
                </button>
              </div>

              {/* DESKTOP NAV */}
              <div className="mt-5 hidden items-center gap-3 lg:flex">
                {navItems.map((item) => {
                  const isActive = activeTab === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                        isActive
                          ? "bg-blue-600 text-white shadow-[0_10px_25px_rgba(37,99,235,0.22)]"
                          : "border border-blue-100 bg-white/85 text-slate-700 hover:bg-blue-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}

                <div className="ml-auto flex items-center gap-3">
                  <div className="hidden rounded-2xl border border-blue-100 bg-white/85 px-4 py-2 text-sm text-slate-600 xl:block">
                    {user?.name || "Advisor"}
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-2xl border border-red-200 bg-white/85 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              </div>

              {/* MOBILE NAV */}
              {mobileOpen && (
                <div className="mt-4 rounded-3xl border border-blue-100 bg-white/95 p-4 shadow-sm lg:hidden">
                  <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700">
                    Logged in as{" "}
                    <span className="font-semibold">{user?.name || "Advisor"}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
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
                          className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                            isActive
                              ? "bg-blue-600 text-white"
                              : "border border-blue-100 bg-blue-50/70 text-slate-700 hover:bg-blue-100/70"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-600"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className="flex-1 p-5 sm:p-6 lg:p-8">{children}</main>

          {/* FOOTER */}
          <footer className="border-t border-blue-100/80 bg-white/50 px-5 py-4 sm:px-6 lg:px-8">
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