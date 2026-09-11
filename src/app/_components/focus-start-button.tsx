"use client";

export function FocusStartButton() {
  return (
    <button
      type="button"
      className="kv-btn"
      style={{ marginTop: 32 }}
      onClick={() => {
        window.dispatchEvent(new CustomEvent("focus:open"));
      }}
    >
      Start Focus Session
    </button>
  );
}
