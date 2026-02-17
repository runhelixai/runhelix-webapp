import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff, Link, Mail, MoveLeft, Tag } from "lucide-react";
import { Label } from "@/components/ui/label";
import { handleOAuthRedirect, useAuth } from "@/lib/auth";
import { NavLink, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import lightlogo from "../../public/assets/images/light-logo.png";
import { commonSvgIcon } from "@/helpers/commonSvg";
import { mergeGuestVideosOnLogin } from "@/lib/utils";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    userName?: string;
    email?: string;
    password?: string;
  }>({});
  const { signIn, signInWithGoogle, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [intendedUserType, setIntendedUserType] = useState<string | undefined>(undefined);
  const [intendedRole, setIntendedRole] = useState<string | undefined>(undefined);
  const isBetaUser = intendedUserType === 'beta';
  const isAdminUser = intendedRole === 'admin' || intendedUserType === 'admin';

  useEffect(() => {
    // Handle OAuth redirect when component mounts
    const handleInitialAuth = async () => {
      try {
        await handleOAuthRedirect();
      } catch (error) {
        console.error("Error handling OAuth redirect:", error);
      }
    };

    handleInitialAuth();

    // Check for auto-fill params
    const params = new URLSearchParams(window.location.search);
    const paramName = params.get("name");
    const paramEmail = params.get("email");
    const paramUserType = params.get("userType");
    const paramRole = params.get("role");

    if (paramName || paramEmail) {
      setIsLogin(false);
      if (paramName) {
        setUserName(paramName);
        // Auto-fill full name with username if not provided separately
        setName(paramName);
      }
      if (paramEmail) setEmail(paramEmail);
      if (paramUserType) setIntendedUserType(paramUserType);
      if (paramRole) setIntendedRole(paramRole);
    }
  }, []);

  const validateForm = () => {
    const newErrors: {
      name?: string;
      userName?: string;
      email?: string;
      password?: string;
    } = {};

    // Name validation (only for signup)
    if (!isLogin) {
      if (!name.trim()) {
        newErrors.name = "Full name is required";
      }
      if (!userName.trim()) {
        newErrors.userName = "Username is required";
      } else if (!/^[a-zA-Z0-9_]+$/.test(userName)) {
        newErrors.userName =
          "Username can only contain letters, numbers, and underscores";
      }
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = `Email ${isLogin ? "or Username" : ""} is required`;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !isLogin) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get("redirect");
      if (redirectUrl) {
        localStorage.setItem("auth_redirect", redirectUrl);
      }
      await signInWithGoogle(redirectUrl || undefined);
    } catch (error: any) {
      toast({
        title: "Google Sign-In Failed",
        description: error?.message || "Failed to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (isLogin) {
        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get("redirect");
        if (redirectUrl) {
          localStorage.setItem("auth_redirect", redirectUrl);
        }

        const { user } = await signIn(email, password);
        if (user) {
          await mergeGuestVideosOnLogin();
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();
          toast({
            title: "Login Successful",
            description: `Welcome back, ${profile?.user_name || profile?.full_name || ""
              }!`,
          });
          const params = new URLSearchParams(window.location.search);
          const redirectUrl =
            params.get("redirect") || localStorage.getItem("auth_redirect");

          if (redirectUrl && profile?.user_type && profile?.user_type !== 'beta') {
            navigate(redirectUrl);
          } else if (!profile?.user_type || profile?.user_type === 'beta') {
            navigate("/onboarding");
          } else {
            navigate("/generate");
          }
        }
      } else {
        // Validate Coupon if provided
        let finalUserType = intendedUserType || 'standard'; // Default to standard to suppress modal
        let isCouponValid = false;

        if (couponCode.trim()) {
          const envCode = import.meta.env.VITE_COUPON_CODE;
          if (couponCode.trim() === envCode) {
            finalUserType = 'VIP';
            isCouponValid = true;
          } else {
            toast({
              title: "Invalid VIP Code",
              description: "The VIP Code you entered is invalid. Please check and try again.",
              variant: "destructive"
            });
            return;
          }
        }

        // Safeguard: Database enum USER_TYPE likely doesn't accept 'admin', so force 'standard'
        const safeUserType = (finalUserType === 'admin') ? 'standard' : finalUserType;
        const { user } = await signUp(name, email, password, "", userName, safeUserType);

        // If VIP user or Admin, we need to update tokens
        if (user && (isCouponValid || isAdminUser)) {
          const updates: any = {};

          if (isCouponValid) {
            updates.purchase_token = 33;
          }

          if (isAdminUser) {
            updates.role = 'admin';
            updates.purchase_token = 1000;
          }

          const { error: updateError } = await supabase
            .from("users")
            .update(updates)
            .eq("id", user.id);

          if (updateError) {
            console.error("[Auth] Error updating user tokens/role:", updateError);
          }
        }

        toast({
          title: "Sign Up Successful",
          description: `Welcome to Run Helix, ${userName}!`,
        });
        // Reset form and switch to login
        setName("");
        setEmail("");
        setPassword("");
        setUserName("");
        setCouponCode("");
        setIsLogin(true);
        toast({
          title: "Please verify your email",
          description:
            "A verification link has been sent to your email address.",
        });
      }
    } catch (error: any) {
      const errorMessage =
        error?.message || (isLogin ? "Login failed" : "Sign up failed");
      toast({
        title: isLogin ? "Login Failed" : "Sign Up Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserName(e.target.value);
    if (errors.userName) {
      setErrors((prev) => ({ ...prev, userName: undefined }));
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setUserName("");
    setErrors({});
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20  overflow-hidden relative dark:bg-[#111213]">
      <div className="bg-[url('/assets/images/banner-img.png')] bg-animation-keyframe dark:bg-[url('/assets/images/dark-mode.png')]  absolute bottom-0 left-0 w-full bg-cover bg-center h-full"></div>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full dark:border-[#1f2123] dark:bg-[linear-gradient(0deg,#0A0A0A_20%,#1A1A1A_100%)] max-w-md shadow-2xl border-border/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 pointer-events-none" />
        <CardHeader className="space-y-1 text-center relative">
          <div className="flex items-center justify-center pb-5 pt-4">
            <img className="max-w-[150px]" src={lightlogo} alt="lightlogo" />
          </div>
          <CardTitle className="text-2xl  text-[#121212] dark:text-white font-semibold">
            {isLogin ? "Welcome Back" : "Create an Account"}
          </CardTitle>
          <CardDescription className="text-base font-medium dark:text-white text-gray-600">
            {isLogin
              ? "Sign in to continue to Run Helix"
              : "Create your Run Helix account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={handleNameChange}
                      className={errors.name ? "border-red-500" : ""}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="johndoe"
                      value={userName}
                      onChange={handleUserNameChange}
                      className={errors.userName ? "border-red-500" : ""}
                      disabled={isBetaUser}
                    />
                    {errors.userName && (
                      <p className="text-sm text-red-500">{errors.userName}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">
                {isLogin ? "Email or Username" : "Email"}
              </Label>
              <Input
                id="email"
                type={isLogin ? "text" : "email"}
                placeholder={
                  isLogin ? "Enter your email or username" : "Enter your email"
                }
                value={email}
                onChange={handleEmailChange}
                className={`h-11 transition-all duration-200 ${errors.email ? "border-destructive" : ""
                  }`}
                disabled={isSubmitting || (!isLogin && (isBetaUser || isAdminUser))}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={handlePasswordChange}
                  className={`h-11 transition-all duration-200 pr-10 ${errors.password ? "border-destructive" : ""
                    }`}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive mt-1">
                  {errors.password}
                </p>
              )}
            </div>

            {!isLogin && !isBetaUser && !isAdminUser && (
              <div className="space-y-2">
                <Label htmlFor="coupon">Enter VIP Access Code (Optional)</Label>
                <div className="relative">
                  <Input
                    id="coupon"
                    type="text"
                    placeholder="Enter VIP Access Code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="h-11 transition-all duration-200 pl-10"
                    disabled={isSubmitting}
                  />
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
              </div>
            )}

            <NavLink
              to="/auth/forgot-password"
              className="block text-right cursor-pointer text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </NavLink>
            <div className="space-y-4">
              <Button
                type="submit"
                variant="default"
                className="w-full h-12 !text-base !font-medium flex items-center justify-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    {commonSvgIcon("loader")}
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    {isLogin ? "Sign in" : "Sign up with Email"}
                  </>
                )}
              </Button>
            </div>

            {isLogin ? (
              <>
                <Button
                  type="button"
                  variant="reverse_default"
                  onClick={toggleAuthMode}
                  className="w-full h-12 !text-base !font-medium mt-4 flex items-center justify-center"
                  disabled={isSubmitting}
                >
                  Don't have an account? Sign up
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-3 text-muted-foreground">
                      OR
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 !text-base !font-medium flex items-center justify-center gap-3 ring-1 ring-gray-500"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                >
                  {commonSvgIcon("google")}
                  Sign in with Google
                </Button>
              </>
            ) : (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-3 text-muted-foreground">
                      OR
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 !text-base !font-medium flex items-center justify-center gap-3 ring-1 ring-gray-500"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                >
                  {commonSvgIcon("google")}
                  Sign up with Google
                </Button>

                <div className="mt-4 text-center">
                  <span className="text-muted-foreground text-base">Already have an account? </span>
                  <button
                    type="button"
                    onClick={toggleAuthMode}
                    className="text-primary underline underline-offset-4 font-medium text-base ml-1"
                    disabled={isSubmitting}
                  >
                    Sign in
                  </button>
                </div>
              </>
            )}
            {/* <div className="flex hover:underline text-primary items-center gap-1 justify-center">
              <MoveLeft className="text-primary w-4" />
              <NavLink to="/generate" className="block ">
                <p className="text-primary text-sm font-medium text-center">
                  Back to Home
                </p>
              </NavLink>
            </div> */}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
