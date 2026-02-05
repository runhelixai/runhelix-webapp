import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useState, useEffect } from "react";
import { getProductImage } from "@/lib/utils";
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  redirectPath?: string;
  children?: React.ReactNode;
}

export const ProtectedRoute = ({
  redirectPath = '/auth',
  children,
}: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const [hasProducts, setHasProducts] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkProducts = async () => {
      try {
        if (user?.id) {
          const products = await getProductImage(user.id);
          setHasProducts(products && products.length > 0);
        } else {
          setHasProducts(false);
        }
      } catch (error) {
        console.error("Error checking products:", error);
        setHasProducts(false);
      }
    };
    if (!isLoading && user) {
      checkProducts();
    } else {
      console.log("[ProtectedRoute] Conditions NOT met. isLoading:", isLoading, "User:", user?.id);
    }
  }, [user, isLoading]);

  if (isLoading || (user && hasProducts === null)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8F9FA] dark:bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-[#29A6B4]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`${redirectPath}?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // If user has not completed onboarding (no products) and is not on /onboarding, redirect to /onboarding
  // Exception: Allow access to pricing page for subscription flow and payment success page
  if (!hasProducts && location.pathname !== "/generate" && location.pathname !== "/onboarding" && !location.pathname.startsWith("/pricing") && !location.pathname.startsWith("/profile") && !location.pathname.startsWith("/payment-success")) {
    return <Navigate to="/onboarding" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const AuthRoute = ({
  redirectPath = '/generate',
  children,
}: ProtectedRouteProps) => {
  const { user, userProfile, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if current path is reset password, normalizing for trailing slash
    const isResetPasswordPath = location.pathname.replace(/\/$/, "") === "/auth/reset-password";
    // Check if we are in a recovery flow (Supabase sends type=recovery in hash/query)
    const isRecovery = location.hash.includes("type=recovery") || location.search.includes("type=recovery");

    if (!isLoading && user) {
      if (isRecovery) {
        if (!isResetPasswordPath) {
          navigate("/auth/reset-password", { replace: true });
        }
        return;
      }

      if (!isResetPasswordPath) {
        const storedRedirect = localStorage.getItem("auth_redirect");
        // If no user_type (new user) or beta user, ALWAYS go to onboarding first
        // Exception: If they have products, they shouldn't go to onboarding (handled by ProtectedRoute logic usually, but here we are directing traffic)
        // Actually, Onboarding page has its own check for existing products.
        if (!userProfile?.user_type) {
          navigate("/onboarding", { replace: true });
        } else if (storedRedirect) {
          // Clear it so we don't loop or reuse it unexpectedly
          localStorage.removeItem("auth_redirect");
          navigate(storedRedirect, { replace: true });
        } else {
          navigate(redirectPath, { replace: true });
        }
      }
    }
  }, [user, userProfile, isLoading, redirectPath, navigate, location.pathname, location.hash, location.search]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8F9FA] dark:bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-[#29A6B4]" />
      </div>
    );
  }

  // Check if current path is reset password, normalizing for trailing slash
  const isResetPasswordPath = location.pathname.replace(/\/$/, "") === "/auth/reset-password";
  const isRecovery = location.hash.includes("type=recovery") || location.search.includes("type=recovery");

  // If user is logged in and NOT on reset password page (and not in recovery mode), we are redirecting, so don't show children/outlet
  // We allow rendering if isRecovery is true (relying on useEffect to redirect to correct page if needed, or render if on correct page)
  if (user && !isResetPasswordPath && !isRecovery) {
    return null;
  }

  return children ? <>{children}</> : <Outlet />;
};
