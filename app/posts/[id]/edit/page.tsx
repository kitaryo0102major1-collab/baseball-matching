import { supabase } from '@/lib/supabase'
import { getPostPermissions } from '@/lib/postPermissions'
import { pageMetadata } from '@/lib/seo'
import type { MatchPost } from '@/lib/types'
import PostForm from '@/components/PostForm'
import { notFound, redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return pageMetadata({ title: '募集内容を修正する', path: `/posts/${id}/edit`, noindex: true })
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
