'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function AdminPanoramasPage() {
  const [user, setUser] = useState<any>(null)
  const [ranking, setRanking] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u || u.role !== 'admin') { router.push('/'); return }
    setUser(u)
    loadRanking()
  }, [])

  async function loadRanking() {
    const [{ data: attrs }, { data: votes }] = await Promise.all([
      supabase.from('attractions').select('*'),
      supabase.from('attraction_votes').select('attraction_id'),
    ])

    if (attrs && votes) {
      const counts: Record<string, number> = {}
      votes.forEach(v => { counts[v.attraction_id] = (counts[v.attraction_id] || 0) + 1 })
      const ranked = attrs
        .map(a => ({ ...a, votes: counts[a.id] || 0 }))
        .sort((a, b) => b.votes - a.votes)
      setRanking(ranked)
    }
  }

  const maxVotes = ranking[0]?.votes || 1

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-serif text-wedding-dark">🗺️ Ranking de Panoramas</h1>
          <p className="text-wedding-dark/60 mt-1">Los panoramas más votados por los invitados</p>
        </motion.div>

        <div className="space-y-3">
          {ranking.map((attr, i) => (
            <motion.div
              key={attr.id}
              className="bg-white rounded-2xl p-4 shadow-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="flex items-center gap-4">
                {/* Rank number */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                  i === 0 ? 'bg-yellow-400 text-white' :
                  i === 1 ? 'bg-gray-300 text-white' :
                  i === 2 ? 'bg-orange-400 text-white' :
                  'bg-wedding-sand text-wedding-dark/50'
                }`}>
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-serif text-wedding-dark font-semibold truncate pr-2">{attr.name}</p>
                    <span className="text-sm font-bold text-wedding-coral flex-shrink-0">
                      {attr.votes} {attr.votes === 1 ? 'voto' : 'votos'}
                    </span>
                  </div>
                  {/* Vote bar */}
                  <div className="h-2 bg-wedding-sand rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-wedding-coral to-wedding-gold rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(attr.votes / maxVotes) * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.05 }}
                    />
                  </div>
                  {attr.day_suggestion && (
                    <p className="text-xs text-wedding-dark/50 mt-1">
                      💡 Ideal: {attr.day_suggestion}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Total votes */}
        <motion.div className="mt-6 p-4 bg-white rounded-2xl text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <p className="text-wedding-dark/60 text-sm">
            Total de votos: <span className="font-bold text-wedding-coral">{ranking.reduce((s, a) => s + a.votes, 0)}</span>
          </p>
        </motion.div>
      </div>
    </main>
  )
}
