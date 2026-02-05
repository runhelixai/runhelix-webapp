import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Mail, ArrowLeft, CheckCircle, MoveLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { NavLink, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import lightlogo from "../../public/assets/images/light-logo.png";
import { commonSvgIcon } from "@/helpers/commonSvg";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
  }>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors: { email?: string } = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      // 1. Check if user exists in public.users table (Registered user)
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError || !user) {
        throw new Error("Email does not exist");
      }

      // 2. Check if email is verified
      // We attempt a sign-in with a dummy password. 
      // If the email is unverified, Supabase Auth returns "Email not confirmed".
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: `dummy_verify_${Date.now()}`,
      });

      if (signInError && signInError.message.toLowerCase().includes("email not confirmed")) {
        throw new Error("Email is not verified");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast({
        title: "Reset Email Sent",
        description: "Check your email for the password reset link.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send reset email";
      toast({
        title: "Reset Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/auth");
  };

  if (isSuccess) {
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
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl text-[#121212] dark:text-white font-semibold">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-base font-medium dark:text-white text-gray-600">
              We've sent a password reset link to<br />
              <span className="text-primary font-medium">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Didn't receive the email? Check your spam folder or try again.
            </div>
            <Button
              variant="outline"
              className="w-full h-12 !text-base !font-medium"
              onClick={() => setIsSuccess(false)}
              disabled={isSubmitting}
            >
              Try Another Email
            </Button>
            <Button
              variant="default"
              className="w-full h-12 !text-base !font-medium flex items-center justify-center gap-2"
              onClick={handleBackToLogin}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <CardTitle className="text-2xl text-[#121212] dark:text-white font-semibold">
            Forgot Password?
          </CardTitle>
          <CardDescription className="text-base font-medium dark:text-white text-gray-600">
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={handleEmailChange}
                className={`h-11 transition-all duration-200 ${errors.email ? "border-destructive" : ""
                  }`}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email}</p>
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
                    Sending reset link...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </div>

            <div className="text-center">
              <NavLink to="/auth">
                <button disabled={isSubmitting} className="flex gap-1 items-center  m-auto hover:underline text-primary">
                  <MoveLeft className="text-primary w-4" />
                  <p className="text-primary text-sm font-medium text-center">
                    Back to Sign In
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

export default ForgotPassword;