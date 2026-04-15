"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";

const LS_KEY = "today-todos";

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

export default function TodoList() {
  const { t }    = useLanguage();
  const { user } = useAuth();

  const [todos,   setTodos]   = useState<Todo[]>([]);
  const [input,   setInput]   = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); load(); }, [user?.id]);

  async function load() {
    if (user) {
      const { data } = await supabase
        .from("todos")
        .select("id, text, done")
        .eq("user_id", user.id)
        .order("created_at");
      if (data) setTodos(data as Todo[]);
    } else {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) setTodos(JSON.parse(raw));
      } catch {}
    }
  }

  function syncLS(next: Todo[]) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  }

  async function addTodo() {
    if (!input.trim()) return;
    const todo: Todo = { id: crypto.randomUUID(), text: input.trim(), done: false };
    if (user) {
      const { data } = await supabase
        .from("todos")
        .insert({ user_id: user.id, text: todo.text, done: false })
        .select("id")
        .single();
      if (data?.id) todo.id = data.id;
    }
    const next = [...todos, todo];
    setTodos(next);
    if (!user) syncLS(next);
    setInput("");
  }

  async function toggleTodo(id: string) {
    const next = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    if (user) {
      const updated = next.find(t => t.id === id);
      await supabase.from("todos").update({ done: updated?.done }).eq("id", id);
    }
    setTodos(next);
    if (!user) syncLS(next);
  }

  async function deleteTodo(id: string) {
    if (user) await supabase.from("todos").delete().eq("id", id);
    const next = todos.filter(t => t.id !== id);
    setTodos(next);
    if (!user) syncLS(next);
  }

  async function clearCompleted() {
    const ids = todos.filter(t => t.done).map(t => t.id);
    if (!ids.length) return;
    if (user) await supabase.from("todos").delete().in("id", ids);
    const next = todos.filter(t => !t.done);
    setTodos(next);
    if (!user) syncLS(next);
  }

  const pending  = todos.filter(t => !t.done);
  const done     = todos.filter(t => t.done);

  return (
    <div className="card p-6 flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span style={{ color: "var(--c-accent)" }}><ListIcon /></span>
          <h2 className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--c-text2)" }}>
            {t("todo.title")}
          </h2>
        </div>
        {mounted && todos.length > 0 && (
          <span className="text-xs" style={{ color: "var(--c-text3)" }}>
            {t("todo.count", { done: done.length, total: todos.length })}
          </span>
        )}
      </div>

      {/* List */}
      {mounted && (
        <div className="flex flex-col gap-1.5 flex-1">
          {todos.length === 0 && (
            <p className="text-sm" style={{ color: "var(--c-text3)" }}>{t("todo.empty")}</p>
          )}

          {/* Pending */}
          {pending.map(todo => (
            <div
              key={todo.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: "var(--c-item)" }}
            >
              <button
                onClick={() => toggleTodo(todo.id)}
                className="w-5 h-5 rounded-full border-2 flex-shrink-0 check-empty cursor-pointer"
                aria-label={t("todo.markDone")}
              />
              <span className="text-sm flex-1 min-w-0" style={{ color: "var(--c-text1)" }}>
                {todo.text}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="trash-btn cursor-pointer shrink-0"
                aria-label={t("todo.delete")}
              >
                <TrashIcon />
              </button>
            </div>
          ))}

          {/* Divider + done items */}
          {done.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1" style={{ borderTop: "1px solid var(--c-divider)", paddingTop: "0.5rem" }}>
              {done.map(todo => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ backgroundColor: "var(--c-done-bg)" }}
                >
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center cursor-pointer"
                    style={{ backgroundColor: "var(--c-check)", border: "none", flexShrink: 0 }}
                    aria-label={t("todo.markUndone")}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <span className="text-sm flex-1 min-w-0 line-through" style={{ color: "var(--c-text3)" }}>
                    {todo.text}
                  </span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="trash-btn cursor-pointer shrink-0"
                    aria-label={t("todo.delete")}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}

              <button
                onClick={clearCompleted}
                className="text-xs self-end cursor-pointer transition-colors"
                style={{ color: "var(--c-text3)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--c-accent)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--c-text3)")}
              >
                {t("todo.clearDone")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      <form onSubmit={e => { e.preventDefault(); addTodo(); }} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t("todo.placeholder")}
          className="th-input flex-1 text-sm rounded-lg px-3 py-2"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="th-btn text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer disabled:opacity-40"
        >
          {t("todo.add")}
        </button>
      </form>
    </div>
  );
}
