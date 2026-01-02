// src/App.js
import { Routes, Route, Link, Navigate } from "react-router-dom";

import Register from "./pages/Register";
import Rules from "./pages/Rules";
import Login from "./pages/login";
import Home from "./pages/home";

import RegisterEmployee from "./pages/employee/RegisterEmployee";
import EmployeeLogin from "./pages/employee/EmployeeLogin";

import OwnerLogin from "./pages/OwnerLogin";
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerEmployees from "./pages/OwnerEmployees";

import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import EmployeeWeeklyTimesheet from "./pages/employee/EmployeeWeeklyTimesheet";
import EmployeeLeaveRequests from "./pages/employee/EmployeeLeaveRequests";
import EmployeeShifts from "./pages/employee/EmployeeShifts";
import EmployeeAnnouncements from "./pages/employee/EmployeeAnnouncements";
import EmployeeChat from "./pages/employee/EmployeeChat";
import EmployeeProfile from "./pages/employee/EmployeeProfile";

import EmployeeGuard from "./components/EmployeeGuard";

import OwnerWeeklyTimesheets from "./pages/OwnerWeeklyTimesheets";
import OwnerLeaveRequests from "./pages/OwnerLeaveRequests";
import OwnerShifts from "./pages/OwnerShifts";
import OwnerAnnouncements from "./pages/OwnerAnnouncements";
import OwnerMenu from "./pages/OwnerMenu";
import OwnerReports from "./pages/OwnerReports";

import KitchenOrders from "./pages/KitchenOrders";
import HostOrders from "./pages/HostOrders";
import Checkout from "./pages/Checkout";

import OrderHelp from "./pages/OrderHelp";
import DeliveryPartner from "./pages/DeliveryPartner";
import Receipt from "./pages/receipt";
import OwnerChat from "./pages/OwnerChat";
import OwnerManageEmployees from "./pages/OwnerManageEmployees";
import OwnerSettings from "./pages/OwnerSettings";
//import EmployeeProfile from "./pages/employee/EmployeeProfile";
import EmployeeSettings from "./pages/employee/EmployeeSettings";

const Placeholder = ({ title }) => (
  <div className="container">
    <div className="card">
      <h1>{title}</h1>
      <p className="subtitle">This page will be built later.</p>

      <div className="footer-nav">
        <Link to="/">Home</Link>
        <Link to="/register">Register</Link>
        <Link to="/about">About</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/rules">Rules</Link>
        <Link to="/login">Login</Link>

        <Link to="/register-employee">RegisterEmployee</Link>
        <Link to="/employee-login">EmployeeLogin</Link>

        <Link to="/owner-login">OwnerLogin</Link>
        <Link to="/owner-dashboard">OwnerDashboard</Link>
        <Link to="/owner-employees">OwnerEmployees</Link>

        <Link to="/owner/timesheets">OwnerTimesheets</Link>
        <Link to="/owner/leave-requests">OwnerLeaveRequests</Link>
        <Link to="/owner/shifts">OwnerShifts</Link>
        <Link to="/owner/announcements">OwnerAnnouncements</Link>
        <Link to="/owner/menu">OwnerMenu</Link>
        <Link to="/owner/reports">OwnerReports</Link>

        <Link to="/employee-dashboard">EmployeeDashboard</Link>
        <Link to="/employee/timesheets">EmployeeTimesheets</Link>
        <Link to="/employee/leave-requests">EmployeeLeaveRequests</Link>
        <Link to="/employee/shifts">EmployeeShifts</Link>
        <Link to="/employee/announcements">EmployeeAnnouncements</Link>
        <Link to="/employee/chat">EmployeeChat</Link>
        <Link to="/employee/profile">EmployeeProfile</Link>

        <Link to="/kitchen-orders">KitchenOrders</Link>
        <Link to="/host-orders">HostOrders</Link>
        <Link to="/checkout">Checkout</Link>
        <Link to="/order-help">OrderHelp</Link>
        <Link to="/delivery-partner">DeliveryPartner</Link>
        <Link to="/Receipt">Receipt</Link>
        <Link to="/owner/chat">OwnerChat</Link>
        <Link to="/owner/manage-employees">OwnerManageEmployees</Link>
        <Link to="/owner/settings">OwnerSettings</Link>
        <Link to="/employee/settings">EmployeeSettings</Link>
        
      </div>
    </div>
  </div>
);

export default function App() {
  return (
    <Routes>
      {/* public */}
      <Route path="/" element={<Home />} />
      {/* ✅ FIX: /home is used by Checkout navigation */}
      <Route path="/home" element={<Home />} />

      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/rules" element={<Rules />} />

      {/* placeholder pages */}
      <Route path="/about" element={<Placeholder title="About SS" />} />
      <Route path="/dashboard" element={<Placeholder title="Dashboard" />} />

      {/* employee auth */}
      <Route path="/register-employee" element={<RegisterEmployee />} />
      <Route path="/employee-login" element={<EmployeeLogin />} />

      {/* owner auth + main */}
      <Route path="/owner-login" element={<OwnerLogin />} />
      <Route path="/owner-dashboard" element={<OwnerDashboard />} />
      <Route path="/owner-employees" element={<OwnerEmployees />} />

      {/* checkout */}
      <Route path="/checkout" element={<Checkout />} />

      {/* ✅ Owner feature routes */}
      <Route path="/owner/timesheets" element={<OwnerWeeklyTimesheets />} />
      <Route path="/owner/leave-requests" element={<OwnerLeaveRequests />} />
      <Route path="/owner/shifts" element={<OwnerShifts />} />
      <Route path="/owner/announcements" element={<OwnerAnnouncements />} />
      <Route path="/owner/menu" element={<OwnerMenu />} />
      <Route path="/owner/reports" element={<OwnerReports />} />
      <Route path="/kitchen-orders" element={<KitchenOrders />} />
      <Route path="/host-orders" element={<HostOrders />} />
      <Route path="/order-help" element={<OrderHelp />} />
      <Route path="/delivery-partner" element={<DeliveryPartner />} />
      <Route path="/receipt" element={<Receipt />} />
      <Route path="/owner/chat" element={<OwnerChat />} />
      <Route path="/owner/manage-employees" element={<OwnerManageEmployees />} />
      <Route path="/owner/settings" element={<OwnerSettings />} />
      <Route path="/employee/settings" element={<EmployeeSettings />} />
      
      {/* ✅ Employee protected routes */}
      <Route
        path="/employee-dashboard"
        element={
          <EmployeeGuard>
            <EmployeeDashboard />
          </EmployeeGuard>
        }
      />
      <Route path="/employee/weekly-timesheet" element={<EmployeeWeeklyTimesheet />} />

      <Route
        path="/employee/leave-requests"
        element={
          <EmployeeGuard>
            <EmployeeLeaveRequests />
          </EmployeeGuard>
        }
      />
      <Route
        path="/employee/shifts"
        element={
          <EmployeeGuard>
            <EmployeeShifts />
          </EmployeeGuard>
        }
      />
      <Route
        path="/employee/announcements"
        element={
          <EmployeeGuard>
            <EmployeeAnnouncements />
          </EmployeeGuard>
        }
      />
      <Route
        path="/employee/chat"
        element={
          <EmployeeGuard>
            <EmployeeChat />
          </EmployeeGuard>
        }
      />
      <Route
        path="/employee/profile"
        element={
          <EmployeeGuard>
            <EmployeeProfile />
          </EmployeeGuard>
        }
      />

      {/* ✅ fallback */}
      <Route path="*" element={<Navigate to="/home?mode=pickup" replace />} />
    </Routes>
  );
}
