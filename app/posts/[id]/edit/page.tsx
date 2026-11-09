import { supabase } from '@/lib/supabase'
import { getPostPermissions } from '@/lib/postPermissions'
import { memberVisibility } from '@/lib/postRules'
import { pageMetadata } from '@/lib/seo'
import type { MatchPost } from '@/lib/types'
import PostForm from '@/components/PostForm'
import TeamPostForm from '@/components/TeamPostForm'
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

  if (post.post_type === 'match') return <PostForm mode="edit" initialPost={post} />

  if (post.post_type === 'member' && memberVisibility(post) === 'expired') redirect(`/posts/${post.id}`)

  return <TeamPostForm postType={post.post_type} teams={[]} initialPost={post} />
}
