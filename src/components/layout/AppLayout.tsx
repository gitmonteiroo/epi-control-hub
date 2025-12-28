import { useState, useCallback } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { BottomNavigation } from "./BottomNavigation";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={handleMenuClick} />
      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={handleSidebarClose} />
        <main className="min-h-[calc(100vh-3.5rem)] w-full flex-1 p-3 pb-20 sm:min-h-[calc(100vh-4rem)] sm:p-4 sm:pb-4 lg:ml-64 lg:p-6 lg:pb-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
      {/* Bottom navigation for mobile */}
      <BottomNavigation onMoreClick={handleMenuClick} />
    </div>
  );
}
