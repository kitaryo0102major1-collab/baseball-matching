'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="w-full border border-[var(--line)] text-[var(--ink-sub)] font-semibold py-3 rounded-xl text-sm hover:text-[#A32D2D] hover:border-[#A32D2D]/40 disabled:opacity-60 transition-colors"
    >
      {loading ? 'ログアウト中...' : 'ログアウト'}
    </button>
  )
}
