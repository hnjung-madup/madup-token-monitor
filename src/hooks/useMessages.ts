import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export interface Message {
  id: string;
  channel: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  body: string;
  image_url: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

export function useMessages(channel: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef(channel);
  channelRef.current = channel;

  useEffect(() => {
    let cancelled = false;

    async function fetchInitial() {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("messages")
        .select("*")
        .eq("channel", channel)
        .order("created_at", { ascending: true })
        .limit(PAGE_SIZE);

      if (!cancelled) {
        if (err) setError(err.message);
        else setMessages((data as Message[]) ?? []);
        setLoading(false);
      }
    }

    fetchInitial();

    const sub = supabase
      .channel(`messages:${channel}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel=eq.${channel}`,
        },
        (payload) => {
          if (!cancelled) {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `channel=eq.${channel}`,
        },
        (payload) => {
          if (!cancelled) {
            setMessages((prev) =>
              prev.filter((m) => m.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(sub);
    };
  }, [channel]);

  async function sendMessage(
    body: string,
    imageUrl?: string
  ): Promise<{ error: string | null }> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { error: "로그인이 필요합니다." };

    const { error: err } = await supabase.from("messages").insert({
      channel,
      user_id: userData.user.id,
      user_email: userData.user.email ?? "",
      user_name:
        userData.user.user_metadata?.full_name ??
        userData.user.user_metadata?.name ??
        null,
      body,
      image_url: imageUrl ?? null,
    });
    return { error: err?.message ?? null };
  }

  async function deleteMessage(id: string): Promise<{ error: string | null }> {
    const { error: err } = await supabase
      .from("messages")
      .delete()
      .eq("id", id);
    return { error: err?.message ?? null };
  }

  return { messages, loading, error, sendMessage, deleteMessage };
}
