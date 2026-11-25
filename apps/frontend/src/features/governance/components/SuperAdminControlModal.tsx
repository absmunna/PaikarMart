import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
  Check,
  AlertTriangle,
  UserCheck,
  Clock,
  Lock
} from 'lucide-react';
import { UserRole } from '@/types';
import { isGovernanceRole } from '@paikarmart/shared';
import { useAuth } from '@/features/auth';
import { vendorApiClient, KycApplicationItem } from '@/features/vendors';
import {
  fetchFlaggedPostsForModeration,
  fetchPendingCitizenVerifications,
  reviewCitizenVerification,
  reviewFlaggedPost,
  type FlaggedPostModerationItem,
  type PendingCitizenVerificationItem,
} from '@/features/identity/services/identityApiClient';
import { useLanguage } from '@/contexts/LanguageContext';

interface SuperAdminControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
}

const INITIAL_MANAGED_ADMINS = [
  {
    id: 'user_dev_1',
    name: 'Governance Root Lead',
    email: 'root.admin@paikarmart.com',
    handle: '@root_admin',
    role: 'super_admin' as UserRole,
    grantedAt: 'Project Initialization',
    grantedBy: 'System Governance'
  },
  {
    id: 'user_admin_2',
    name: 'PaikarMart Ops Head',
    email: 'admin.ops@paikarmart.com',
    handle: '@paikar_ops',
    role: 'admin' as UserRole,
    grantedAt: '2026-02-01',
    grantedBy: 'root.admin@paikarmart.com'
  },
  {
    id: 'user_admin_3',
    name: 'Catalog Quality Auditor',
    email: 'qa.catalog@paikarmart.com',
    handle: '@catalog_qa',
    role: 'moderator' as UserRole,
    grantedAt: '2026-02-10',
    grantedBy: 'root.admin@paikarmart.com'
  }
];

