import Link from "next/link";

function KMark() {
  return <span className="k-mark">K</span>;
}

export function FooterCTA() {
  return null;
}

export function Footer() {
  return (
    <footer className="site-footer">
      <Link href="/" className="brand">
        <KMark />
        <span>kyvex</span>
      </Link>
      <span>inbox → notes → cards → mock → nova</span>
      <span>© 2026 kyvex</span>
    </footer>
  );
}
