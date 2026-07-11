"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";

/* ---------------- Types ---------------- */

type User = {
  id?: number;
  username?: string;
  email?: string;
  [key: string]: any;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (data: { user?: User; access?: string; refresh?: string }) => void;
  logout: () => void;
};

/* ---------------- Helpers ---------------- */

// ✅ Safe JSON parser (prevents crash)
function safeParse(json: string | null) {
  try {
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

/* ---------------- Context ---------------- */

const AuthContext = createContext<AuthContextType | null>(null);

/* ---------------- Provider ---------------- */

export const AuthProvider = ({
                               children,
                             }: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------------- Init (on reload) ---------------- */

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("access");

      const parsedUser = safeParse(storedUser);

      if (parsedUser && token) {
        setUser(parsedUser);
      } else {
        // cleanup bad data
        localStorage.removeItem("user");
      }
    } catch (err) {
      console.error("Auth load error:", err);
      localStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------------- Login ---------------- */

  const login = useCallback((data: {
    user?: User;
    access?: string;
    refresh?: string;
  }) => {
    try {
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
      } else {
        console.warn("Login: user is undefined");
      }

      if (data.access) {
        localStorage.setItem("access", data.access);
      }

      if (data.refresh) {
        localStorage.setItem("refresh", data.refresh);
      }
    } catch (err) {
      console.error("Login error:", err);
    }
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");

      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/* ---------------- Hook ---------------- */

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};