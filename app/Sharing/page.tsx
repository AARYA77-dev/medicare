"use client";

import Header from "@/components/header";
import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FaEnvelope, FaUserPlus, FaUsers, FaInbox, FaTrash,
  FaCheck, FaTimes, FaEye, FaHandshake, FaCog,
  FaSpinner, FaLink, FaUserShield, FaArrowsAltV,
} from "react-icons/fa";

type CollabRole = "readonly" | "collaborator" | "admin";
type InviteStatus = "pending" | "accepted" | "declined";

interface SentInvitation {
  _id: string;
  inviteeEmail: string;
  role: CollabRole;
  status: InviteStatus;
  createdAt: string;
}

interface Collaborator {
  _id: string;
  collaboratorId: { _id: string; name: string; email: string };
  role: CollabRole;
  createdAt: string;
}

interface PendingInvitation {
  _id: string;
  ownerId: { _id: string; name: string; email: string };
  role: CollabRole;
  createdAt: string;
}

interface MyCollaboration {
  _id: string;
  ownerId: { _id: string; name: string; email: string };
  role: CollabRole;
}

const ROLE_META: Record<CollabRole, { label: string; desc: string; color: string; bg: string; icon: React.ReactNode }> = {
  readonly: {
    label: "Viewer",
    desc: "Can view schedules, history & calendar only",
    color: "text-blue-400 border-blue-500/40",
    bg: "bg-blue-500/10",
    icon: <FaEye />,
  },
  collaborator: {
    label: "Care Partner",
    desc: "Can view + mark doses done & handle missed doses",
    color: "text-emerald-400 border-emerald-500/40",
    bg: "bg-emerald-500/10",
    icon: <FaHandshake />,
  },
  admin: {
    label: "Co-Manager",
    desc: "Full access: view, interact, edit & delete medicines",
    color: "text-violet-400 border-violet-500/40",
    bg: "bg-violet-500/10",
    icon: <FaCog />,
  },
};

