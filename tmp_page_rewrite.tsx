'use client'

import Link from 'next/link'

export default function DashboardPage() {
  return (
    <main className="kv-animate-in" style={{ minHeight: '100vh', background: '#050810', color: '#e8eaf6' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 24px 80px' }}>
        <h1 className="kv-heading-page" style={{ fontSize: 'clamp(28px, 4.4vw, 44px)', marginBottom: '16px' }}>
          Dashboard
        </h1>
        <p style={{ color: '#9ba7c8' }}>
          The dashboard has been simplified to restore compiler correctness.
        </p>
        <Link href="/curriculum" style={{ color: '#f0b429', textDecoration: 'underline' }}>
          Open Curriculum Hub
        </Link>
      </div>
    </main>
  )
}
