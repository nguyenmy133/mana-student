// src/App.tsx
import { useEffect, useState } from "react";
// ❌ Bỏ shadcn toaster nếu file này đã wrap sonner bên trong
// import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Layout } from "./components/layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import { Dashboard } from "./pages/Dashboard";
import { Schedule } from "./pages/Schedule";
import { Tasks } from "./pages/Tasks";
import Expenses from "./pages/Expenses";
import { ChatAI } from "./pages/ChatAI";
import { Profile } from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import { ensureAuthOnBoot } from "@/api/http";
import AuthSync from "./pages/AuthSync";

const queryClient = new QueryClient();

const App = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => { ensureAuthOnBoot().finally(() => setReady(true)); }, []);

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
      Đang chuẩn bị phiên đăng nhập…
    </div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthSync />
          <AuthProvider>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              {/* Protected */}
              <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
              <Route path="/schedule"  element={<ProtectedRoute><Layout><Schedule /></Layout></ProtectedRoute>} />
              <Route path="/tasks"     element={<ProtectedRoute><Layout><Tasks /></Layout></ProtectedRoute>} />
              <Route path="/expenses"  element={<ProtectedRoute><Layout><Expenses /></Layout></ProtectedRoute>} />
              <Route path="/chat-ai"   element={<ProtectedRoute><Layout><ChatAI /></Layout></ProtectedRoute>} />
              <Route path="/profile"   element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
             
            </Routes>
            {/* Chỉ 1 Toaster */}
            <Sonner richColors position="top-right" />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
