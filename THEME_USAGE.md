# Theme Usage Documentation

## How to Style for Light and Dark Modes

### With CSS Variables (Preferred)

```
.card {
  background: var(--bg-card);
  color: var(--text-primary);
  border-radius: var(--kv-card-border-radius);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: background 0.2s, color 0.2s;
}
```
- **Light mode:** `--bg-card` is white, `--text-primary` is dark.
- **Dark mode:** `--bg-card` is slate/navy, `--text-primary` is white.

### With Tailwind CSS (if enabled)

```
<div className="bg-white text-black dark:bg-slate-900 dark:text-white rounded-xl p-6 transition-colors">
  Card content
</div>
```

### Summary Table for Card Styling

| Mode      | Background CSS Variable      | Text CSS Variable      | Example Tailwind Classes                |
|-----------|-----------------------------|-----------------------|-----------------------------------------|
| Light     | `--bg-card` (white)         | `--text-primary` (dark) | `bg-white text-black`                   |
| Dark      | `--bg-card` (navy/slate)    | `--text-primary` (white) | `dark:bg-slate-900 dark:text-white`     |

---

- Use CSS variables for maximum flexibility and consistency with your current system.
- Use Tailwind's `dark:` classes if you add Tailwind dark mode support.
