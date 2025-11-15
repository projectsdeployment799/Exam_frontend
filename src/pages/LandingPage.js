import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, GraduationCap, UserCog, Lock } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const [showAdminTooltip, setShowAdminTooltip] = useState(false);
  const [showAdminButton, setShowAdminButton] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimeoutRef = useRef(null);
  const isMobileRef = useRef(window.innerWidth < 768);

  useEffect(() => {
    // Update mobile state on resize
    const handleResize = () => {
      isMobileRef.current = window.innerWidth < 768;
    };
    window.addEventListener("resize", handleResize);

    // Desktop: Ctrl+P keyboard shortcut
    const handleKeyDown = (e) => {
      if (isMobileRef.current) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setAdminMode((prev) => !prev);
        setShowAdminButton((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Mobile: Triple tap on logo
  const handleLogoTap = () => {
    if (!isMobileRef.current) return;

    tapCountRef.current += 1;

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    if (tapCountRef.current === 3) {
      setAdminMode((prev) => !prev);
      setShowAdminButton((prev) => !prev);
      tapCountRef.current = 0;
    }

    tapTimeoutRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 300);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-all duration-500 ${
      adminMode
        ? "bg-gradient-to-br from-slate-950 via-orange-950 to-slate-950"
        : "bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950"
    }`}>
      {/* Floating Admin Button - Bottom Right Corner */}
      {showAdminButton && (
        <button
          data-testid="floating-admin-btn"
          onClick={() => navigate("/admin/login")}
          onMouseEnter={() => setShowAdminTooltip(true)}
          onMouseLeave={() => setShowAdminTooltip(false)}
          className={`fixed bottom-6 right-6 w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 z-40 group animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            adminMode
              ? "bg-gradient-to-br from-orange-600 to-red-700 hover:from-orange-500 hover:to-red-600 shadow-orange-500/50"
              : "bg-gradient-to-br from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 shadow-cyan-500/50"
          }`}
          aria-label="Admin Portal"
        >
          <UserCog className="w-6 h-6 sm:w-7 sm:h-7 text-white" />

          {/* Pulsing Ring */}
          <div className={`absolute inset-0 rounded-full border-2 ${
            adminMode ? "border-orange-400" : "border-cyan-400"
          }`}></div>
        </button>
      )}

      {/* Tooltip */}
      {showAdminTooltip && showAdminButton && (
        <div className={`fixed bottom-24 right-6 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-xl z-40 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
          adminMode
            ? "bg-slate-800 border border-orange-600/50"
            : "bg-slate-800 border border-cyan-600/50"
        }`}>
          Admin Portal
          <div className="absolute bottom-0 right-4 w-2 h-2 bg-slate-800 transform rotate-45 translate-y-1"></div>
        </div>
      )}

      <div className="max-w-6xl w-full">
        <div className="text-center mb-10">
          {/* Logo - Triple tap on mobile */}
          <div
            className="flex justify-center mb-5 cursor-pointer select-none"
            onClick={handleLogoTap}
          >
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-500 ${
              adminMode
                ? "bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-500/50"
                : "bg-gradient-to-br from-green-500 to-cyan-600 shadow-cyan-500/50"
            }`}>
              <BookOpen className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold mb-3 text-white">
            <span className={`bg-clip-text text-transparent transition-all duration-500 ${
              adminMode
                ? "bg-gradient-to-r from-orange-400 via-red-400 to-pink-500"
                : "bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500"
            }`}>
              Exam Browser
            </span>
          </h1>
          <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto">
            Secure online examination platform with advanced proctoring
          </p>
        </div>

        {/* Portal Cards Container */}
        <div className="max-w-md mx-auto">
          {/* Student Card */}
          <div
            data-testid="student-portal-card"
            onClick={() => !adminMode && navigate("/student/login")}
            className={`rounded-xl p-6 sm:p-8 cursor-pointer hover:scale-105 transition-all duration-500 hover:shadow-xl group border backdrop-blur-md ${
              !adminMode
                ? "glass-effect bg-slate-800/40 border-cyan-600/20 hover:shadow-cyan-500/20 block"
                : "hidden"
            }`}
          >
            <div className="flex items-center mb-6">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center transition-all duration-500 bg-gradient-to-br from-green-600/30 to-cyan-600/30 group-hover:from-green-600/40 group-hover:to-cyan-600/40">
                <GraduationCap className="w-7 h-7 text-cyan-400" />
              </div>
              <div className="ml-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Student Portal
                </h2>
                <p className="text-gray-400 text-sm">Take exams securely</p>
              </div>
            </div>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-3 bg-gradient-to-r from-green-400 to-cyan-400"></div>
                <span>Access available exams</span>
              </li>
              <li className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-3 bg-gradient-to-r from-green-400 to-cyan-400"></div>
                <span>Secure exam environment</span>
              </li>
              <li className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-3 bg-gradient-to-r from-green-400 to-cyan-400"></div>
                <span>View your results</span>
              </li>
            </ul>
            {isMobileRef.current && (
              <p className="text-xs text-gray-500 mt-4 text-center">
              </p>
            )}
          </div>

          {/* Admin Card */}
          <div
            data-testid="admin-portal-card"
            onClick={() => adminMode && navigate("/admin/login")}
            className={`rounded-xl p-6 sm:p-8 cursor-pointer hover:scale-105 transition-all duration-500 hover:shadow-xl group border backdrop-blur-md ${
              adminMode
                ? "glass-effect bg-slate-800/40 border-orange-600/20 hover:shadow-orange-500/20 block"
                : "hidden"
            }`}
          >
            <div className="flex items-center mb-6">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center transition-all duration-500 bg-gradient-to-br from-orange-600/30 to-red-600/30 group-hover:from-orange-600/40 group-hover:to-red-600/40">
                <Lock className="w-7 h-7 text-orange-400" />
              </div>
              <div className="ml-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Admin Portal
                </h2>
                <p className="text-gray-400 text-sm">Manage exams securely</p>
              </div>
            </div>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-3 bg-gradient-to-r from-orange-400 to-red-400"></div>
                <span>Create and configure exams</span>
              </li>
              <li className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-3 bg-gradient-to-r from-orange-400 to-red-400"></div>
                <span>Upload questions and content</span>
              </li>
              <li className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-3 bg-gradient-to-r from-orange-400 to-red-400"></div>
                <span>View results and analytics</span>
              </li>
            </ul>
            {isMobileRef.current && (
              <p className="text-xs text-gray-500 mt-4 text-center">
              </p>
            )}
          </div>
        </div>

        <div className="text-center mt-10 text-gray-500 text-sm">
          <p>Secure • Reliable • Comprehensive</p>
        </div>
      </div>
    </div>
  );
}