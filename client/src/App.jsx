import { Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import Rules from './pages/Rules';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Register />} />
      <Route path="/rules" element={<Rules />} />
      {/* placeholders (optional) */}
      {/* <Route path="/about" element={<div>About</div>} /> */}
      {/* <Route path="/dashboard" element={<div>Dashboard</div>} /> */}
    </Routes>
  );
}
