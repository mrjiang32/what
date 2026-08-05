import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

const menuList = [
  { path: "/", label: "Main Page" },
  { path: "/hooks", label: "Manage Hooks" },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="main-navbar">
      <div className="nav-wrap">
        {menuList.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}