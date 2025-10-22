// import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import { logout as httpLogout } from '@/api/http';

// interface User {
//   id: string;
//   email: string;
//   name: string;
//   avatar?: string;
// }

// interface AuthContextType {
//   user: User | null;
//   login: (email: string, password: string) => Promise<boolean>;
//   register: (name: string, email: string, password: string) => Promise<boolean>;
//   logout: () => void;
//   loading: boolean;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

// interface AuthProviderProps {
//   children: ReactNode;
// }

// export const AuthProvider = ({ children }: AuthProviderProps) => {
//   const [user, setUser] = useState<User | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     // Khôi phục user từ localStorage (nếu có)
//     const savedUser = localStorage.getItem('user');
//     if (savedUser) {
//       try {
//         setUser(JSON.parse(savedUser));
//       } catch {
//         localStorage.removeItem('user');
//       }
//     }
//     setLoading(false);
//   }, []);

//   const login = async (email: string, password: string): Promise<boolean> => {
//     // Mock (bạn có thể bỏ qua vì Login.tsx đang gọi API thực tế)
//     setLoading(true);
//     try {
//       await new Promise(resolve => setTimeout(resolve, 300));
//       if (email === 'admin@example.com' && password === 'password') {
//         const userData: User = {
//           id: '1',
//           email,
//           name: 'Admin User',
//           avatar: 'https://github.com/shadcn.png'
//         };
//         setUser(userData);
//         localStorage.setItem('user', JSON.stringify(userData));
//         return true;
//       }
//       return false;
//     } finally {
//       setLoading(false);
//     }
//   };

//   const register = async (name: string, email: string, password: string): Promise<boolean> => {
//     // Mock (bạn có thể bỏ qua vì Register.tsx của bạn sẽ gọi API thực tế)
//     setLoading(true);
//     try {
//       await new Promise(resolve => setTimeout(resolve, 300));
//       const userData: User = {
//         id: Date.now().toString(),
//         email,
//         name,
//         avatar: 'https://github.com/shadcn.png'
//       };
//       setUser(userData);
//       localStorage.setItem('user', JSON.stringify(userData));
//       return true;
//     } finally {
//       setLoading(false);
//     }
//   };

//   const logout = () => {
//     // XÓA HẾT AT/RT/USER + điều hướng về /login
//     setUser(null);
//     httpLogout('user clicked logout');
//   };

//   const value: AuthContextType = {
//     user,
//     login,
//     register,
//     logout,
//     loading
//   };

//   return (
//     <AuthContext.Provider value={value}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { logout as httpLogout } from "@/api/http";

// ⬇️ Thêm 2 import này
import { setCurrentUserId, getCurrentUserId } from "@/lib/user-storage";
import { migrateGuestExpensesOnce } from "@/lib/migrations";

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Khôi phục user từ localStorage và đồng bộ userId cho toàn app
  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      if (saved) {
        const parsed: User = JSON.parse(saved);
        setUser(parsed);
        setCurrentUserId(parsed.id);        // ✅ set uid thật
        migrateGuestExpensesOnce();         // ✅ chuyển dữ liệu guest -> uid
      } else {
        setCurrentUserId("guest");          // ✅ chưa đăng nhập
      }
    } catch {
      localStorage.removeItem("user");
      setCurrentUserId("guest");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock (giữ nguyên logic demo)
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (email === "admin@example.com" && password === "password") {
        const userData: User = {
          id: "1",
          email,
          name: "Admin User",
          avatar: "https://github.com/shadcn.png",
        };
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        setCurrentUserId(userData.id);      // ✅ set uid thật
        migrateGuestExpensesOnce();         // ✅ chuyển dữ liệu guest -> uid
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    // Mock (giữ nguyên logic demo)
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const userData: User = {
        id: Date.now().toString(),
        email,
        name,
        avatar: "https://github.com/shadcn.png",
      };
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      setCurrentUserId(userData.id);        // ✅ set uid thật
      migrateGuestExpensesOnce();           // ✅ chuyển dữ liệu guest -> uid
      return true;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Xoá user, set uid về guest, gọi API logout
    setUser(null);
    localStorage.removeItem("user");
    setCurrentUserId("guest");              // ✅ quay về guest để tránh ghi nhầm
    httpLogout("user clicked logout");
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
