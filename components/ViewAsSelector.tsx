"use client";

import React, { useEffect, useRef, useState } from "react";
import { FaChevronDown, FaCog, FaEye, FaHandshake, FaUser, FaUsers } from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchMyCollaborations,
  setViewAs,
  clearViewAs,
  CollabRole,
} from "@/store/sharingSlice";
import { clearMedicines, fetchMedicines } from "@/store/medicineSlice";

const ROLE_META: Record<CollabRole, { label: string; color: string; Icon: typeof FaEye }> = {
  readonly: { label: "Viewer", color: "text-blue-400 bg-blue-500/10 border-blue-500/30", Icon: FaEye },
  collaborator: { label: "Care Partner", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", Icon: FaHandshake },
  admin: { label: "Co-Manager", color: "text-violet-400 bg-violet-500/10 border-violet-500/30", Icon: FaCog },
};

export default function ViewAsSelector() {
  const dispatch = useAppDispatch();
  const { collaborations, collaborationsLoaded, viewingOwnerId, viewingOwnerName, role } =
    useAppSelector((state) => state.sharing);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchMyCollaborations());
  }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!collaborationsLoaded || collaborations.length === 0) return null;

  const handleSwitchTo = (collab: (typeof collaborations)[0]) => {
    setOpen(false);
    if (viewingOwnerId === collab.ownerId) return;
    dispatch(clearMedicines());
    dispatch(setViewAs({ ownerId: collab.ownerId, ownerName: collab.ownerName, ownerEmail: collab.ownerEmail, role: collab.role }));
    dispatch(fetchMedicines({ ownerId: collab.ownerId, forceReload: true }));
  };

  const handleSwitchToOwn = () => {
    setOpen(false);
    if (!viewingOwnerId) return;
    dispatch(clearMedicines());
    dispatch(clearViewAs());
    dispatch(fetchMedicines({ forceReload: true }));
  };

  const isViewingOwn = !viewingOwnerId;
  const roleMeta = role ? ROLE_META[role] : null;

  return (
    <div ref={ref} className="relative mb-6">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md hover:border-[#03e9f4]/40 transition-all text-sm font-medium text-white cursor-pointer shadow-lg"
        aria-label="Switch schedule view"
      >
        {isViewingOwn ? (
          <>
            <FaUser className="text-[#03e9f4] text-xs" />
            <span className="text-[#03e9f4] font-semibold">My Schedule</span>
          </>
        ) : (
          <>
            <FaUsers className="text-amber-400 text-xs" />
            <span className="text-amber-300 font-semibold">
              {viewingOwnerName}&apos;s Schedule
            </span>
            {roleMeta && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleMeta.color}`}>
                <roleMeta.Icon aria-hidden="true" /> {roleMeta.label}
              </span>
            )}
          </>
        )}
        <FaChevronDown
          className={`text-gray-400 text-xs ml-auto transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 min-w-[260px] bg-[#0a0a0a]/95 backdrop-blur-2xl border border-[#03e9f4]/20 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Own schedule */}
          <button
            onClick={handleSwitchToOwn}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left cursor-pointer border-b border-white/5
              ${isViewingOwn ? "bg-[#03e9f4]/10 text-[#03e9f4]" : "text-gray-300 hover:bg-white/5"}`}
          >
            <FaUser className="text-xs shrink-0" />
            <div>
              <p className="font-semibold">My Schedule</p>
              <p className="text-xs text-gray-500">Your own medicine data</p>
            </div>
            {isViewingOwn && <span className="ml-auto text-[10px] text-[#03e9f4] font-bold">ACTIVE</span>}
          </button>

          {/* Collaborations */}
          {collaborations.map((c) => {
            const meta = ROLE_META[c.role];
            const isActive = viewingOwnerId === c.ownerId;
            return (
              <button
                key={c.accessId}
                onClick={() => handleSwitchTo(c)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left cursor-pointer border-b border-white/5 last:border-0
                  ${isActive ? "bg-amber-500/10 text-amber-300" : "text-gray-300 hover:bg-white/5"}`}
              >
                <FaUsers className="text-xs shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.ownerName}</p>
                  <p className="text-xs text-gray-500 truncate">{c.ownerEmail}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
                  <meta.Icon aria-hidden="true" /> {meta.label}
                </span>
                {isActive && <span className="ml-1 text-[10px] text-amber-400 font-bold">ACTIVE</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
