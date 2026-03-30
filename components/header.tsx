"use client"
import Link from 'next/link'
import React, { useState } from 'react'
import Image from "next/image";
import { usePathname } from 'next/navigation';
import { FaBars, FaTimes } from "react-icons/fa"

const Header = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navItems = [
    { name: "Home", path: "/" },
    { name: "User", path: "/User" },
    { name: "Medicines", path: "/Medicines" },
    { name: "Caring", path: "/Caring" },
    { name: "Calendar", path: "/History" },
  ]

  return (
   <div className="sticky top-0 z-50 p-4 md:p-6 font-[family-name:var(--font-geist-sans)]">
  <header className="flex items-center w-full justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] border-b-[#03e9f4]/20">
    {/* Logo Section */}
    <Image
      src="/medicareLogo.png"
      height={32}
      width={162}
      alt="logo"
      className="h-8 w-auto hover:opacity-80 transition-opacity"
    />

    {/* Desktop Navigation */}
    <nav className='hidden md:flex gap-10 items-center'>
      {navItems.map((item) => (
        <Link key={item.path} href={item.path}>
          <p className={`relative cursor-pointer text-sm font-medium tracking-wide transition-all duration-300 
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

    {/* Mobile Toggle */}
    <button 
      onClick={() => setOpen(!open)} 
      className='md:hidden p-2 text-[#03e9f4] hover:bg-white/10 rounded-lg transition-colors'
    >
      {open ? <FaTimes size={24} /> : <FaBars size={24} />}
    </button>
  </header>

  {/* Mobile Dropdown Menu */}
  {open && (
    <div className="absolute right-6 left-6 mt-3 md:hidden bg-[#0a0a0a]/95 backdrop-blur-2xl border border-[#03e9f4]/30 rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {navItems.map((item) => (
        <Link key={item.path} href={item.path} onClick={() => setOpen(false)}>
          <p className={`px-6 py-4 text-center border-b border-white/5 active:bg-[#03e9f4]/10
            transition-all duration-300 font-medium tracking-widest
            ${pathname === item.path ? "text-[#03e9f4] bg-white/5" : "text-gray-400"} `}
          >
            {item.name}
          </p>
        </Link>
      ))}
    </div>
  )}
</div>
  )
}

export default Header
