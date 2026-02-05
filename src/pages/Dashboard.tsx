import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import logo from "../../public/assets/images/logo.png";
import lightlogo from "../../public/assets/images/light-logo.png";
import { useEffect, useState } from "react";
import { Sparkles, Video, Zap, User, ArrowRight, LogOut, Clock, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { commonSvgIcon } from "@/helpers/commonSvg";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  credits_remaining?: number;
  videos_generated?: number;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const { data, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        setUserProfile(data);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError("Failed to load user profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center space-x-2"
            >
              <div className={`flex items-center justify-center rounded-xl p-1`}>
                <img
                  src={theme === 'dark' ? logo : lightlogo}
                  alt="Run Helix"
                  className="h-7 w-32 object-contain cursor-pointer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = theme === 'dark' ? logo : lightlogo;
                  }}
                  onClick={() => navigate("/")}
                />
              </div>
              {/* <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-xl font-bold text-transparent">
                  Run Helix
                </span> */}
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center space-x-4"
            >
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await signOut();
                    navigate("/generate");
                  } catch (error) {
                    console.error("Error signing out:", error);
                  }
                }}
                className="group flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent/50 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-7xl">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
        >
          <div className="flex flex-col space-y-6 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/30 to-accent/30 opacity-70 blur"></div>
                <Avatar className="relative h-20 w-20 border-2 border-primary/20 shadow-lg">
                  <AvatarImage src={userProfile?.avatar_url || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-3xl font-bold">
                    {userProfile?.full_name
                      ? userProfile.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                      : user?.email?.[0].toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {isLoading ? (
                    <Skeleton className="h-9 w-64 rounded-md" />
                  ) : (
                    <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                      Welcome back, {userProfile?.full_name || "User"}
                    </span>
                  )}
                </h1>
                <p className="mt-1 flex items-center text-sm text-muted-foreground">
                  <span className="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
                  {isLoading ? <Skeleton className="h-4 w-48" /> : user?.email}
                </p>
              </div>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-4 sm:mt-0"
            >
              <Button
                onClick={() => navigate("/generate")}
                className="group relative overflow-hidden bg-gradient-to-r from-primary to-accent px-6 py-5 text-base font-medium text-white shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Create New Video
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                <span className="absolute inset-0 h-full w-full -translate-x-full bg-white/20 opacity-0 transition-all duration-700 group-hover:translate-x-0 group-hover:opacity-30"></span>
              </Button>
            </motion.div>
          </div>

          {userProfile?.created_at && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 inline-flex items-center rounded-full border border-border/20 bg-accent/5 px-4 py-2 text-sm font-medium text-accent backdrop-blur-sm"
            >
              <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-accent"></span>
              Member since{" "}
              {new Date(userProfile.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </motion.div>
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {/* Total Videos Card */}
          <motion.div variants={item}>
            <Card className="group relative h-full overflow-hidden border-border/30 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-primary/30">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Videos
                </CardTitle>
                <div className="rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                  <Video className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                {isLoading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  <div className="text-3xl font-bold text-foreground">
                    {userProfile?.videos_generated || 0}
                  </div>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  Videos generated
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Credits Remaining Card */}
          <motion.div variants={item}>
            <Card className="group relative h-full overflow-hidden border-border/30 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-primary/30">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tokens Remaining
                </CardTitle>
                <div className="rounded-lg bg-yellow-500/10 p-2 transition-colors group-hover:bg-yellow-500/20">
                  <Zap className="h-4 w-4 text-yellow-500" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                {isLoading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  <div className="text-3xl font-bold text-foreground">
                    {userProfile?.credits_remaining || 0}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      tokens
                    </span>
                  </div>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  {userProfile?.credits_remaining &&
                    userProfile.credits_remaining > 0
                    ? "Ready to create more videos"
                    : "Get more tokens to continue"}
                </p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="link" size="sm" className="h-auto p-0 text-sm">
                  Upgrade plan
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Recent Activity Card */}
          <motion.div variants={item}>
            <Card className="group relative h-full overflow-hidden border-border/30 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-primary/30">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Recent Activity
                </CardTitle>
                <div className="rounded-lg bg-purple-500/10 p-2 transition-colors group-hover:bg-purple-500/20">
                  <Clock className="h-4 w-4 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <p className="text-sm text-foreground">
                          Welcome to Run Helix! Start creating your first video.
                        </p>
                      </div>
                      {userProfile?.videos_generated ? (
                        <div className="flex items-start">
                          <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                            <Video className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          <p className="text-sm text-foreground">
                            You've created {userProfile.videos_generated} video
                            {userProfile.videos_generated !== 1 ? "s" : ""} so
                            far.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* <Card className="border-border/50 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credits</CardTitle>
                <svg
                  className="h-4 w-4 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {isLoading ? '--' : userProfile?.credits_remaining || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Credits remaining
                </p>
              </CardContent>
            </Card> */}

        <motion.div variants={item}>
          <Card className="h-full border-border/30 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group hover:border-accent/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Account
              </CardTitle>
              <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <User className="h-4 w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-foreground/90 truncate">
                {user?.email}
              </div>
              <div className="flex items-center mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-accent/20 to-accent/10 text-accent">
                  <Zap className="h-3 w-3 mr-1" />
                  Premium Member
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {commonSvgIcon("plus", "w-6 h-6 text-primary")}
                </div>
                Generate New Video
              </CardTitle>
              <CardDescription>
                Upload an image and create a stunning video
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate("/generate")}
                className="w-full"
                size="lg"
              >
                Start Creating
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all hover:border-accent/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  {commonSvgIcon("clock", "w-6 h-6 text-accent")}
                </div>
                View History
              </CardTitle>
              <CardDescription>
                Access your previously generated videos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate("/generate")}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Browse History
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