const STATUS_META: Record<InviteStatus, { label: string; color: string }> = {
  pending:  { label: "Pending",  color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  accepted: { label: "Accepted", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  declined: { label: "Declined", color: "text-red-400 bg-red-500/10 border-red-500/30" },
};

function RoleBadge({ role }: { role: CollabRole }) {
  const m = ROLE_META[role];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${m.color} ${m.bg}`}>
      {m.icon} {m.label}
    </span>
  );
}

export default function SharingPage() {
  const [tab, setTab] = useState<"invite" | "team" | "inbox">("invite");
  const [loading, setLoading] = useState(true);

  const [sentInvitations, setSentInvitations] = useState<SentInvitation[]>([]);
  const [myCollaborators, setMyCollaborators] = useState<Collaborator[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [myCollaborations, setMyCollaborations] = useState<MyCollaboration[]>([]);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CollabRole>("readonly");
  const [sending, setSending] = useState(false);

  // Action states
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const { data } = await axios.get("/api/sharing");
      if (data.success) {
        setSentInvitations(data.result.sentInvitations || []);
        setMyCollaborators(data.result.myCollaborators || []);
        setPendingInvitations(data.result.pendingInvitations || []);
        setMyCollaborations(data.result.myCollaborations || []);
      }
    } catch {
      toast.error("Failed to load sharing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { Promise.resolve().then(fetchData); }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSending(true);
    try {
      await axios.post("/api/invitations", { inviteeEmail: inviteEmail.trim(), role: inviteRole });
      toast.success(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail("");
      await fetchData();
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  const handleRevokeInvitation = async (id: string) => {
    setActionId(id);
    try {
      await axios.delete(`/api/invitations/${id}`);
      toast.success("Invitation revoked");
      await fetchData();
    } catch {
      toast.error("Failed to revoke");
    } finally {
      setActionId(null);
    }
  };

  const handleRespondInvitation = async (id: string, action: "accept" | "decline") => {
    setActionId(id);
    try {
      await axios.put(`/api/invitations/${id}`, { action });
      toast.success(action === "accept" ? "Invitation accepted!" : "Invitation declined");
      await fetchData();
    } catch {
      toast.error("Failed to respond");
    } finally {
      setActionId(null);
    }
  };

  const handleRemoveCollaborator = async (accessId: string, name: string) => {
    setActionId(accessId);
    try {
      await axios.delete(`/api/sharing/${accessId}`);
      toast.success(`${name}'s access removed`);
      await fetchData();
    } catch {
      toast.error("Failed to remove access");
    } finally {
      setActionId(null);
    }
  };

  const pendingCount = pendingInvitations.length;

  const tabs = [
    { id: "invite" as const, label: "Invite", icon: <FaUserPlus /> },
    { id: "team" as const, label: "My Team", icon: <FaUsers /> },
    { id: "inbox" as const, label: "Inbox", icon: <FaInbox />, badge: pendingCount },
  ];

  return (
    <div className="min-h-screen text-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-[#03e9f4]/10 border border-[#03e9f4]/30 rounded-xl">
              <FaLink className="text-[#03e9f4] text-lg" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                Sharing & Collaboration
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Invite trusted people to view or help manage your medicine schedule
              </p>
            </div>
          </div>
        </div>

        {/* My Access Banner — schedules I can view */}
        {myCollaborations.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl border border-[#03e9f4]/20 bg-[#03e9f4]/5 backdrop-blur-md">
            <p className="text-xs font-semibold text-[#03e9f4] mb-3 flex items-center gap-2">
              <FaUserShield /> Schedules You Have Access To
            </p>
            <div className="flex flex-wrap gap-2">
              {myCollaborations.map((c) => (
                <div key={c._id} className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs">
                  <span className="font-semibold text-white">{c.ownerId?.name}</span>
                  <RoleBadge role={c.role} />
                </div>
              ))}
            </div>
            <p className="flex items-center gap-1 text-[11px] text-gray-500 mt-2"><FaArrowsAltV aria-hidden="true" /> Switch between schedules using the dropdown on any page.</p>
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex gap-1 p-1 bg-black/50 border border-white/10 rounded-xl mb-6 backdrop-blur-md">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer relative
                ${tab === t.id ? "bg-[#03e9f4] text-black shadow-md" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
            >
              {t.icon}
              {t.label}
              {(t.badge ?? 0) > 0 && (
                <span className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full
                  ${tab === t.id ? "bg-black text-[#03e9f4]" : "bg-[#03e9f4] text-black"}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 gap-3">
            <FaSpinner className="animate-spin" /> Loading...
          </div>
        ) : (
          <>
            {/* ──────────────── TAB: INVITE ──────────────── */}
            {tab === "invite" && (
              <div className="space-y-6">
                {/* Invite Form */}
                <div className="p-6 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md shadow-xl">
                  <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <FaUserPlus className="text-[#03e9f4]" /> Send an Invitation
                  </h2>
                  <form onSubmit={handleSendInvite} className="space-y-4">
                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Invitee Email Address
                      </label>
                      <div className="relative">
                        <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="person@example.com"
                          required
                          className="w-full pl-9 pr-4 py-2.5 bg-black/60 border border-[#03e9f4]/40 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#03e9f4] transition-colors"
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">Must be a registered Medicare user.</p>
                    </div>

                    {/* Role selector */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-2">Access Level</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(Object.entries(ROLE_META) as [CollabRole, typeof ROLE_META[CollabRole]][]).map(([roleKey, meta]) => (
                          <button
                            key={roleKey}
                            type="button"
                            onClick={() => setInviteRole(roleKey)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer
                              ${inviteRole === roleKey
                                ? `${meta.bg} ${meta.color} border-current shadow-md`
                                : "bg-black/40 border-white/10 text-gray-400 hover:border-white/20"}`}
                          >
                            <div className="text-base mb-1">{meta.icon}</div>
                            <p className="text-xs font-bold">{meta.label}</p>
                            <p className="text-[10px] leading-tight opacity-80 mt-0.5">{meta.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-[#03e9f4] text-black font-bold rounded-xl hover:bg-[#02c4ce] transition-all active:scale-95 disabled:opacity-60 cursor-pointer shadow-lg"
                    >
                      {sending ? <FaSpinner className="animate-spin" /> : <FaUserPlus />}
                      {sending ? "Sending..." : "Send Invitation"}
                    </button>
                  </form>
                </div>

                {/* Sent Invitations */}
                {sentInvitations.length > 0 && (
                  <div className="p-5 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md">
                    <h3 className="text-sm font-bold text-gray-300 mb-3">Sent Invitations</h3>
                    <div className="space-y-2">
                      {sentInvitations.map((inv) => {
                        const statusMeta = STATUS_META[inv.status];
                        return (
                          <div key={inv._id} className="flex items-center gap-3 p-3 bg-black/30 border border-white/5 rounded-xl">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{inv.inviteeEmail}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <RoleBadge role={inv.role} />
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.color}`}>
                                  {statusMeta.label}
                                </span>
                              </div>
                            </div>
                            {inv.status === "pending" && (
                              <button
                                onClick={() => handleRevokeInvitation(inv._id)}
                                disabled={actionId === inv._id}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Revoke invitation"
                              >
                                {actionId === inv._id ? <FaSpinner className="animate-spin text-xs" /> : <FaTrash className="text-xs" />}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ──────────────── TAB: MY TEAM ──────────────── */}
            {tab === "team" && (
              <div className="space-y-4">
                {myCollaborators.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <FaUsers className="text-4xl text-gray-600 mb-3" />
                    <p className="text-gray-400 font-medium">No collaborators yet</p>
                    <p className="text-xs text-gray-600 mt-1">Send invitations to build your care team</p>
                  </div>
                ) : (
                  myCollaborators.map((c) => {
                    const user = c.collaboratorId;
                    const meta = ROLE_META[c.role];
                    return (
                      <div key={c._id} className="flex items-center gap-4 p-4 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md hover:border-white/20 transition-all">
                        {/* Avatar */}
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${meta.bg} border ${meta.color}`}>
                          {user?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{user?.name}</p>
                          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                          <div className="mt-1.5">
                            <RoleBadge role={c.role} />
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveCollaborator(c._id, user?.name || "User")}
                          disabled={actionId === c._id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all cursor-pointer"
                        >
                          {actionId === c._id ? <FaSpinner className="animate-spin text-xs" /> : <FaTimes className="text-xs" />}
                          Remove
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ──────────────── TAB: INBOX ──────────────── */}
            {tab === "inbox" && (
              <div className="space-y-4">
                {pendingInvitations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <FaInbox className="text-4xl text-gray-600 mb-3" />
                    <p className="text-gray-400 font-medium">No pending invitations</p>
                    <p className="text-xs text-gray-600 mt-1">When someone invites you, it will appear here</p>
                  </div>
                ) : (
                  pendingInvitations.map((inv) => {
                    const meta = ROLE_META[inv.role];
                    const owner = inv.ownerId;
                    return (
                      <div key={inv._id} className={`p-5 border rounded-2xl backdrop-blur-md transition-all ${meta.bg} ${meta.color} border-current/30 bg-opacity-10`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0 border ${meta.color} ${meta.bg}`}>
                              {owner?.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-bold text-white">{owner?.name}</p>
                              <p className="text-xs text-gray-400">{owner?.email}</p>
                            </div>
                          </div>
                          <RoleBadge role={inv.role} />
                        </div>

                        <div className={`mt-3 p-2.5 rounded-lg ${meta.bg} border border-current/20`}>
                          <p className="text-xs text-gray-300">
                            Invited you as a <span className={`font-bold ${meta.color}`}>{meta.label}</span> — {meta.desc}.
                          </p>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleRespondInvitation(inv._id, "accept")}
                            disabled={!!actionId}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-60 cursor-pointer text-sm"
                          >
                            {actionId === inv._id ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespondInvitation(inv._id, "decline")}
                            disabled={!!actionId}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/10 border border-white/10 text-gray-300 font-semibold rounded-xl hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-all active:scale-95 disabled:opacity-60 cursor-pointer text-sm"
                          >
                            <FaTimes />
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
