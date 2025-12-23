import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import ProductForm from "./pages/ProductForm";
import Categories from "./pages/Categories";
import Employees from "./pages/Employees";
import Withdrawals from "./pages/Withdrawals";
import Movements from "./pages/Movements";
import Reports from "./pages/Reports";
import EmployeeEpiReport from "./pages/EmployeeEpiReport";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <SettingsProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                <Route path="/products/new" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
                <Route path="/products/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
                <Route path="/products/:id/edit" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
                <Route path="/categories" element={<ProtectedRoute adminOnly><Categories /></ProtectedRoute>} />
                <Route path="/employees" element={<ProtectedRoute adminOnly><Employees /></ProtectedRoute>} />
                <Route path="/withdrawals" element={<ProtectedRoute><Withdrawals /></ProtectedRoute>} />
                <Route path="/movements" element={<ProtectedRoute><Movements /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/reports/employee-epi" element={<ProtectedRoute><EmployeeEpiReport /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SettingsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
