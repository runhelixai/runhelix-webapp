import { useTour } from "@/context/TourContext";

export const usePlatformTour = () => {
  const { startTour, hasSeenTour: hasSeenTourValue, markTourAsSeen, isProfileLoading } = useTour();

  const markTourSeen = () => {
    markTourAsSeen();
  };

  const hasSeenTour = () => hasSeenTourValue;

  return { startTour, hasSeenTour, markTourSeen, isTourLoading: isProfileLoading, tourGuide: null };
};
