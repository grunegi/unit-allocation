"use client";

import { createContext, useContext, useState, useEffect } from "react";
import {
  loginAdminAction,
  logoutAdminAction,
  getAdminSessionAction,
  getAdminAccessLevelAction,
} from "../Js/adminActions";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const [accessLevel, setAccessLevel] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // در بارگذاری اولیه: session از کوکی + access_level از دیتابیس
  useEffect(() => {
    async function init() {
      try {
        const result = await getAdminSessionAction();

        if (!result.ok || !result.session) {
          setSessionLoading(false);
          return;
        }

        // access_level را از دیتابیس بخوان (نه از کوکی)
        const accessResult = await getAdminAccessLevelAction(result.session.id);

        if (!accessResult.ok) {
          // ادمین حذف/رد شده یا تأییدش نیست → session را پاک کن
          await logoutAdminAction();
          setIsLoggedIn(false);
          setAdminInfo(null);
          setAccessLevel(null);
          return;
        }

        setIsLoggedIn(true);
        setAdminInfo(result.session);
        setAccessLevel(accessResult.access_level);
      } catch (err) {
        console.error("AuthProvider init error:", err);
      } finally {
        setSessionLoading(false);
      }
    }

    init();
  }, []);

  async function login(nationalId, password) {
    const result = await loginAdminAction({ nationalId, password });
    if (!result.ok) {
      return result;
    }
    setIsLoggedIn(true);
    setAdminInfo(result.admin);
    setAccessLevel(result.admin.access_level);
    return { ok: true };
  }

  async function logout() {
    await logoutAdminAction();
    setIsLoggedIn(false);
    setAdminInfo(null);
    setAccessLevel(null);
  }

  // برای تازه‌کردن دسترسی بعد از تغییرات
  async function refreshAccessLevel() {
    if (!adminInfo?.id) return;
    const res = await getAdminAccessLevelAction(adminInfo.id);
    if (res.ok) {
      setAccessLevel(res.access_level);
    } else {
      // اگر دیگر معتبر نیست، خارج شو
      await logoutAdminAction();
      setIsLoggedIn(false);
      setAdminInfo(null);
      setAccessLevel(null);
    }
  }

  const value = {
    isLoggedIn,
    adminInfo,
    accessLevel,
    sessionLoading,
    login,
    logout,
    refreshAccessLevel,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth باید داخل AuthProvider استفاده شود.");
  }
  return context;
}