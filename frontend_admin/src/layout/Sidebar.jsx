import { Link } from "react-router-dom";

const menus = [
  { name: "Dashboard", icon: "📊", path: "/" },
  { name: "Lines", icon: "👥", path: "/lines" },
  { name: "Logs", icon: "📜", path: "/logs" },
  { name: "RAG_Ingestion", icon: "⚙️", path: "/rag-Ingestion" },
];

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 w-64 h-screen bg-slate-900 text-white p-6">
      <h1 className="text-xl font-bold mb-6">Admin</h1>

      <ul className="space-y-2">
        {menus.map((menu) => (
          <li key={menu.name}>
            <Link
              to={menu.path}
              className="flex items-center gap-3 p-3 rounded hover:bg-gray-700 transition"
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
