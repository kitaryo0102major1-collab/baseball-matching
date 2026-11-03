import { supabase } from '@/lib/supabase'
import { getPostPermissions } from '@/lib/postPermissions'
import type { MatchPost } from '@/lib/types'
import PostForm from '@/components/PostForm'
import { notFound, redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditPostPage({ params }: Props) {
  const { id } = await params
  const { data, error } = await supabase.from('match_posts').select('*').eq('id', id).single()

  if (error || !data) notFound()

  const post = data as MatchPost
  const { canEdit } = await getPostPermissions(post)
  if (!canEdit) redirect(`/posts/${post.id}`)

  return <PostForm mode="edit" initialPost={post} />
}
