import { useEffect, useState } from "react";
import { useItemsStore } from "./store";

export default function App() {
  const { items, loading, error, fetchItems, addItem } = useItemsStore();
  const [name, setName] = useState("");

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 640 }}>
      <h1>Base Project</h1>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          await addItem(name.trim());
          setName("");
        }}
        style={{ display: "flex", gap: 8, marginBottom: 16 }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New item name"
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit" disabled={loading}>
          {loading ? "…" : "Add"}
        </button>
      </form>

      {error && (
        <div style={{ color: "crimson", marginBottom: 8 }}>Error: {error}</div>
      )}

      <ul>
        {items.length === 0 && <li>(no items yet)</li>}
        {items.map((i) => (
          <li key={i.id}>{i.name}</li>
        ))}
      </ul>

      <p style={{ marginTop: 24, opacity: 0.7 }}>
        API base:{" "}
        <code>
          {(import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000"}
        </code>
      </p>
    </div>
  );
}
