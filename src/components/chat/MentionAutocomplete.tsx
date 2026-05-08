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
      className="absolute bottom-full left-0 mb-1 bg-canvas border border-hairline rounded-md shadow-[0_8px_24px_rgba(26,26,26,0.12)] overflow-hidden z-50 min-w-52"
    >
      {users.map((u, i) => (
        <button
          key={u.id}
          type="button"
          onClick={() => onSelect(u)}
          className={`w-full text-left px-4 py-2.5 text-[14px] transition-colors ${
            i === selected ? "bg-cloud" : "hover:bg-cloud"
          }`}
        >
          <span className="font-semibold text-ink">{u.name}</span>
          <span className="text-graphite ml-2 text-[12px]">{u.email}</span>
        </button>
      ))}
    </div>
  );
}
