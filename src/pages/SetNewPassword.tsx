import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff, Lock, MoveLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import lightlogo from "../../public/assets/images/light-logo.png";
import { commonSvgIcon } from "@/helpers/commonSvg";

const SetNewPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = "Password must contain at least one uppercase letter, one lowercase letter, and one number";
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      if (data) {
        toast({
          title: "Password Updated Successfully",
          description: "Your password has been updated.",
        })
        navigate('/generate', { replace: true })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Password Update Failed",
        description: error instanceof Error ? error.message : "Failed to set password. Please try again."
      })
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const checkErrors = async () => {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace("#", "?"));
      const err = search.get("error") || search.get("error_description") || hash.get("error") || hash.get("error_description");
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        toast({
          variant: "destructive",
          title: "Session Expired",
          description: "Your session has expired. Please try again."
        })
      }
      if (err) {
        toast({
          variant: "destructive",
          title: "Link Expired",
          description: decodeURIComponent(err) || "Link has expired. Please try again."
        });

        navigate("/auth", { replace: true });
      }
    };

    checkErrors();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4 relative dark:bg-[#111213]">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full dark:border-[#1f2123] dark:bg-[linear-gradient(0deg,#0A0A0A_20%,#1A1A1A_100%)] max-w-md shadow-2xl border-border/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 pointer-events-none" />
        <CardHeader className="space-y-1 text-center relative">
          <div className="flex items-center justify-center pb-5 pt-4">
            <img className="max-w-[150px]" src={lightlogo} alt="lightlogo" />
          </div>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <CardTitle className="text-2xl text-[#121212] dark:text-white font-semibold">
            Set New Password
          </CardTitle>
          <CardDescription className="text-base font-medium dark:text-white text-gray-600">
            Enter your new password below to secure your account
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <form onSubmit={handleSetNewPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={handlePasswordChange}
                  className={`h-11 transition-all duration-200 pr-10 ${errors.password ? "border-destructive" : ""}`}
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
                <p className="text-sm text-destructive mt-1">{errors.password}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Password must be at least 6 characters with uppercase, lowercase, and number
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  className={`h-11 transition-all duration-200 pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>
              )}
            </div>

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
                    Updating password...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Update Password
                  </>
                )}
              </Button>
            </div>

            <div className="text-center">
              <NavLink to="/auth/forgot-password">
                <button disabled={isSubmitting} className="flex gap-1 items-center m-auto hover:underline text-primary">
                  <MoveLeft className="text-primary w-4" />
                  <p className="text-primary text-sm font-medium text-center">
                    Back to Forgot Password
                  </p>
                </button>
              </NavLink>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetNewPassword;
