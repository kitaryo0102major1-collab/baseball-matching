-- SNSフィールドをユーザー名からアカウントURLに変換する
update match_posts set sns_x = 'https://x.com/' || ltrim(sns_x, '@')
  where sns_x is not null and sns_x <> '' and sns_x not like 'http%';
update match_posts set sns_instagram = 'https://instagram.com/' || ltrim(sns_instagram, '@')
  where sns_instagram is not null and sns_instagram <> '' and sns_instagram not like 'http%';
