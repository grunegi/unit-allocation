"use client";

import { createContext, useContext, useState, useEffect } from "react";
import {
  getAdminPassword,
  updateAdminPassword,
} from "../Js/actions";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("5041");
  const [passwordLoaded, setPasswordLoaded] = useState(false);

  // لود رمز از دیتابیس
  useEffect(() => {
    getAdminPassword().then((result) => {
      if (result.ok) {
        setCurrentPassword(result.password);
      }
      setPasswordLoaded(true);
    });
  }, []);

  function login(inputPassword) {
    if (!passwordLoaded) {
      return { ok: false, error: "سیستم در حال بارگذاری است. لطفاً دوباره امتحان کنید." };
    }

    if (inputPassword === currentPassword) {
      setIsLoggedIn(true);
      return { ok: true };
    }

    return { ok: false, error: "رمز عبور اشتباه است." };
  }

  function logout() {
    setIsLoggedIn(false);
  }

  async function changePassword(newPassword) {
    const result = await updateAdminPassword(newPassword);
    if (!result.ok) {
      return result;
    }
    setCurrentPassword(newPassword);
    return { ok: true };
  }

  const value = {
    isLoggedIn,
    currentPassword,
    passwordLoaded,
    login,
    logout,
    changePassword,
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