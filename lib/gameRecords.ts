'use client'

// 試合の記録（打順・交代・打席・走者の動き・相手の打順）を端末（localStorage）に保存し、裏でサーバーへ送る。
// 打席入力と打順・交代の画面が同じ記録を使う。電波がなくても入力を続けられ、つながったら自動で送り直す。
// 送るときは記録を丸ごと送る（ゲストは save_guest_game、チームは lib/recordSenders.ts）。後から送った方が勝つ。
import { useCallback, useEffect, useRef, useState } from 'react'
import type { LineupRow } from './lineup'
import type { PlateAppearance, RunnerEvent } from './scoring/types'

export interface GameRecords {
  lineups: LineupRow[]
  pas: PlateAppearance[]
  events: RunnerEvent[]
  opponentLineup: string[]
}

interface Draft {
  records: GameRecords
  // 最後にサーバーと合わせたときの games.updated_at（ほかの端末の保存に気づくため）
  baseUpdatedAt: string | null
  // まだ送っていない変更の数
  pending: number
  savedAt: string
  // 電波がなくても画面を開けるように、試合情報など画面に必要なものも残す（ゲスト）
  meta?: unknown
}

const KEY = (gameId: string) => `score_draft:${gameId}`

export function readDraft(gameId: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(KEY(gameId))
    if (!raw) return null
    const d = JSON.parse(raw) as Draft
    if (!d?.records || !Array.isArray(d.records.pas) || !Array.isArray(d.records.events) || !Array.isArray(d.records.lineups)) return null
    return { ...d, records: { ...d.records, opponentLineup: d.records.opponentLineup ?? [] } }
  } catch {
    return null
  }
}

function writeDraft(gameId: string, draft: Draft) {
  try {
    window.localStorage.setItem(KEY(gameId), JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

// 試合情報の画面などで games を保存したあと、ほかの端末の保存と取り違えないように基準を進める
export function rebaseDraft(gameId: string, updatedAt: string) {
  const d = readDraft(gameId)
  if (d) writeDraft(gameId, { ...d, baseUpdatedAt: updatedAt })
}

export function hasPendingDraft(gameId: string) {
  return (readDraft(gameId)?.pending ?? 0) > 0
}

export type SendResult = { updatedAt: string; conflict: boolean }
export type Sender = (records: GameRecords, expectedUpdatedAt: string | null) => Promise<SendResult>

export type SyncState = 'saved' | 'pending' | 'error'

const RETRY_MS = 15000

interface Options {
  gameId: string
  // サーバーから読んだ記録と、そのときの games.updated_at
  server: GameRecords
  serverUpdatedAt: string | null
  send: Sender
  meta?: unknown
}

export function useGameRecords({ gameId, server, serverUpdatedAt, send, meta }: Options) {
  // 端末の記録を読むまでは表示しない（サーバーの古い記録を一瞬見せないため）
  const [ready, setReady] = useState(false)
  const [records, setRecords] = useState<GameRecords>(server)
  const [pending, setPending] = useState(0)
  const [syncState, setSyncState] = useState<SyncState>('saved')
  const [conflict, setConflict] = useState(false)

  const recordsRef = useRef(records)
  const pendingRef = useRef(0)
  const baseRef = useRef<string | null>(serverUpdatedAt)
  const syncingRef = useRef(false)
  const againRef = useRef(false)
  const sendRef = useRef(send)
  sendRef.current = send
  const metaRef = useRef(meta)
  metaRef.current = meta

  const persist = useCallback(() => {
    writeDraft(gameId, {
      records: recordsRef.current,
      baseUpdatedAt: baseRef.current,
      pending: pendingRef.current,
      savedAt: new Date().toISOString(),
      meta: metaRef.current,
    })
  }, [gameId])

  const sync = useCallback(async () => {
    if (pendingRef.current === 0) return
    if (syncingRef.current) {
      againRef.current = true
      return
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSyncState('pending')
      return
    }
    syncingRef.current = true
    const sentPending = pendingRef.current
    try {
      const result = await sendRef.current(recordsRef.current, baseRef.current)
      baseRef.current = result.updatedAt
      pendingRef.current = Math.max(0, pendingRef.current - sentPending)
      setPending(pendingRef.current)
      if (result.conflict) setConflict(true)
      setSyncState(pendingRef.current > 0 ? 'pending' : 'saved')
      persist()
    } catch {
      setSyncState('error')
    } finally {
      syncingRef.current = false
    }
    if (againRef.current || pendingRef.current > 0) {
      againRef.current = false
      if (pendingRef.current > 0) void sync()
    }
  }, [persist])

  // 画面を開いたとき: 送っていない端末の記録があれば、そちらを優先して表示し、送り直す
  useEffect(() => {
    const draft = readDraft(gameId)
    if (draft && draft.pending > 0) {
      recordsRef.current = draft.records
      pendingRef.current = draft.pending
      baseRef.current = draft.baseUpdatedAt ?? serverUpdatedAt
      setRecords(draft.records)
      setPending(draft.pending)
      setSyncState('pending')
      setReady(true)
      void sync()
    } else {
      recordsRef.current = server
      baseRef.current = serverUpdatedAt
      persist()
      setReady(true)
    }
    // 画面を開いたときだけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  // つながったとき・画面に戻ったとき・定期的に送り直す
  useEffect(() => {
    const retry = () => void sync()
    const onVisible = () => document.visibilityState === 'visible' && retry()
    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(() => pendingRef.current > 0 && retry(), RETRY_MS)
    return () => {
      window.removeEventListener('online', retry)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [sync])

  // 記録を変える。端末にはすぐ保存し、サーバーへは裏で送る（入力は待たせない）
  const commit = useCallback(
    (next: Partial<GameRecords>) => {
      recordsRef.current = { ...recordsRef.current, ...next }
      pendingRef.current += 1
      setRecords(recordsRef.current)
      setPending(pendingRef.current)
      setSyncState('pending')
      persist()
      void sync()
    },
    [persist, sync]
  )

  return { ready, records, commit, pending, syncState, conflict, dismissConflict: () => setConflict(false) }
}
