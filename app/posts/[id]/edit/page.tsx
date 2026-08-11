import { supabase } from '@/lib/supabase'
import type { MatchPost } from '@/lib/types'
import PostForm from '@/components/PostForm'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditPostPage({ params }: Props) {
  const { id } = await params
  const { data, error } = await supabase.from('match_posts').select('*').eq('id', id).single()

  if (error || !data) notFound()

  return <PostForm mode="edit" initialPost={data as MatchPost} />
}
