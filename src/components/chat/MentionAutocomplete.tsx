// MVP에서는 @멘션 자동완성을 간단하게 구현합니다.
// 실제 팀원 목록은 Supabase auth.users에서 가져옵니다.
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

interface User {
  id: string;
  email: string;
  name: string;
}

interface Props {
  query: string;
  onSelect: (user: User) => void;
  onClose: () => void;
}

export function MentionAutocomplete({ query, onSelect, onClose }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchUsers() {
      // Requires a public profiles view or RPC — gracefully degrades if not set up
      const { data } = await supabase
        .from("profiles")
        .select("id, email, name")
        .ilike("name", `%${query}%`)
        .limit(5);
      setUsers((data as User[]) ?? []);
      setSelected(0);
    }
    fetchUsers();
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        setSelected((s) => Math.min(s + 1, users.length - 1));
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        setSelected((s) => Math.max(s - 1, 0));
        e.preventDefault();
      } else if (e.key === "Enter") {
        if (users[selected]) onSelect(users[selected]);
        e.preventDefault();
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [users, selected, onSelect, onClose]);

  if (users.length === 0) return null;

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 min-w-48"
    >
      {users.map((u, i) => (
        <button
          key={u.id}
          type="button"
          onClick={() => onSelect(u)}
          className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
            i === selected ? "bg-blue-50" : ""
          }`}
        >
          <span className="font-medium">{u.name}</span>
          <span className="text-gray-400 ml-1 text-xs">{u.email}</span>
        </button>
      ))}
    </div>
  );
}
