import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";

const HIDE_NAV_ROUTES = ["/onboarding", "/login", "/register", "/forgot-password", "/reset-password"];

export default function Layout() {
  const { pathname } = useLocation();
  const hideNav = HIDE_NAV_ROUTES.some((r) => pathname.startsWith(r));
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className={`mx-auto max-w-md ${hideNav ? "" : "pb-20"}`}>
        <Outlet />
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}