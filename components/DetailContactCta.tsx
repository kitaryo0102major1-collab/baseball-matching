import type { PostContacts } from '@/lib/types'

interface Props {
  contacts: PostContacts | null
}

export default function DetailContactCta({ contacts }: Props) {
  if (!contacts) return null

  const { contact_email, contact_phone, contact_other } = contacts
  if (!contact_email && !contact_phone && !contact_other) return null

  return (
    <aside className="mt-8 lg:mt-0 lg:sticky lg:top-20">
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] overflow-hidden">
        <div className="bg-[var(--green)] px-5 py-3">
          <p className="text-white font-bold text-sm">対戦を申し込む</p>
          <p className="text-white/70 text-xs mt-0.5">下記の連絡先に直接ご連絡ください</p>
        </div>

        <div className="px-5 py-4 space-y-3">
          {contact_email && (
            <ContactItem
              icon="✉️"
              label="メール"
              href={`mailto:${contact_email}`}
              text={contact_email}
            />
          )}
          {contact_phone && (
            <ContactItem
              icon="📞"
              label="電話"
              href={`tel:${contact_phone}`}
              text={contact_phone}
            />
          )}
          {contact_other && (
            <ContactItem
              icon="💬"
              label="その他"
              text={contact_other}
            />
          )}
        </div>

        <p className="px-5 pb-4 text-xs text-[var(--ink-mute)]">
          ※ チャット欄からメッセージを送ることもできます
        </p>
      </div>
    </aside>
  )
}

function ContactItem({
  icon,
  label,
  href,
  text,
}: {
  icon: string
  label: string
  href?: string
  text: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-[var(--ink-mute)] mb-0.5">{label}</p>
        {href ? (
          <a
            href={href}
            className="text-sm font-medium text-[var(--green)] hover:underline break-all"
          >
            {text}
          </a>
        ) : (
          <p className="text-sm text-[var(--ink)] break-all">{text}</p>
        )}
      </div>
    </div>
  )
}
