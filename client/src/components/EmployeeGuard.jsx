// client/src/components/EmployeeGuard.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function EmployeeGuard({ children }) {
  const location = useLocation();

  // Prefer token if you have it, otherwise allow profile-based session
  const token = localStorage.getItem("emp_token");
  const profile = localStorage.getItem("emp_profile");

  const isAuthed = Boolean(token || profile);

  if (!isAuthed) {
    return <Navigate to="/employee-login" replace state={{ from: location }} />;
  }

  return children;
}
