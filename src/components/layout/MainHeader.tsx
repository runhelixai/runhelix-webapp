import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import logo from "@/../public/assets/images/logo.png";

interface MainHeaderProps {
  className?: string;
  showAuthButtons?: boolean;
}

const MainHeader = ({ className = "", showAuthButtons = true }: MainHeaderProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/generate");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <nav className={`sticky top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-lg ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
              <img
                src={logo}
                alt="Run Helix"
                className="h-7 w-32 object-contain"
                onError={(e) => {
                  // Fallback to text if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'block';
                  }
                }}
              />
              <span className="hidden bg-gradient-to-r from-primary to-accent bg-clip-text text-xl font-bold text-transparent">
                Run Helix
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center space-x-4"
          >
            <ThemeToggle />
            {showAuthButtons && user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="group flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent/50 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </Button>
            )}
            {showAuthButtons && !user && (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/auth')}
                className="px-4"
              >Sign In
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    </nav>
  );
};

export default MainHeader;
