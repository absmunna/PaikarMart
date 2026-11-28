import React, { useMemo, useState } from 'react';
import { Users, UserPlus, Shield, Store, Building2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/features/auth';
import type { TeamPageRole, VendorProfile } from '@/types';

export const TeamAccessPanel: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const {
    personalUser,
    hasPaikarMartAccess,
    paikarMartDelegates,
    vendorDelegates,
    grantPaikarMartAccess,
    revokePaikarMartAccess,
    grantVendorAccess,
    revokeVendorAccess,
  } = useAuth();

  const ownedStores = useMemo<VendorProfile[]>(() => {
    const stores: VendorProfile[] = [];
    if (personalUser.vendorProfile) {
      stores.push(personalUser.vendorProfile);
    }
    if (Array.isArray(personalUser.vendorProfiles)) {
      personalUser.vendorProfiles.forEach((vp) => {
        if (vp && !stores.some((existing) => existing.id === vp.id)) {
          stores.push(vp);
        }
      });
    }
    return stores;
  }, [personalUser.vendorProfile, personalUser.vendorProfiles]);

  const currentEmail = (personalUser.email || '').trim().toLowerCase();
  const sharedVendorAccess = useMemo(
    () =>
      vendorDelegates.filter(
        (d) =>
          d.email.toLowerCase() === currentEmail &&
          d.ownerId !== personalUser.id &&
          d.status === 'active'
      ),
    [vendorDelegates, currentEmail, personalUser.id]
  );

  const [scopeTab, setScopeTab] = useState<'paikarmart' | 'vendor'>(
    hasPaikarMartAccess ? 'paikarmart' : ownedStores.length > 0 ? 'vendor' : 'paikarmart'
  );
  const [selectedVendorId, setSelectedVendorId] = useState<string>(ownedStores[0]?.id || '');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamPageRole>('editor');
  const [teamMsg, setTeamMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeVendor = useMemo(
    () => ownedStores.find((s) => s.id === selectedVendorId) || ownedStores[0] || null,
    [ownedStores, selectedVendorId]
  );

  const activeVendorDelegates = useMemo(
    () =>
      activeVendor
        ? vendorDelegates.filter(
            (d) => d.vendorId === activeVendor.id && d.ownerId === personalUser.id
          )
        : [],
    [vendorDelegates, activeVendor, personalUser.id]
  );

  const handleInvitePaikarMart = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setTeamMsg({
        type: 'error',
        text: isBn ? 'সঠিক ইমেইল ঠিকানা দিন।' : 'Please enter a valid email address.',
      });
      return;
    }
    try {
      const roleToGrant =
        inviteRole === 'admin' ? 'admin' : inviteRole === 'editor' ? 'moderator' : 'consumer';
      await grantPaikarMartAccess(cleanEmail, inviteName, roleToGrant, inviteRole);
      setTeamMsg({
        type: 'success',
        text: isBn
          ? 'সফলভাবে টিম মেম্বার যুক্ত হয়েছে।'
          : `Successfully invited ${cleanEmail} as ${inviteRole.toUpperCase()}.`,
      });
      setInviteEmail('');
      setInviteName('');
      setTimeout(() => setTeamMsg(null), 4000);
    } catch (err: any) {
      setTeamMsg({ type: 'error', text: err?.message || 'Failed to grant access.' });
    }
  };

  const handleInviteVendorMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVendor) return;
    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setTeamMsg({
        type: 'error',
        text: isBn ? 'সঠিক ইমেইল ঠিকানা দিন।' : 'Please enter a valid email address.',
      });
      return;
    }
    try {
      await grantVendorAccess({
        vendorId: activeVendor.id,
        vendorName: activeVendor.storeName,
        email: cleanEmail,
        name: inviteName,
        pageRole: inviteRole,
      });
      setTeamMsg({
        type: 'success',
        text: isBn
          ? `${activeVendor.storeName}-এ টিম মেম্বার যুক্ত হয়েছে।`
          : `Invited ${cleanEmail} to ${activeVendor.storeName} as ${inviteRole.toUpperCase()}.`,
      });
      setInviteEmail('');
      setInviteName('');
      setTimeout(() => setTeamMsg(null), 4000);
    } catch (err: any) {
      setTeamMsg({ type: 'error', text: err?.message || 'Failed to grant store access.' });
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm sm:text-base font-bold text-[var(--pm-text)]">
            {isBn ? 'টিম ও পেজ অ্যাক্সেস ম্যানেজমেন্ট' : 'Team & Page Access Management'}
          </h4>
          <p className="text-xs text-[var(--pm-muted)]">
            {isBn
              ? 'ফেসবুক পেজ ম্যানেজমেন্টের মতো আপনার প্রোফাইল ও স্টোর পরিচালনার জন্য অন্যদের অ্যাডমিন, এডিটর বা ভিউয়ার হিসেবে যুক্ত করুন।'
              : 'Assign Admin, Editor, or Viewer page roles for your PaikarMart organization or Vendor store pages.'}
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setScopeTab('paikarmart');
              setTeamMsg(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              scopeTab === 'paikarmart'
                ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] shadow-sm'
                : 'text-[var(--pm-muted)] hover:text-[var(--pm-text)]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{isBn ? 'PaikarMart প্রোফাইল' : 'PaikarMart'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setScopeTab('vendor');
              setTeamMsg(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              scopeTab === 'vendor'
                ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] shadow-sm'
                : 'text-[var(--pm-muted)] hover:text-[var(--pm-text)]'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>{isBn ? 'ভেন্ডর স্টোর পেজ' : 'Vendor Pages'}</span>
          </button>
        </div>
      </div>

      {teamMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-bold ${
            teamMsg.type === 'success'
              ? 'bg-[var(--pm-success-soft)] text-[var(--pm-success)]'
              : 'bg-[var(--pm-danger-soft)] text-[var(--pm-danger)]'
          }`}
        >
          {teamMsg.text}
        </div>
      )}

      {scopeTab === 'paikarmart' ? (
        !hasPaikarMartAccess ? (
          <div className="p-6 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] text-center space-y-2">
            <Shield className="w-8 h-8 text-amber-500 mx-auto" />
            <h5 className="text-xs font-bold text-[var(--pm-text)]">
              {isBn ? 'সুপার অ্যাডমিন অ্যাক্সেস প্রয়োজন' : 'Super Admin Access Required'}
            </h5>
            <p className="text-[11px] text-[var(--pm-muted)]">
              {isBn
                ? 'টিম মেম্বার পরিচালনা করতে আপনার অ্যাকাউন্টে পাইকারমার্ট অ্যাক্সেস থাকতে হবে।'
                : 'PaikarMart organization access is required to manage platform team roles.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <form
              onSubmit={handleInvitePaikarMart}
              className="p-4 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-3"
            >
              <h5 className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-[var(--pm-accent)]" />
                <span>
                  {isBn ? 'PaikarMart প্রোফাইলে নতুন মেম্বার যুক্ত করুন' : 'Assign PaikarMart Page Role / Invite Member'}
                </span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder={isBn ? 'সদস্যের নাম (ঐচ্ছিক)' : 'Member Name'}
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs text-[var(--pm-text)] outline-none focus:border-[var(--pm-accent)]"
                />
                <input
                  type="email"
                  required
                  placeholder="user@gmail.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs text-[var(--pm-text)] outline-none focus:border-[var(--pm-accent)]"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--pm-muted)]">
                    {isBn ? 'রোল:' : 'Role:'}
                  </span>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as TeamPageRole)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-bold text-[var(--pm-text)] outline-none focus:border-[var(--pm-accent)]"
                  >
                    <option value="admin">
                      {isBn ? 'অ্যাডমিন (Admin - Full Control)' : 'Admin (Full Control)'}
                    </option>
                    <option value="editor">
                      {isBn ? 'এডিটর (Editor - Content & Products)' : 'Editor (Content & Products)'}
                    </option>
                    <option value="viewer">
                      {isBn ? 'ভিউয়ার (Viewer - Read Only)' : 'Viewer (Read Only)'}
                    </option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isBn ? 'ইনভাইট পাঠান' : 'Grant Access'}</span>
                </button>
              </div>
            </form>

            <div className="space-y-2">
              <h5 className="text-xs font-bold text-[var(--pm-muted)] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>
                  {isBn
                    ? `অ্যাক্সেসপ্রাপ্ত টিম মেম্বার (${paikarMartDelegates.length})`
                    : `Existing Team Members (${paikarMartDelegates.length})`}
                </span>
              </h5>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {paikarMartDelegates.map((del) => (
                  <div
                    key={del.id}
                    className="p-3 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-[var(--pm-text)] truncate">{del.name}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] uppercase">
                          {del.pageRole || del.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--pm-muted)] font-mono truncate">
                        {del.email} · Added by {del.addedBy} on {del.addedAt}
                      </p>
                    </div>
                    {del.email !== 'abs.munna1@gmail.com' && (
                      <button
                        type="button"
                        onClick={() => void revokePaikarMartAccess(del.email)}
                        className="px-2.5 py-1 rounded-lg bg-[var(--pm-danger-soft)] border border-[var(--pm-danger)]/30 text-[var(--pm-danger)] text-[11px] font-bold shrink-0 hover:opacity-80 cursor-pointer"
                        title="Revoke access"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {ownedStores.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] text-center space-y-2">
              <Store className="w-8 h-8 text-[var(--pm-accent)] mx-auto" />
              <h5 className="text-xs font-bold text-[var(--pm-text)]">
                {isBn ? 'কোনো ভেন্ডর স্টোর পাওয়া যায়নি' : 'No Owned Vendor Store Yet'}
              </h5>
              <p className="text-[11px] text-[var(--pm-muted)]">
                {isBn
                  ? 'ভেন্ডর হিসেবে রেজিস্টার করলে আপনার স্টোর পরিচালনার জন্য এখানে টিম মেম্বার যুক্ত করতে পারবেন।'
                  : 'Once you create a vendor store, you can invite admins, editors, and viewers to manage it here.'}
              </p>
            </div>
          ) : (
            <>
              {ownedStores.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--pm-muted)]">
                    {isBn ? 'স্টোর নির্বাচন করুন:' : 'Select Store:'}
                  </span>
                  <select
                    value={activeVendor?.id || ''}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-bold text-[var(--pm-text)] outline-none focus:border-[var(--pm-accent)]"
                  >
                    {ownedStores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.storeName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <form
                onSubmit={handleInviteVendorMember}
                className="p-4 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-3"
              >
                <h5 className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[var(--pm-accent)]" />
                  <span>
                    {isBn
                      ? `${activeVendor?.storeName || 'স্টোর'}-এ টিম মেম্বার যুক্ত করুন`
                      : `Add Team Member to ${activeVendor?.storeName || 'Store'}`}
                  </span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder={isBn ? 'সদস্যের নাম (ঐচ্ছিক)' : 'Member Name'}
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs text-[var(--pm-text)] outline-none focus:border-[var(--pm-accent)]"
                  />
                  <input
                    type="email"
                    required
                    placeholder="manager@gmail.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs text-[var(--pm-text)] outline-none focus:border-[var(--pm-accent)]"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--pm-muted)]">
                      {isBn ? 'পেজ রোল:' : 'Page Role:'}
                    </span>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as TeamPageRole)}
                      className="px-3 py-1.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-bold text-[var(--pm-text)] outline-none focus:border-[var(--pm-accent)]"
                    >
                      <option value="admin">
                        {isBn ? 'অ্যাডমিন (Admin - Full Store Control)' : 'Admin (Full Store Control)'}
                      </option>
                      <option value="editor">
                        {isBn ? 'এডিটর (Editor - Inventory & Orders)' : 'Editor (Inventory & Orders)'}
                      </option>
                      <option value="viewer">
                        {isBn ? 'ভিউয়ার (Viewer - Read Only)' : 'Viewer (Read Only)'}
                      </option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isBn ? 'অ্যাক্সেস দিন' : 'Grant Access'}</span>
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                <h5 className="text-xs font-bold text-[var(--pm-muted)] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {isBn
                      ? `স্টোর টিম মেম্বার (${activeVendorDelegates.length})`
                      : `Store Team Members (${activeVendorDelegates.length})`}
                  </span>
                </h5>
                {activeVendorDelegates.length === 0 ? (
                  <p className="text-xs text-[var(--pm-muted)] p-3 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)]">
                    {isBn
                      ? 'এখনো কোনো টিম মেম্বার যুক্ত করা হয়নি।'
                      : 'No team members added to this store yet.'}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {activeVendorDelegates.map((del) => (
                      <div
                        key={del.id}
                        className="p-3 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-[var(--pm-text)] truncate">{del.name}</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] uppercase">
                              {del.pageRole}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--pm-muted)] font-mono truncate">
                            {del.email} · Added {del.addedAt}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void revokeVendorAccess(del.vendorId, del.email)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--pm-danger-soft)] border border-[var(--pm-danger)]/30 text-[var(--pm-danger)] text-[11px] font-bold shrink-0 hover:opacity-80 cursor-pointer"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {sharedVendorAccess.length > 0 && (
            <div className="space-y-2 pt-2">
              <h5 className="text-xs font-bold text-[var(--pm-muted)] flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" />
                <span>
                  {isBn
                    ? `অন্য স্টোরের পেজ অ্যাক্সেস (${sharedVendorAccess.length})`
                    : `Shared Vendor Pages You Can Manage (${sharedVendorAccess.length})`}
                </span>
              </h5>
              <div className="space-y-2">
                {sharedVendorAccess.map((del) => (
                  <div
                    key={del.id}
                    className="p-3 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--pm-text)] truncate">{del.vendorName}</p>
                      <p className="text-[11px] text-[var(--pm-muted)] font-mono truncate">
                        Granted by {del.addedBy}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] uppercase shrink-0">
                      {del.pageRole}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
