import React from 'react';
import { Navigate } from 'react-router-dom';

export default function RequireOwner({ children }) {
  const token = localStorage.getItem('owner_token');
  return token ? children : <Navigate to="/owner-login" replace />;
}
