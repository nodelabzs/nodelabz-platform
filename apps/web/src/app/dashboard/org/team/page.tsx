"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

const ROLE_OPTIONS = ["Admin", "Manager", "Editor", "Viewer"] as const;

export default function TeamPage() {
  const { data: members, isLoading } = trpc.team.listMembers.useQuery();
  const utils = trpc.useUtils();

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<(typeof ROLE_OPTIONS)[number]>("Viewer");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const createInvite = trpc.team.createInvite.useMutation({
    onSuccess: (data) => {
      setInviteUrl(data.inviteUrl);
      setFeedback({ type: "success", message: `Invite sent to ${data.email}` });
    },
    onError: (err) => {
      setFeedback({ type: "error", message: err.message });
      setTimeout(() => setFeedback(null), 5000);
    },
  });

  const removeMember = trpc.team.removeMember.useMutation({
    onSuccess: () => {
      setFeedback({ type: "success", message: "Member removed" });
      setConfirmRemove(null);
      utils.team.listMembers.invalidate();
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err) => {
      setFeedback({ type: "error", message: err.message });
      setConfirmRemove(null);
      setTimeout(() => setFeedback(null), 5000);
    },
  });

  const handleInvite = () => {
    if (!inviteEmail) return;
    createInvite.mutate({ email: inviteEmail, roleName: inviteRole });
  };

  const handleCloseInvite = () => {
    setShowInvite(false);
    setInviteEmail("");
    setInviteRole("Viewer");
    setInviteUrl(null);
    setFeedback(null);
  };

  const handleCopyLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setFeedback({ type: "success", message: "Invite link copied to clipboard" });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.charAt(0).toUpperCase();
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="max-w-5xl">
      <h1 className="text-[22px] font-semibold text-[#ededed] mb-2">Team</h1>
      <p className="text-[14px] text-[#666] mb-8">Manage your team members and their permissions</p>

      {feedback && !showInvite && (
        <div
          className={`mb-4 px-4 py-3 rounded-md text-[13px] ${
            feedback.type === "success"
              ? "bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30"
              : "bg-red-500/10 text-red-400 border border-red-500/30"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="rounded-lg border border-[#2e2e2e] overflow-hidden" style={{ backgroundColor: "#1c1c1c" }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2e2e2e]">
          <span className="text-[13px] text-[#999]">
            {members ? `${members.length} member${members.length !== 1 ? "s" : ""}` : "Members"}
          </span>
          <button
            onClick={() => setShowInvite(true)}
            className="h-8 px-3 rounded-md text-[13px] font-medium text-white"
            style={{ backgroundColor: "#3ecf8e" }}
          >
            Invite member
          </button>
        </div>

        {isLoading ? (
          <div className="px-5 py-8 text-center text-[13px] text-[#666]">Loading team...</div>
        ) : (
          <div className="divide-y divide-[#2e2e2e]">
            {members?.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#333" }}
                  >
                    <span className="text-[11px] font-semibold text-[#ccc]">
                      {getInitials(member.name, member.email)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] text-[#ededed]">
                      {member.name || member.email}
                    </p>
                    {member.name && (
                      <p className="text-[11px] text-[#666]">{member.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] px-2 py-[2px] rounded border border-[#444] text-[#888] uppercase tracking-wider">
                    {member.role}
                  </span>
                  {!member.isSuperAdmin && (
                    <>
                      {confirmRemove === member.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-red-400">Confirm?</span>
                          <button
                            onClick={() => removeMember.mutate({ userId: member.id })}
                            disabled={removeMember.isPending}
                            className="text-[11px] text-red-400 hover:text-red-300 underline"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmRemove(null)}
                            className="text-[11px] text-[#666] hover:text-[#999] underline"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRemove(member.id)}
                          className="text-[11px] text-[#666] hover:text-red-400 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="w-full max-w-md rounded-lg border border-[#2e2e2e] p-6 shadow-xl"
            style={{ backgroundColor: "#1c1c1c" }}
          >
            <h3 className="text-[16px] font-medium text-[#ededed] mb-4">Invite a team member</h3>

            {feedback && (
              <div
                className={`mb-4 px-4 py-3 rounded-md text-[13px] ${
                  feedback.type === "success"
                    ? "bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30"
                    : "bg-red-500/10 text-red-400 border border-red-500/30"
                }`}
              >
                {feedback.message}
              </div>
            )}

            {inviteUrl ? (
              <div className="space-y-4">
                <p className="text-[13px] text-[#999]">Share this invite link:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inviteUrl}
                    readOnly
                    className="flex-1 h-9 px-3 rounded-md border border-[#333] text-[12px] text-[#ededed] focus:outline-none"
                    style={{ backgroundColor: "#222" }}
                  />
                  <button
                    onClick={handleCopyLink}
                    className="h-9 px-3 rounded-md text-[13px] font-medium text-white shrink-0"
                    style={{ backgroundColor: "#3ecf8e" }}
                  >
                    Copy
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleCloseInvite}
                    className="h-9 px-4 rounded-md border border-[#333] text-[13px] text-[#999] hover:text-[#ededed] hover:border-[#555] transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] text-[#999] block mb-1">Email address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full h-9 px-3 rounded-md border border-[#333] text-[13px] text-[#ededed] focus:outline-none focus:border-[#555] placeholder:text-[#555]"
                    style={{ backgroundColor: "#222" }}
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[#999] block mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as (typeof ROLE_OPTIONS)[number])}
                    className="w-full h-9 px-3 rounded-md border border-[#333] text-[13px] text-[#ededed] focus:outline-none focus:border-[#555] appearance-none cursor-pointer"
                    style={{ backgroundColor: "#222" }}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={handleCloseInvite}
                    className="h-9 px-4 rounded-md border border-[#333] text-[13px] text-[#999] hover:text-[#ededed] hover:border-[#555] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={!inviteEmail || createInvite.isPending}
                    className="h-9 px-4 rounded-md text-[13px] font-medium text-white transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: "#3ecf8e" }}
                  >
                    {createInvite.isPending ? "Sending..." : "Send invite"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
