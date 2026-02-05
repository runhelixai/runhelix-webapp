import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import logo from "../../../public/assets/images/logo.png";
import lightlogo from "../../../public/assets/images/light-logo.png";
import { useTheme } from "next-themes";
import UserNav from "@/components/layout/UserNav";

interface AppHeaderProps {
    className?: string;
}

const AppHeader = ({ className = "" }: AppHeaderProps) => {
    const navigate = useNavigate();
    const { theme } = useTheme();

    return (
        <nav className={`sticky top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-lg ${className}`}>
            <div className="w-full px-4 sm:px-6 md:px-8">
                <div className="flex h-16 items-center justify-between">
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="flex items-center space-x-2"
                    >
                        <div className="flex items-center justify-center rounded-xl p-1">
                            <img
                                src={theme === "dark" ? logo : lightlogo}
                                alt="Run Helix"
                                className="h-7 w-28 mobile:h-8 mobile:w-32 object-contain cursor-pointer transition-transform hover:scale-105"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = theme === "dark" ? logo : lightlogo;
                                }}
                                onClick={() => navigate("/")}
                            />
                        </div>
                    </motion.div>

                    <UserNav />
                </div>
            </div>
        </nav>
    );
};

export default AppHeader;
