import React, { useEffect } from "react";

export default function EmployeeApplicationModal({
  employee,
  onClose,
  onDecision,
  loading = false,
}) {
  useEffect(() => {
    if (!employee) return;

    const onEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [employee, onClose]);

  if (!employee) return null;

  const joined = employee.date ? new Date(employee.date).toLocaleDateString() : "";

  return (
    <div
      className="owner-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Employee application review"
      onMouseDown={(e) => {
        // click outside closes
        if (e.target.classList.contains("owner-modal")) onClose?.();
      }}
    >
      <div className="owner-modal-content owner-modal-wide">
        <button className="owner-modal-x" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <h2 className="owner-modal-title">Employee Application</h2>

        <div className="owner-modal-grid">
          <div>
            <b>Name:</b> {employee.name}
          </div>
          <div>
            <b>Employee ID:</b> {employee.employeeId}
          </div>
          <div>
            <b>Email:</b> {employee.email}
          </div>
          <div>
            <b>Mobile:</b> {employee.mobile}
          </div>
          <div>
            <b>Role:</b> {employee.role}
          </div>
          <div>
            <b>Section:</b> {employee.section}
          </div>
          <div>
            <b>Aadhar:</b> {employee.aadharNo || "—"}
          </div>
          <div>
            <b>Date Joined:</b> {joined || "—"}
          </div>
          <div className="owner-modal-span">
            <b>Address:</b> {employee.address || "—"}
          </div>
        </div>

        <div className="owner-modal-block">
          <div className="owner-modal-block-title">Duties</div>
          <div className="owner-modal-block-text">{employee.duties || "—"}</div>
        </div>

        <div className="owner-modal-actions">
          <button
            className="btn btn-small btn-danger"
            disabled={loading}
            onClick={() => onDecision(employee._id, "Rejected")}
          >
            {loading ? "Working…" : "Reject"}
          </button>

          <button
            className="btn btn-small btn-primary"
            disabled={loading}
            onClick={() => onDecision(employee._id, "Accepted")}
          >
            {loading ? "Working…" : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}
