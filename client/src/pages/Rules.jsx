import React from 'react';
import { Link } from 'react-router-dom';

export default function Rules() {
  return (
    <div className="container">
      <article className="card">
        <h1>SS Rewards — Program Rules</h1>
        <p className="subtitle">Overview, eligibility, earning & redeeming points, and general terms.</p>

        <h2>A. Overview</h2>
        <p>SS Rewards lets members earn points on qualifying orders and redeem them for selected menu items.</p>

        <h2>B. Participation</h2>
        <ul>
          <li>One SS profile per person; verification may be required.</li>
          <li>By participating, you agree to these Rules and our Privacy Policy.</li>
        </ul>

        <h2>C. Earning Points</h2>
        <ul>
          <li>Qualifying orders earn points; occasional bonus offers may apply.</li>
          <li>Points have no cash value and are non-transferable.</li>
        </ul>

        <h2>D. Redeeming Points</h2>
        <ul>
          <li>Redeem points online for eligible items displayed in your account.</li>
          <li>Taxes/fees/delivery/gratuities are the member’s responsibility.</li>
        </ul>

        <h2>E. Inactivity & Changes</h2>
        <ul>
          <li>Prolonged inactivity may forfeit points.</li>
          <li>SS may update or terminate the Program; continued use = acceptance.</li>
        </ul>

        <p className="footer-nav"><Link to="/">Back to Registration</Link></p>
      </article>
    </div>
  );
}
