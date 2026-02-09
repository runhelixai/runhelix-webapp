// src/lib/auth.ts
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { sendAuthEmail, sendVipWelcomeEmail, sendNormalWelcomeEmail } from "@/services/emailService";

interface SignUpResponse {
  user: User | null;
  session: any | null;
}

export interface AuthContextType {
  user: User | null;
  userProfile: any | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null }>;
  signUp: (name: string, email: string, password: string, phone: string, userName: string, userType?: string) => Promise<SignUpResponse>;
  signInWithGoogle: (redirectPath?: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLimitReached?: boolean;
  setIsLimitReached?: (value: boolean) => void;
  refreshProfile: () => Promise<void>;
}

// Create and export the auth context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// Add this function to handle the OAuth callback
export const handleOAuthCallback = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

// Create a custom OAuth sign-in function that handles the redirect manually
export const signInWithGoogle = async (redirectPath: string = '/generate') => {
  // First, get the OAuth URL without redirecting
  const redirectTo = redirectPath.startsWith('http')
    ? redirectPath
    : `${window.location.origin}${redirectPath.startsWith('/') ? redirectPath : '/' + redirectPath}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }

  if (data?.url) {
    // Replace the # with ? for a cleaner URL
    const cleanUrl = data.url
      .replace('/#', '/?') // Replace # with ?
      .replace('response_type=token', 'response_type=code'); // Use code flow instead of implicit

    // Use window.location.replace to prevent adding to browser history
    window.location.replace(cleanUrl);
  }
};

// Add this to handle the redirect after OAuth
const handleOAuthRedirect = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('OAuth error:', error);
    return;
  }
  // URL cleanup is now handled by AuthRoute redirect logic
};

// Export handleOAuthRedirect to be used in the Auth component
export { handleOAuthRedirect };

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // In-memory lock to prevent double-firing of welcome logic for the same user in the same session
  const processedUsers = React.useRef(new Set<string>());

  const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout: ${label} took longer than ${ms}ms`));
      }, ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  };

  const getUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      return null;
    }
    return data;
  };

  useEffect(() => {
    // Check active sessions and set the user
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          try {
            let profile = await withTimeout(getUserProfile(session.user.id), 1000, "getUserProfile");
            if (!profile) {
              if (processedUsers.current.has(session.user.id)) {
                setIsLoading(false); // Ensure loading state is cleared even if we skip
                return;
              }
              processedUsers.current.add(session.user.id);

              const { user_metadata, email, id } = session.user;

              let fullName = user_metadata.full_name || user_metadata.name || "";
              if (!fullName && (user_metadata.given_name || user_metadata.family_name)) {
                fullName = [user_metadata.given_name, user_metadata.family_name]
                  .filter(Boolean)
                  .join(" ");
              }
              const avatarUrl = user_metadata.avatar_url || user_metadata.picture || "";
              const newProfile = {
                id: id,
                email: email,
                full_name: fullName,
                avatar_url: avatarUrl,
                user_name: fullName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000), // Generate a temp username
                user_type: 'standard', // Default to standard for Google Sign ups
                updated_at: new Date().toISOString(),
              };
              const { data: createdProfile, error: createError } = await supabase
                .from('users')
                .upsert(newProfile)
                .select()
                .single();
              if (createError) {
                console.error("[Auth] Failed to create new user profile:", createError);
              } else {
                profile = createdProfile;

                // Atomic Check: Try to insert into email_drip_status FIRST.
                // If it succeeds, WE are the first ones here -> Send Email.
                // If it fails (duplicate key), someone else beat us -> Skip.
                const { error: insertError } = await supabase
                  .from("email_drip_status")
                  .insert({ user_id: id });

                if (!insertError) {
                  // 2. Send Welcome Email
                  if (email) {
                    try {
                      // Assuming standard user for now as we don't have coupon context here easily
                      // await sendNormalWelcomeEmail(email, fullName);
                    } catch (emailError) {
                      console.error("[Auth] Failed to send welcome email:", emailError);
                      // Note: We already claimed the "drip status" spot, so if email fails here,
                      // it won't retry. Ideally we might want a way to retry, but for now preventing duplicates is priority.
                    }
                  }
                  // 3. Initialize Drip
                  supabase.functions.invoke('send-drip-email', {
                    body: { user_id: id }
                  }).then(({ error }) => {
                    if (error) console.error("Failed to invoke send-drip-email:", error);
                  }).catch(err => {
                    console.error("Exception invoking send-drip-email:", err);
                  });
                } else {
                  console.log("[Auth] Welcome email skipped - user already processed (Atomic check). Error:", insertError.message);
                }
              }
            } else {
              if (!profile.full_name || !profile.avatar_url || !profile.user_name) {
                if (processedUsers.current.has(session.user.id)) {
                  setIsLoading(false);
                  return;
                }

                // Mark as processed only if we are actually going to do work that triggers emails
                // However, we need to be careful not to block legitimate legitimate updates if the first one fails.
                // But for "Welcome Email" purposes, one attempt per session is safer to avoid spam.
                processedUsers.current.add(session.user.id);

                const { user_metadata } = session.user;

                // Try to get the name from various fields
                let fullName = user_metadata.full_name || user_metadata.name || "";

                // If still empty, try to construct from given_name and family_name
                if (!fullName && (user_metadata.given_name || user_metadata.family_name)) {
                  fullName = [user_metadata.given_name, user_metadata.family_name]
                    .filter(Boolean)
                    .join(" ");
                }

                const avatarUrl = user_metadata.avatar_url || user_metadata.picture || "";

                const updates: any = {};
                if (!profile.full_name && fullName) updates.full_name = fullName;
                if (!profile.avatar_url && avatarUrl) updates.avatar_url = avatarUrl;
                if (!profile.user_name && fullName) updates.user_name = fullName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);

                if (Object.keys(updates).length > 0) {
                  const { data: updatedProfile, error: updateError } = await supabase
                    .from('users')
                    .update(updates)
                    .eq('id', session.user.id)
                    .select()
                    .single();

                  if (updateError) {
                    console.error("[Auth] Failed to backfill profile:", updateError);
                  } else {
                    profile = updatedProfile;

                    if (updates.full_name) {
                      // Atomic Check for Backfill
                      const { error: insertError } = await supabase
                        .from("email_drip_status")
                        .insert({ user_id: session.user.id });

                      if (!insertError) {
                        // This implies it's a new sign-up where we just got the name
                        // Trigger Welcome Email & Drip
                        const email = session.user.email;
                        const id = session.user.id;

                        if (email) {
                          try {
                            // await sendNormalWelcomeEmail(email, updates.full_name);
                          } catch (e) {
                            console.error("[Auth] Failed to send welcome email (backfill):", e);
                          }
                        }

                        // Initialize Drip
                        supabase.functions.invoke('send-drip-email', {
                          body: { user_id: id }
                        }).then(({ error }) => {
                          if (error) console.error("Failed to invoke send-drip-email (backfill):", error);
                        }).catch(err => {
                          console.error("Exception invoking send-drip-email (backfill):", err);
                        });
                      } else {
                        console.log("[Auth] Backfill welcome email skipped - already sent (Atomic check).");
                      }
                    }
                  }
                }
              }
            }
            setUserProfile(profile);
          } catch (err) {
            console.error("[Auth] Unexpected error in onAuthStateChange:", err);
          }
          setIsLoading(false);
        }
      }
    );

    // Initial session check
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), 1000, "getSession");
        if (session?.user) {
          try {
            const profile = await withTimeout(getUserProfile(session.user.id), 1000, "getUserProfile_initial");
            setUserProfile(profile);
          } catch (err) {
            console.error("Initial profile fetch failed:", err);
          }
        }
        setUser(session?.user ?? null);
      } catch (err) {
        console.error("Error getting initial session:", err);
      }
      setIsLoading(false);
    };

    getInitialSession();

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Real-time subscription for user profile updates & Rollover Expiry Check
  useEffect(() => {
    if (!user?.id) return;

    // Function to check and handle rollover expiry
    const checkRolloverExpiry = async () => {
      if (userProfile?.rollover_expiry && userProfile?.rollover_token > 0) {
        const expiryDate = new Date(userProfile.rollover_expiry);
        if (expiryDate < new Date()) {
          console.log("[Auth] Rollover tokens expired. Calculating deduction...");
          // Calculate deductible tokens:
          // We want to remove the unused portion of rollover_token.
          // used_rollover = total_used (exhaust_token)
          // If exhaust_token >= rollover_token, then all rollover tokens were used. None to expire.
          // If exhaust_token < rollover_token, then (rollover_token - exhaust_token) are unused and should expire.

          // Wait, this assumes exhaust_token counts from 0 since rollover.
          // Yes, in PaymentSuccess we reset exhaust_token to 0.

          const unusedRollover = Math.max(0, userProfile.rollover_token - (userProfile.exhaust_token || 0));

          if (unusedRollover > 0) {
            console.log(`[Auth] Expiring ${unusedRollover} tokens.`);
            const { error } = await supabase
              .from('users')
              .update({
                purchase_token: Math.max(0, (userProfile.purchase_token || 0) - unusedRollover),
                rollover_token: 0,
                rollover_expiry: null
              })
              .eq('id', user.id);

            if (error) {
              console.error("[Auth] Failed to expire rollover tokens:", error);
            } else {
              console.log("[Auth] Rollover tokens expired successfully.");
              refreshProfile();
            }
          } else {
            // All rollover tokens were used. Just clear the flag.
            console.log("[Auth] All rollover tokens were used. Clearing expiry flag.");
            const { error } = await supabase
              .from('users')
              .update({
                rollover_token: 0,
                rollover_expiry: null
              })
              .eq('id', user.id);
            if (!error) refreshProfile();
          }
        }
      }
    };

    checkRolloverExpiry();

    const channel = supabase
      .channel(`user_profile_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && payload.new.purchase_token !== userProfile?.purchase_token) {
          }
          setUserProfile(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to user profile changes');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, userProfile?.rollover_expiry, userProfile?.rollover_token, userProfile?.exhaust_token]);

  const signIn = async (identifier: string, password: string) => {
    let email = identifier;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email?.trim());
    if (!isEmail) {
      const { data: profile, error: queryError } = await supabase
        .from("users")
        .select("email")
        .eq("user_name", email)
        .single();
      if (queryError || !profile?.email) {
        throw new Error("Username not found");
      }
      email = profile.email;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password, });
    if (error) throw error;
    return { user: data?.user || null }
  };

  const signUp = async (name: string, email: string, password: string, phone: string, userName: string, userType?: string) => {
    try {
      // First create the user in auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            user_name: userName,
            phone,
            user_type: userType, // Pass userType to metadata as well
          },
        },
      });

      if (signUpError) {
        console.error('Auth signup error:', signUpError);
        throw signUpError;
      }


      if (!authData.user) {
        throw new Error('User creation failed - no user data returned');
      }

      // Initialize drip status via Edge Function
      supabase.functions.invoke('send-drip-email', {
        body: { user_id: authData.user.id }
      }).then(({ error }) => {
        if (error) console.error("Failed to invoke send-drip-email:", error);
        else console.log("Invoked send-drip-email successfully");
      });

      // Insert into email_drip_status table
      // We use authData.user.id directly which is guaranteed to be present here
      const { error: dripError } = await supabase
        .from("email_drip_status")
        .insert({ user_id: authData.user.id });

      if (dripError) {
        console.error("Error inserting drip status:", dripError);
      }

      // Then create/update the user profile in the users table
      const profileUpdates: any = {
        id: authData.user.id,
        email: email,
        full_name: name,
        user_name: userName,
        updated_at: new Date().toISOString(),
      };

      if (userType) {
        profileUpdates.user_type = userType;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .upsert(profileUpdates)
        .select()
        .single();


      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw profileError;
      }
      // Send signup email notification only for beta users
      if (userType === 'beta') {
        try {
          // Use the current origin or a specific link
          await sendAuthEmail(email, name);
        } catch (emailError) {
          console.error("Failed to send signup email:", emailError);
          // Don't block signup if email fails
        }
      } else if (userType === 'VIP') {
        try {
          await sendNormalWelcomeEmail(email, name);
        } catch (emailError) {
          console.error("Failed to send VIP welcome email:", emailError);
        }
      } else if (userType == undefined || userType === 'standard') {
        try {
          await sendNormalWelcomeEmail(email, name);
        } catch (emailError) {
          console.error("Failed to send standard welcome email:", emailError);
        }
      }

      return { ...authData, profile: profileData };
    } catch (error) {
      console.error('Error during signup process:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    localStorage.removeItem("auth_redirect");
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
    setUser(null);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const profile = await getUserProfile(user.id);
      if (profile) {
        setUserProfile(profile);
      }
    }
  };

  const value = {
    user,
    userProfile,
    isLoading,
    signIn,
    signUp,
    signInWithGoogle: (redirectPath?: string) => signInWithGoogle(redirectPath),
    signOut,
    refreshProfile,
  };

  return React.createElement(
    AuthContext.Provider,
    { value },
    children
  );
};