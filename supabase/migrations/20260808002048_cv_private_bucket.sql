-- مستودع السير الذاتية — **خاصّ**، بلا أي سياسة وصولٍ عامّة.
--
-- ⚠️ لا سياسات `storage.objects` هنا عمدًا. الرفع يمرّ بمفتاح الخدمة من
-- الخادم، والتنزيل برابطٍ موقَّت يُوقّعه الخادم **بعد** أن يتحقّق من نطاق
-- الطالب. سياسةُ قراءةٍ للمصادَقين كانت ستُعطي كل قائدٍ كلَّ السير — وهو
-- خرقٌ للعزل الذي بُنيت عليه القاعدة كلّها.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv',
  'cv',
  false,
  5242880,  -- خمسة ميجابايت — نفس حدّ `CV_MAX_BYTES` في `registration.ts`
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;
