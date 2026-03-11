import { Link } from "react-router-dom";

const menus = [
  { name: "Dashboard", icon: "📊", path: "/" },
  { name: "Lines", icon: "👥", path: "/lines" },
  { name: "Logs", icon: "📜", path: "/logs" },
  { name: "Stats", icon: "⚙️", path: "/stats" },
  { name: "RAG_Ingestion", icon: "⚙️", path: "/rag-Ingestion" },
];

function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white p-4 min-h-screen hidden md:flex flex-col">
      <h1 className="text-xl font-bold mb-6">Admin</h1>

      <ul className="space-y-2">
        {menus.map((menu) => (
          <li key={menu.name}>
            <Link
              to={menu.path}
              className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition"
            >
              <span className="text-lg">{menu.icon}</span>
              <span>{menu.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default Sidebar;
