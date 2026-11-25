import React, { ReactNode } from 'react';
import { MapPin, ShieldCheck } from 'lucide-react';
import { DEFAULT_AVATAR_URL, safeMediaSrc } from '@/shared/utils';

interface ProfileHeaderProps {
  displayName: string;
  avatar?: string | null;
  coverImage?: string | null;
  handle?: string;
  location?: string;
  bio?: string;
  verifiedLabel?: string;
  badge?: ReactNode;
  secondaryMeta?: ReactNode;
  actions: ReactNode;
  stats: ReactNode;
  tabs: ReactNode;
  belowTabs?: ReactNode;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  displayName,
  avatar,
  coverImage,
  handle,
  location,
  bio,
  verifiedLabel,
  badge,
  secondaryMeta,
  actions,
  stats,
  tabs,
  belowTabs,
}) => (
  <>
    <section className="rounded-t-2xl border border-b-0 border-[var(--pm-border)] bg-[var(--pm-card)]">
      <div className="relative h-32 overflow-hidden rounded-t-2xl bg-[var(--pm-accent)] sm:h-52">
        {coverImage?.trim() ? (
          <img
            src={safeMediaSrc(coverImage, DEFAULT_AVATAR_URL)}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
          />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[var(--pm-accent)]">
            <div className="absolute inset-x-0 bottom-0 h-8 bg-black/10" />
            <div className="absolute -right-10 -top-20 h-52 w-52 rounded-full border-[28px] border-white/10" />
            <div className="absolute bottom-7 right-24 h-16 w-16 rounded-full border border-white/20" />
            <span className="absolute right-5 top-4 text-sm font-bold text-white/80">PaikarMart</span>
          </div>
        )}
      </div>

      <div className="relative px-4 sm:px-7">
        <img
          src={safeMediaSrc(avatar, DEFAULT_AVATAR_URL)}
          alt={displayName}
          referrerPolicy="no-referrer"
          className="absolute -top-10 left-4 z-10 h-24 w-24 rounded-full border-4 border-[var(--pm-card)] bg-[var(--pm-card)] object-cover shadow-sm sm:-top-14 sm:left-7 sm:h-32 sm:w-32"
        />

        <div className="border-b border-[var(--pm-border)] pb-4 pt-14 sm:min-h-[5.5rem] sm:pl-36 sm:pt-3">
          <div className="min-w-0 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="break-words text-2xl font-bold text-[var(--pm-text)] sm:text-3xl">{displayName}</h1>
              {verifiedLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pm-success-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--pm-success)]">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{verifiedLabel}</span>
                </span>
              )}
              {badge}
            </div>
            {(handle || location) && (
              <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-[var(--pm-muted)] sm:justify-start">
                {handle && <span className="font-semibold text-[var(--pm-accent)]">{handle}</span>}
                {handle && location && <span aria-hidden="true">·</span>}
                {location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {location}
                  </span>
                )}
              </div>
            )}
            {secondaryMeta && (
              <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-[var(--pm-muted)] sm:justify-start">
                {secondaryMeta}
              </div>
            )}
            {bio && <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--pm-muted)] sm:mx-0">{bio}</p>}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">{actions}</div>
        </div>
        <div className="min-h-12">{stats}</div>
      </div>
    </section>

    <div className="sticky top-14 z-40 -mt-4 rounded-b-2xl border-x border-b border-t border-[var(--pm-border)] bg-[var(--pm-card)] shadow-sm md:top-16">
      {tabs}
    </div>
    {belowTabs}
  </>
);
