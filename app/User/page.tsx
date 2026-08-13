"use client";

import Header from "@/components/header";
import React from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { FaUserCircle, FaEnvelope, FaSignOutAlt, FaShieldAlt } from "react-icons/fa";

const UserPage = () => {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen text-white flex flex-col relative overflow-hidden">
      <Header />
      <div className="container mx-auto px-4 py-10 flex flex-col items-center">
        {status === "loading" ? (
          <div className="w-full max-w-md p-8 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md text-center">
            <p className="text-gray-400">Loading user profile...</p>
          </div>
        ) : status === "authenticated" && session?.user ? (
          <div className="w-full max-w-md border border-white/10 rounded-3xl bg-white/5 backdrop-blur-xl p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] border-b-[#03e9f4]/30 space-y-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-4 bg-[#03e9f4]/10 rounded-full border border-[#03e9f4]/30 shadow-[0_0_15px_rgba(3,233,244,0.3)]">
                <FaUserCircle className="text-[#03e9f4] text-6xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {session.user.name || "Medicare User"}
                </h1>
                <p className="text-sm text-gray-400 flex items-center justify-center gap-2 mt-1">
                  <FaEnvelope className="text-[#03e9f4]" />
                  {session.user.email}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#03e9f4]/10 text-[#03e9f4] border border-[#03e9f4]/30 rounded-full text-xs font-semibold">
                <FaShieldAlt /> Authenticated User
              </span>
            </div>

            <div className="border-t border-white/10 pt-6 space-y-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <p className="text-xs text-gray-400 font-medium">Shared Application Access</p>
                <p className="text-xs text-gray-300 mt-1">
                  You are logged into the shared Medicare database. All medicines and schedule data are synced across users.
                </p>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full py-3 px-4 bg-red-500/20 text-red-400 border border-red-500/30 font-semibold rounded-xl hover:bg-red-500/30 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer shadow-lg"
              >
                <FaSignOutAlt /> Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md border border-white/10 rounded-3xl bg-white/5 backdrop-blur-xl p-8 shadow-2xl text-center space-y-6">
            <div className="p-4 bg-yellow-500/10 rounded-full border border-yellow-500/30 text-yellow-400 w-fit mx-auto">
              <FaUserCircle size={40} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Not Signed In</h2>
              <p className="text-sm text-gray-400 mt-2">
                Please log in or create an account to view your profile details.
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/login"
                className="w-1/2 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-sm transition-all border border-white/10"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="w-1/2 py-2.5 bg-[#03e9f4] hover:bg-[#02c4ce] text-black font-semibold rounded-xl text-sm transition-all shadow-[0_0_10px_rgba(3,233,244,0.4)]"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPage;