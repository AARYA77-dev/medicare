"use client";

import Link from "next/link";
import React, { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaBars, FaTimes, FaUserCircle, FaSignOutAlt, FaSignInAlt } from "react-icons/fa";
import { useSession, signOut } from "next-auth/react";

const Header = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();

  const navItems = [
    { name: "Home", path: "/" },
    { name: "User", path: "/User" },
    { name: "Medicines", path: "/Medicines" },
    // { name: "Caring", path: "/Caring" },
    { name: "Calendar", path: "/History" },
  ];

  return (
    <div className="sticky top-0 z-50 p-4 md:p-6 font-[family-name:var(--font-geist-sans)]">
      <header className="flex items-center w-full justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] border-b-[#03e9f4]/20">
        {/* Logo Section */}
        <Link href="/">
          <Image
            src="/medicareLogo.png"
            height={32}
            width={162}
            alt="logo"
            className="h-8 w-auto hover:opacity-80 transition-opacity cursor-pointer"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-8 items-center">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <p
                className={`relative cursor-pointer text-sm font-medium tracking-wide transition-all duration-300 
                hover:text-[#03e9f4] hover:[text-shadow:0_0_8px_rgba(3,233,244,0.6)]
                ${pathname === item.path ? "text-[#03e9f4]" : "text-gray-300"}`}
              >
                {item.name}
                {/* Active Indicator Underline */}
                {pathname === item.path && (
                  <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-[#03e9f4] shadow-[0_0_10px_#03e9f4] rounded-full" />
                )}
              </p>
            </Link>
          ))}
        </nav>

        {/* Auth Buttons / User Session (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          {status === "authenticated" && session?.user ? (
            <div className="flex items-center gap-3">
              <Link href="/User" className="flex items-center gap-2 text-xs font-semibold text-gray-200 hover:text-[#03e9f4] transition-colors">
                <FaUserCircle size={20} className="text-[#03e9f4]" />
                <span className="max-w-[120px] truncate">{session.user.name || session.user.email}</span>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all cursor-pointer"
                title="Sign Out"
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 text-gray-200 hover:text-[#03e9f4] transition-colors"
              >
                <FaSignInAlt />
                <span>Sign In</span>
              </Link>
              <Link
                href="/signup"
                className="text-xs font-semibold px-4 py-2 bg-[#03e9f4] text-black rounded-lg hover:bg-[#02c4ce] transition-all shadow-[0_0_10px_rgba(3,233,244,0.4)]"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-[#03e9f4] hover:bg-white/10 rounded-lg transition-colors"
        >
          {open ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>
      </header>

      {/* Mobile Dropdown Menu */}
      {open && (
        <div className="absolute right-6 left-6 mt-3 md:hidden bg-[#0a0a0a]/95 backdrop-blur-2xl border border-[#03e9f4]/30 rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path} onClick={() => setOpen(false)}>
              <p
                className={`px-6 py-3.5 text-center border-b border-white/5 active:bg-[#03e9f4]/10
                transition-all duration-300 font-medium tracking-widest text-sm
                ${pathname === item.path ? "text-[#03e9f4] bg-white/5" : "text-gray-400"}`}
              >
                {item.name}
              </p>
            </Link>
          ))}

          <div className="p-4 border-t border-white/10 text-center">
            {status === "authenticated" ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs text-gray-300">
                  Signed in as <span className="text-[#03e9f4] font-semibold">{session?.user?.name || session?.user?.email}</span>
                </p>
                <button
                  onClick={() => {
                    setOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="w-full py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FaSignOutAlt /> Sign Out
                </button>
              </div>
            ) : (
              <div className="flex justify-center gap-3">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="w-1/2 py-2 text-center text-xs font-semibold bg-white/10 border border-white/20 rounded-lg text-gray-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="w-1/2 py-2 text-center text-xs font-semibold bg-[#03e9f4] text-black rounded-lg"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;
