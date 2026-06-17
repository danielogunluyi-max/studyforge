import { describe, it, expect, vi, beforeEach } from "vitest";

// Each test needs a fresh module to reset the listeners array
let onToast: typeof import("./toast").onToast;
let toast: typeof import("./toast").toast;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("./toast");
  onToast = mod.onToast;
  toast = mod.toast;
});

describe("toast emitter", () => {
  it("emits success events to listeners", () => {
    const listener = vi.fn();
    onToast(listener);
    toast.success("Saved!");
    expect(listener).toHaveBeenCalledWith({
      message: "Saved!",
      type: "success",
    });
  });

  it("emits error events", () => {
    const listener = vi.fn();
    onToast(listener);
    toast.error("Failed!");
    expect(listener).toHaveBeenCalledWith({
      message: "Failed!",
      type: "error",
    });
  });

  it("emits info events", () => {
    const listener = vi.fn();
    onToast(listener);
    toast.info("FYI");
    expect(listener).toHaveBeenCalledWith({ message: "FYI", type: "info" });
  });

  it("emits achievement events with default emoji", () => {
    const listener = vi.fn();
    onToast(listener);
    toast.achievement("Level up!");
    expect(listener).toHaveBeenCalledWith({
      message: "Level up!",
      type: "achievement",
      emoji: "\u{1F3C6}",
    });
  });

  it("emits achievement events with custom emoji", () => {
    const listener = vi.fn();
    onToast(listener);
    toast.achievement("Win!", "\u{1F389}");
    expect(listener).toHaveBeenCalledWith({
      message: "Win!",
      type: "achievement",
      emoji: "\u{1F389}",
    });
  });

  it("supports multiple listeners", () => {
    const a = vi.fn();
    const b = vi.fn();
    onToast(a);
    onToast(b);
    toast.info("hi");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes correctly", () => {
    const listener = vi.fn();
    const unsub = onToast(listener);
    unsub();
    toast.info("ignored");
    expect(listener).not.toHaveBeenCalled();
  });
});