export const SuperAdminControlModal: React.FC<SuperAdminControlModalProps> = ({
  isOpen,
  onClose,
  onUpdateUserRole
}) => {
  const { firebaseUser, currentUser, refetchProfile } = useAuth();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [adminsList, setAdminsList] = useState(INITIAL_MANAGED_ADMINS);
  const [kycQueue, setKycQueue] = useState<KycApplicationItem[]>([]);
  const [citizenKycQueue, setCitizenKycQueue] = useState<PendingCitizenVerificationItem[]>([]);
  const [flaggedPosts, setFlaggedPosts] = useState<FlaggedPostModerationItem[]>([]);
  const [queueTab, setQueueTab] = useState<'merchant' | 'citizen' | 'posts'>('merchant');
  const [loadingKyc, setLoadingKyc] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [selectedRoleToGrant, setSelectedRoleToGrant] = useState<'moderator' | 'admin' | 'super_admin'>('admin');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAuthorizedGovernance = isGovernanceRole(currentUser.role);

  useEffect(() => {
    if (!isOpen || !isAuthorizedGovernance) return;
    let active = true;
    setLoadingKyc(true);
    const effectiveRole: UserRole = isGovernanceRole(currentUser.role) ? currentUser.role : 'super_admin';
    void Promise.allSettled([
      vendorApiClient.fetchKycQueue(effectiveRole),
      fetchPendingCitizenVerifications(),
      fetchFlaggedPostsForModeration(),
    ])
      .then(([merchantRes, citizenRes, postsRes]) => {
        if (!active) return;
        setKycQueue(merchantRes.status === 'fulfilled' ? merchantRes.value : []);
        setCitizenKycQueue(citizenRes.status === 'fulfilled' ? citizenRes.value : []);
        setFlaggedPosts(postsRes.status === 'fulfilled' ? postsRes.value : []);
      })
      .finally(() => {
        if (active) setLoadingKyc(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, isAuthorizedGovernance, currentUser.role]);

  if (!isOpen) return null;

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleGrantRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) {
      showToast('error', isBn ? 'সঠিক ইমেইল এড্রেস লিখুন।' : 'Please enter a valid email address.');
      return;
    }

    const email = newAdminEmail.trim();
    const newEntry = {
      id: `usr_${Date.now()}`,
      name: newAdminName.trim() || email.split('@')[0],
      email,
      handle: `@${email.split('@')[0]}`,
      role: selectedRoleToGrant,
      grantedAt: new Date().toISOString().split('T')[0],
      grantedBy: firebaseUser?.email || currentUser.email || 'super_admin'
    };

    try {
      await vendorApiClient.updateGovernanceRole({ email, role: selectedRoleToGrant });
      await refetchProfile().catch(() => null);
      setAdminsList((prev) => [newEntry, ...prev]);
      onUpdateUserRole(newEntry.id, selectedRoleToGrant);
      showToast('success', `Assigned ${selectedRoleToGrant.replace('_', ' ')} to ${newEntry.name} (synced to database).`);
      setNewAdminEmail('');
      setNewAdminName('');
    } catch (err: any) {
      showToast('error', err?.message || 'Unable to assign governance role.');
    }
  };

  const handleRevokeRole = async (id: string, name: string, email?: string) => {
    if (id === 'user_dev_1') {
      showToast('error', 'Cannot revoke Lead Developer Super Admin root access.');
      return;
    }
    try {
      if (email) {
        await vendorApiClient.updateGovernanceRole({ email, role: 'consumer' }).catch(() => null);
      }
      setAdminsList((prev) => prev.filter((a) => a.id !== id));
      onUpdateUserRole(id, 'consumer');
      showToast('success', `Revoked governance access from ${name}.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Unable to revoke governance role.');
    }
  };

  const handleKycDecision = async (applicationId: string, decision: 'approved' | 'rejected' | 'suspended') => {
    const effectiveRole: UserRole = isGovernanceRole(currentUser.role) ? currentUser.role : 'super_admin';
    try {
      const updated = await vendorApiClient.decideKycApplication({
        applicationId,
        decision,
        requesterRole: effectiveRole,
        reviewerEmail: firebaseUser?.email || currentUser.email || 'admin@paikarmart.com'
      });
      setKycQueue((prev) => prev.map((a) => (a.id === applicationId ? updated : a)));
      await refetchProfile().catch(() => null);
      showToast('success', `KYC ${applicationId} marked ${decision.toUpperCase()}.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Unable to process KYC decision.');
    }
  };

  const handleCitizenKycDecision = async (verificationId: string, decision: 'verified' | 'rejected') => {
    try {
      const updated = await reviewCitizenVerification(verificationId, decision);
      setCitizenKycQueue((prev) =>
        prev.map((item) => (item.id === verificationId ? { ...item, status: updated.status } : item))
      );
      showToast('success', `Citizen KYC ${verificationId} marked ${decision.toUpperCase()}.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Unable to update citizen KYC.');
    }
  };

  const handleFlaggedPostDecision = async (postId: string, decision: 'approved' | 'rejected') => {
    try {
      const updated = await reviewFlaggedPost(postId, decision);
      setFlaggedPosts((prev) =>
        prev.map((post) => (post.id === postId ? updated : post))
      );
      showToast('success', `Flagged post marked ${decision.toUpperCase()}.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Unable to review flagged post.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[var(--pm-card)] text-[var(--pm-text)] border border-[var(--pm-border)] rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[var(--pm-border)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-[var(--pm-text)] truncate">
                {isBn ? 'গভর্ন্যান্স ও কেওয়াইসি (KYC) কন্ট্রোল' : 'Governance & Merchant KYC Control Center'}
              </h2>
              <p className="text-xs text-[var(--pm-muted)] mt-0.5 truncate">
                Role-verified administration · Merchant KYC verification · Admin & Moderator access control
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[var(--pm-muted)] hover:text-[var(--pm-text)] hover:bg-[var(--pm-surface)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAuthorizedGovernance ? (
          <div className="p-8 text-center space-y-3">
            <Lock className="w-8 h-8 text-[var(--pm-danger)] mx-auto" />
            <h3 className="text-base font-bold text-[var(--pm-text)]">
              Governance Authorization Required
            </h3>
            <p className="text-xs text-[var(--pm-muted)] max-w-md mx-auto">
              Only verified Moderator, Admin, or Super Admin accounts can view KYC queues or modify admin privileges. Client-side role switching is disabled.
            </p>
          </div>
        ) : (
          <>
            {feedbackMsg && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  feedbackMsg.type === 'success'
                    ? 'bg-[var(--pm-success-soft)] border border-[var(--pm-success)]/30 text-[var(--pm-success)]'
                    : 'bg-[var(--pm-danger-soft)] border border-[var(--pm-danger)]/30 text-[var(--pm-danger)]'
                }`}
              >
                {feedbackMsg.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 cols: Live Backend KYC & Moderation Queues */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex rounded-xl border border-[var(--pm-border)] bg-[var(--pm-surface)] p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setQueueTab('merchant')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        queueTab === 'merchant'
                          ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)]'
                          : 'text-[var(--pm-muted)] hover:text-[var(--pm-text)]'
                      }`}
                    >
                      Merchant KYC ({kycQueue.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setQueueTab('citizen')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        queueTab === 'citizen'
                          ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)]'
                          : 'text-[var(--pm-muted)] hover:text-[var(--pm-text)]'
                      }`}
                    >
                      Citizen KYC ({citizenKycQueue.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setQueueTab('posts')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        queueTab === 'posts'
                          ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)]'
                          : 'text-[var(--pm-muted)] hover:text-[var(--pm-text)]'
                      }`}
                    >
                      Flagged Posts ({flaggedPosts.length})
                    </button>
                  </div>
                </div>

                {loadingKyc ? (
                  <div className="p-6 rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-surface)] text-xs text-[var(--pm-muted)] text-center">
                    Loading governance queues...
                  </div>
                ) : queueTab === 'merchant' ? (
                  kycQueue.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-surface)] text-xs text-[var(--pm-muted)] text-center">
                      No merchant KYC applications pending review right now.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {kycQueue.map((app) => (
                        <div
                          key={app.id}
                          className="p-4 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-mono text-[var(--pm-muted)]">
                                {app.id} · {app.sellerTier.replace(/_/g, ' ')} · {app.status.toUpperCase()}
                              </p>
                              <h4 className="text-sm font-bold text-[var(--pm-text)] truncate">
                                {app.storeName}
                              </h4>
                              <p className="text-xs text-[var(--pm-muted)] truncate">
                                {app.legalEntityName} · NID {app.nidNumber} · License {app.businessRegNumber}
                              </p>
                            </div>

                            <span
                              className={`text-xs font-bold shrink-0 flex items-center gap-1 ${
                                app.status === 'approved'
                                  ? 'text-[var(--pm-success)]'
                                  : app.status === 'rejected' || app.status === 'suspended'
                                  ? 'text-[var(--pm-danger)]'
                                  : 'text-[var(--pm-warning)]'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>{app.status.replace(/_/g, ' ')}</span>
                            </span>
                          </div>

                          {Array.isArray(app.documents) && app.documents.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {app.documents.map((doc) =>
                                doc.fileUrl && doc.fileUrl.startsWith('https://') ? (
                                  <a
                                    key={doc.id}
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-0.5 rounded-md bg-[var(--pm-card)] border border-[var(--pm-accent-border)] text-[10px] font-bold text-[var(--pm-accent)] hover:underline"
                                  >
                                    {doc.type}: {doc.fileName}
                                  </a>
                                ) : (
                                  <span
                                    key={doc.id}
                                    className="px-2 py-0.5 rounded-md bg-[var(--pm-card)] border border-[var(--pm-border)] text-[10px] font-mono text-[var(--pm-muted)]"
                                  >
                                    {doc.type}: {doc.fileName}
                                  </span>
                                )
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--pm-border)] text-xs">
                            <span className="text-[var(--pm-muted)] font-mono truncate">
                              {app.payoutProvider} · {app.payoutNumber}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => void handleKycDecision(app.id, 'approved')}
                                className="px-3 py-1.5 rounded-lg bg-[var(--pm-success)] hover:opacity-90 text-white font-bold text-xs cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleKycDecision(app.id, 'rejected')}
                                className="px-3 py-1.5 rounded-lg bg-[var(--pm-danger-soft)] hover:opacity-90 border border-[var(--pm-danger)]/30 text-[var(--pm-danger)] font-bold text-xs cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : queueTab === 'citizen' ? (
                  citizenKycQueue.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-surface)] text-xs text-[var(--pm-muted)] text-center">
                      No citizen NID/Passport verifications pending review.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {citizenKycQueue.map((ver) => (
                        <div
                          key={ver.id}
                          className="p-4 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-mono text-[var(--pm-muted)]">
                                {ver.documentType} · {ver.documentNumber}
                              </p>
                              <h4 className="text-sm font-bold text-[var(--pm-text)] truncate">
                                {ver.userName} {ver.userHandle ? `(${ver.userHandle})` : ''}
                              </h4>
                              {ver.userEmail && (
                                <p className="text-xs text-[var(--pm-muted)] truncate">{ver.userEmail}</p>
                              )}
                            </div>
                            <span
                              className={`text-xs font-bold shrink-0 flex items-center gap-1 ${
                                ver.status === 'verified'
                                  ? 'text-[var(--pm-success)]'
                                  : ver.status === 'rejected'
                                  ? 'text-[var(--pm-danger)]'
                                  : 'text-[var(--pm-warning)]'
                              }`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{ver.status}</span>
                            </span>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[var(--pm-border)] text-xs">
                            <button
                              type="button"
                              onClick={() => void handleCitizenKycDecision(ver.id, 'verified')}
                              className="px-3 py-1.5 rounded-lg bg-[var(--pm-success)] hover:opacity-90 text-white font-bold text-xs cursor-pointer"
                            >
                              Verify Citizen
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCitizenKycDecision(ver.id, 'rejected')}
                              className="px-3 py-1.5 rounded-lg bg-[var(--pm-danger-soft)] hover:opacity-90 border border-[var(--pm-danger)]/30 text-[var(--pm-danger)] font-bold text-xs cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : flaggedPosts.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-surface)] text-xs text-[var(--pm-muted)] text-center">
                    No flagged community posts queued for human review.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {flaggedPosts.map((post) => (
                      <div
                        key={post.id}
                        className="p-4 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-mono text-[var(--pm-muted)]">{post.id}</span>
                          <span className="font-bold text-[var(--pm-warning)]">{post.status}</span>
                        </div>
                        <p className="text-xs text-[var(--pm-text)]">{post.contentExcerpt}</p>
                        <p className="text-[11px] font-mono text-[var(--pm-danger)]">
                          Flags: {post.flaggedKeywords.join(', ')}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[var(--pm-border)] text-xs">
                          <button
                            type="button"
                            onClick={() => void handleFlaggedPostDecision(post.id, 'approved')}
                            className="px-3 py-1.5 rounded-lg bg-[var(--pm-success)] text-white font-bold text-xs cursor-pointer"
                          >
                            Approve Post
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleFlaggedPostDecision(post.id, 'rejected')}
                            className="px-3 py-1.5 rounded-lg bg-[var(--pm-danger-soft)] border border-[var(--pm-danger)]/30 text-[var(--pm-danger)] font-bold text-xs cursor-pointer"
                          >
                            Remove Post
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right 5 cols: Authorized Admin Roster & Role Assignment */}
              <div className="lg:col-span-5 space-y-4">
                <form
                  onSubmit={handleGrantRole}
                  className="p-4 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-3"
                >
                  <h3 className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-[var(--pm-accent)]" />
                    <span>Assign Governance Role</span>
                  </h3>
                  <input
                    type="text"
                    placeholder="Staff Name"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] text-xs outline-none focus:border-[var(--pm-accent)]"
                  />
                  <input
                    type="email"
                    required
                    placeholder="admin@paikarmart.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] text-xs outline-none focus:border-[var(--pm-accent)]"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={selectedRoleToGrant}
                      onChange={(e) => setSelectedRoleToGrant(e.target.value as any)}
                      className="px-3 py-2 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-[var(--pm-text)] text-xs font-bold focus:border-[var(--pm-accent)] outline-none"
                    >
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Grant Role</span>
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[var(--pm-muted)] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Governance Roster ({adminsList.length})</span>
                  </h4>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {adminsList.map((admin) => (
                      <div
                        key={admin.id}
                        className="p-3 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--pm-text)] truncate">{admin.name}</p>
                          <p className="text-[11px] text-[var(--pm-muted)] font-mono truncate">
                            {admin.email} · {admin.role.replace('_', ' ')}
                          </p>
                        </div>
                        {admin.id !== 'user_dev_1' && (
                          <button
                            type="button"
                            onClick={() => void handleRevokeRole(admin.id, admin.name, admin.email)}
                            className="px-2.5 py-1 rounded-lg bg-[var(--pm-danger-soft)] border border-[var(--pm-danger)]/30 text-[var(--pm-danger)] text-[11px] font-bold shrink-0 cursor-pointer"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
