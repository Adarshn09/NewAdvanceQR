import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

// ── Helper: map server error messages to user-friendly copy ────────────────

function getLoginErrorInfo(msg: string): { title: string; description: string } {
  const m = msg.toLowerCase();
  if (m.includes("incorrect") || m.includes("invalid") || m.includes("password")) {
    return {
      title: "Incorrect password",
      description: "The password you entered is wrong. Please try again.",
    };
  }
  if (m.includes("not found") || m.includes("no user") || m.includes("username")) {
    return {
      title: "Account not found",
      description: "No account exists with that username. Did you mean to sign up?",
    };
  }
  if (m.includes("too many") || m.includes("rate limit")) {
    return {
      title: "Too many attempts",
      description: "Please wait a moment before trying again.",
    };
  }
  return {
    title: "Sign in failed",
    description: msg || "Something went wrong. Please try again.",
  };
}

function getRegisterErrorInfo(msg: string): { title: string; description: string } {
  const m = msg.toLowerCase();
  if (
    m.includes("already exists") ||
    m.includes("duplicate") ||
    m.includes("taken") ||
    m.includes("unique") ||
    m.includes("already registered")
  ) {
    return {
      title: "Username already taken",
      description: "That username is already in use. Please choose a different one.",
    };
  }
  if (m.includes("email") && (m.includes("exists") || m.includes("taken") || m.includes("duplicate"))) {
    return {
      title: "Email already registered",
      description: "An account with that email already exists. Try signing in instead.",
    };
  }
  if (m.includes("password")) {
    return {
      title: "Password doesn't meet requirements",
      description: "Please ensure your password meets all the listed requirements.",
    };
  }
  if (m.includes("username")) {
    return {
      title: "Invalid username",
      description: "Please choose a valid username (letters, numbers, underscores only).",
    };
  }
  return {
    title: "Registration failed",
    description: msg || "We couldn't create your account. Please try again.",
  };
}

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // ── Login ────────────────────────────────────────────────────────────────

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        variant: "success",
        title: "Welcome back! 👋",
        description: `Signed in as ${user.username}. Good to see you again.`,
        duration: 4000,
      });
    },
    onError: (error: Error) => {
      const { title, description } = getLoginErrorInfo(error.message);
      toast({
        variant: "destructive",
        title,
        description,
        duration: 6000,
      });
    },
  });

  // ── Register ─────────────────────────────────────────────────────────────

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        variant: "success",
        title: "Account created! 🎉",
        description: `Welcome, ${user.username}! Your account is ready to use.`,
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      const { title, description } = getRegisterErrorInfo(error.message);
      toast({
        variant: "destructive",
        title,
        description,
        duration: 7000,
      });
    },
  });

  // ── Logout ───────────────────────────────────────────────────────────────

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        variant: "info",
        title: "Signed out",
        description: "You've been signed out safely. See you next time!",
        duration: 4000,
      });
      // Redirect after showing toast briefly
      setTimeout(() => { window.location.href = "/"; }, 800);
    },
    onError: (error: Error) => {
      toast({
        variant: "warning",
        title: "Sign out issue",
        description: error.message || "Something went wrong signing out. Please try again.",
        duration: 5000,
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
