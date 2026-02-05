import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Joyride, { ACTIONS, CallBackProps, EVENTS, STATUS, Step } from 'react-joyride';

import { TourTooltip } from '@/components/TourTooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface TourContextType {
  startTour: () => void;
  hasSeenTour: boolean;
  markTourAsSeen: () => Promise<void>;
  isProfileLoading: boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const { user, userProfile, refreshProfile, isLoading } = useAuth();
  const [run, setRun] = useState(false);
  const isMobile = useIsMobile();

  // Add isLoading to value
  const hasSeen = (userProfile?.has_seen_tour === true || userProfile?.has_seen_tour === 'true');

  if (user) {
    console.log('[TourDebug] Context Render:', {
      userId: user.id,
      hasSeenTourDB: userProfile?.has_seen_tour,
      hasSeenTourDBType: typeof userProfile?.has_seen_tour,
      finalHasSeen: hasSeen,
      userProfileKeys: userProfile ? Object.keys(userProfile) : 'null'
    });
  }

  const markTourAsSeen = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ has_seen_tour: true })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating tour status:', error);
      } else {
        refreshProfile();
      }
    } catch (err) {
      console.error('Error in markTourAsSeen:', err);
    }
  };

  // Reactive check: Stop tour if hasSeen becomes true (e.g. via Realtime update from another device/tab)
  useEffect(() => {
    if (hasSeen && run) {
      console.log('[TourDebug] hasSeen became true while tour was running. Stopping tour.');
      setRun(false);
    }
  }, [hasSeen, run]);

  // Explicit Realtime Subscription for absolute certainty
  useEffect(() => {
    if (!user?.id) return;

    console.log('[TourDebug] Setting up Realtime subscription for usage...');
    const channel = supabase
      .channel(`tour_status_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = payload.new.has_seen_tour;
          console.log('[TourDebug] Realtime update received:', newStatus);
          if (newStatus === true || newStatus === 'true') {
            refreshProfile(); // Sync full profile
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Debug helper
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).resetTour = async () => {
      console.log("Resetting tour...");
      if (user) {
        await supabase.from('users').update({ has_seen_tour: false }).eq('id', user.id);
        refreshProfile();
        console.log("Tour reset complete.");
      }
    };
  }, [user]);

  const steps: Step[] = [
    {
      target: isMobile ? '#tour-token-balance-mobile' : '#tour-token-balance',
      title: 'Helix Guided Tour',
      content: (
        <span>
          Quickly click through to become a <strong>Helix Pro</strong>.
        </span>
      ),
      placement: 'left',
      disableBeacon: true,
    },
    {
      target: isMobile ? '#tour-token-balance-mobile' : '#tour-token-balance',
      title: 'Tokens',
      content: 'View your balance and refill anytime.',
      disableBeacon: true,
      placement: 'left',
    },
    {
      target: '#tour-media-section',
      title: 'Set Media',
      content: (
        <span>
          Choose <strong>Video</strong> or <strong>Image</strong>
        </span>
      ),
    },
    {
      target: '#tour-media-upload',
      title: 'Set Media',
      content: (
        <span>
          Upload <strong>media</strong> and <strong>prompt</strong> — or select a <strong>product</strong> from your <strong>Library</strong> for fast repeat generation.
        </span>
      ),
    },
    {
      target: '#tour-settings-section',
      title: 'Set Settings',
      content: (
        <div>
          <ul className="list-disc pl-4 space-y-2">
            <li><strong>UGC Testimonial</strong>: an actor showcases your product for social.</li>
            <li><strong>Promotional</strong>: narrated feature video for product pages.</li>
            <li>Choose <strong>Portrait</strong> or <strong>Landscape</strong>.</li>
          </ul>
        </div>
      ),
    },
    {
      target: '#tour-prompt-input',
      title: 'Prompt',
      content: (
        <div>
          <p>Describe the <strong>actor</strong> (age, gender, look) and the <strong>scene</strong> (location, lighting, actions).</p>
          <br />
          <p className="opacity-90 italic">
            Note: actors and narration won’t follow your script word-for-word — <strong>Helix’s AI agents</strong> shape the most impactful version.
          </p>
        </div>
      ),
    },
    {
      target: '#tour-generate-button',
      title: 'Run Helix',
      content: (
        <span>
          <strong>1, 2, 3, GO!</strong> &nbsp;🚀
        </span>
      ),
    },
  ];

  useEffect(() => {
    if (run) {
      // Disable scrolling
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Re-enable scrolling
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [run]);

  // Keep a ref to get the latest value in startTour even if closure is stale
  const hasSeenRef = React.useRef(hasSeen);
  useEffect(() => {
    hasSeenRef.current = hasSeen;
  }, [hasSeen]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, type, action } = data;
    console.log('[TourDebug] Joyride Callback:', { status, index, type, action });

    // Dispatch event to close specific popovers if needed
    // Moving from Step 2 (index 1) to Step 3 (index 2)
    if (type === EVENTS.STEP_BEFORE && index === 1) {
      window.dispatchEvent(new Event('open-token-popover'));
    }

    if (type === EVENTS.STEP_AFTER && index === 1 && action === ACTIONS.NEXT) {
      window.dispatchEvent(new Event('close-token-popover'));
      window.dispatchEvent(new Event('mark-tokens-seen'));
    }

    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    // Check if finished, skipped, or explicitly closed (via X or overlay click)
    if (finishedStatuses.includes(status) || action === ACTIONS.CLOSE) {
      console.log('[TourDebug] Tour finished/skipped/closed. Marking as seen.');
      setRun(false);
      markTourAsSeen();
    }
  };

  const startTour = () => {
    if (hasSeenRef.current) {
      console.log('[TourDebug] startTour called but ignored because hasSeen is true (via ref)');
      return;
    }
    // Double check explicit profile state just in case ref sync is lagging (unlikely but safe)
    if (userProfile?.has_seen_tour === true || userProfile?.has_seen_tour === 'true') {
      console.log('[TourDebug] startTour blocked by direct userProfile check');
      return;
    }

    console.log('[TourDebug] Starting tour (hasSeen is false)...');
    setRun(true);
  };

  return (
    <TourContext.Provider value={{ startTour, hasSeenTour: hasSeen, markTourAsSeen, isProfileLoading: isLoading }}>
      {children}
      <Joyride
        run={run}
        debug={true}
        steps={steps}
        continuous
        showSkipButton
        showProgress
        disableScrolling={true}
        disableScrollParentFix={true}
        disableOverlayClose={true}
        disableCloseOnEsc={false}
        callback={handleJoyrideCallback}
        tooltipComponent={TourTooltip}

        floaterProps={{
          styles: {
            arrow: {
              length: 12,
              spread: 24,
              color: 'url(#tour-gradient)',
            }
          }
        }}
        styles={{
          options: {
            zIndex: 10000,
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            primaryColor: '#FFFFFF',
            textColor: '#FFFFFF',
          },
          tooltip: {
            backgroundImage: 'linear-gradient(90deg, #29A6B4 0%, #9ED2C3 100%)',
            color: '#FFFFFF',
          },
          buttonNext: {
            backgroundColor: '#FFFFFF',
            color: '#29A6B4',
            fontWeight: 600,
          },
          buttonBack: {
            color: '#FFFFFF',
          },
          buttonSkip: {
            color: '#FFFFFF',
          }
        }}
      />
      {/* Hidden SVG to define the gradient for the arrow */}
      <svg width="0" height="0" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="tour-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#29A6B4" />
            <stop offset="100%" stopColor="#9ED2C3" />
          </linearGradient>
        </defs>
      </svg>
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};
