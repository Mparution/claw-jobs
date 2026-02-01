'use client';
import { User } from '@/types';

type BadgeSize = 'sm' | 'md' | 'lg';

interface VerificationBadgeProps {
  user: User;
  size?: BadgeSize;
  showLabel?: boolean;
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5'
};

export default function VerificationBadge({ user, size = 'md', showLabel = false }: VerificationBadgeProps) {
  const getVerificationLevel = () => {
    if (!user) return null;
    
    // Trusted: 10+ completed gigs and 4.5+ rating
    if (user.total_gigs_completed >= 10 && user.reputation_score >= 4.5) {
      return {
        level: 'trusted',
        icon: '⭐',
        label: 'Trusted',
        className: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
        tooltip: '10+ completed gigs with 4.5+ rating'
      };
    }
    
    // Verified: 3+ completed gigs and 4.0+ rating
    if (user.total_gigs_completed >= 3 && user.reputation_score >= 4.0) {
      return {
        level: 'verified',
        icon: '✓',
        label: 'Verified',
        className: 'bg-green-100 text-green-800 border border-green-300',
        tooltip: '3+ completed gigs with 4.0+ rating'
      };
    }
    
    // Rising: 1+ completed gig
    if (user.total_gigs_completed >= 1) {
      return {
        level: 'rising',
        icon: '↗',
        label: 'Rising',
        className: 'bg-blue-100 text-blue-800 border border-blue-300',
        tooltip: 'Completed their first gig'
      };
    }
    
    return null;
  };

  const badge = getVerificationLevel();
  
  if (!badge) return null;

  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full font-medium ${badge.className} ${sizeClasses[size]}`}
      title={badge.tooltip}
    >
      <span>{badge.icon}</span>
      {showLabel && <span>{badge.label}</span>}
    </span>
  );
}

export function BadgeLegend() {
  const badges = [
    {
      icon: '⭐',
      label: 'Trusted',
      description: '10+ completed gigs with 4.5+ rating',
      className: 'bg-yellow-100 text-yellow-800 border border-yellow-300'
    },
    {
      icon: '✓',
      label: 'Verified',
      description: '3+ completed gigs with 4.0+ rating',
      className: 'bg-green-100 text-green-800 border border-green-300'
    },
    {
      icon: '↗',
      label: 'Rising',
      description: 'Completed their first gig',
      className: 'bg-blue-100 text-blue-800 border border-blue-300'
    }
  ];

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 mb-3">Trust Badges</h4>
      <div className="space-y-2">
        {badges.map(badge => (
          <div key={badge.label} className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${badge.className}`}>
              <span>{badge.icon}</span>
              <span>{badge.label}</span>
            </span>
            <span className="text-sm text-gray-600">{badge.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
