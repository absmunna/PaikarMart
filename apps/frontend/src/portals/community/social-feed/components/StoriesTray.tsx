import React from 'react';
import { Plus } from 'lucide-react';
import { Story, User } from '@/types';
import { DEFAULT_AVATAR_URL, safeMediaSrc } from '@/shared/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const STORY_BACKDROPS = [
  'linear-gradient(145deg, var(--pm-accent), var(--pm-card))',
  'linear-gradient(145deg, var(--pm-success), var(--pm-card))',
  'linear-gradient(145deg, var(--pm-warning), var(--pm-card))',
  'linear-gradient(145deg, var(--pm-danger), var(--pm-card))',
] as const;

interface StoriesTrayProps {
  stories: Story[];
  currentUser: User;
  onSelectStory?: (story: Story) => void;
}

export const StoriesTray: React.FC<StoriesTrayProps> = ({
  stories,
  currentUser,
  onSelectStory,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-1" aria-label={isBn ? 'সাম্প্রতিক স্টোরি' : 'Recent stories'}>
      <div className="flex min-w-max items-center gap-2 px-0.5">
        
        {/* Create Story Card */}
        <div className="relative flex h-36 w-24 shrink-0 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] shadow-xs group sm:h-48 sm:w-32">
          <div className="h-24 sm:h-32 w-full overflow-hidden">
            <img
              src={safeMediaSrc(currentUser.avatar, DEFAULT_AVATAR_URL)}
              alt=""
              referrerPolicy="no-referrer"
              onError={(event) => {
                event.currentTarget.style.visibility = 'hidden';
              }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="relative h-12 bg-[var(--pm-card)] flex flex-col items-center justify-end pb-1.5 px-1">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] flex items-center justify-center ring-4 ring-[var(--pm-card)] shadow-xs group-hover:bg-[var(--pm-accent-hover)] transition-colors">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-[var(--pm-text)] truncate w-full text-center">
              {isBn ? 'স্টোরি তৈরি' : 'Create story'}
            </span>
          </div>
        </div>

        {/* Friend / Brand Stories */}
        {stories.filter(s => s.id !== 'story_user').map((story, index) => (
          <div
            key={story.id}
            onClick={() => onSelectStory && onSelectStory(story)}
            className="relative w-24 sm:w-32 h-36 sm:h-48 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs shrink-0 group cursor-pointer border border-[var(--pm-border)] transition-all active:scale-[0.98]"
          >
            {/* Story Backdrop Image */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: STORY_BACKDROPS[index % STORY_BACKDROPS.length] }}
            />
            {story.mediaUrl?.trim() && (
              <img
                src={story.mediaUrl.trim()}
                alt=""
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            )}

            {/* Gradient Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

            {/* Author Avatar */}
            <div className="absolute top-2.5 left-2.5">
              <img
                src={safeMediaSrc(story.authorAvatar, DEFAULT_AVATAR_URL)}
                alt={story.authorName}
                referrerPolicy="no-referrer"
                className={`w-9 h-9 rounded-full object-cover ring-2 ${
                  story.isLive ? 'ring-red-500' : 'ring-[var(--pm-accent)]'
                }`}
              />
              {story.isLive && (
                <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-red-600 text-white text-[8px] font-bold uppercase">
                  {isBn ? 'লাইভ' : 'Live'}
                </span>
              )}
            </div>

            {/* Author Name */}
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-[11px] font-bold text-white drop-shadow-xs truncate">
                {story.authorName}
              </p>
            </div>
          </div>
        ))}

      </div>
    </div>
  );
};
