"use client";

export function FocusStartButton() {
  return (
    <button
      className="btn btn-primary btn-xl"
      style={{ marginTop: "32px" }}
      onClick={() => {
        window.dispatchEvent(new CustomEvent("focus:open"));
      }}
    >
      🎯 Start Focus Session
    </button>
  );
}
