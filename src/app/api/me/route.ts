import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * «مَن أنا» — اسمُ الداخل وحده، للترحيب في شريط الموقع.
 *
 * ⚠️ **مسارٌ مستقلٌّ لا قراءةٌ في الصفحة — والسبب أداءٌ لا ذوق.** الرئيسية
 * صفحةٌ ثابتة (LCP 84ms مقيسة)، وقراءةُ الجلسة داخلها تحوّلها إلى صفحةٍ
 * تُبنى لكل طلب — فيبطؤ الموقع على **كل الطلاب** لأجل سطرٍ يراه القادة
 * وحدهم. وهنا تبقى الصفحة ثابتة، ويسأل المتصفّح بعد التحميل.
 *
 * ⚠️ **ولا يُعاد إلّا الاسم.** لا بريد ولا دور ولا نطاق: الردُّ يُقرأ من
 * أي صفحةٍ في الموقع، فلا يحمل ما لا يلزم للترحيب. ومن لا جلسة له — أو
 * جلستُه لا صفَّ لها في `staff` — يأخذ `null` لا خطأً: الغياب حالةٌ
 * طبيعية هنا، وكلُّ زائرٍ يمرّ بها.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ name: null });

  /* بعميل الجلسة لا بمفتاح الخدمة: سياسة «كلٌّ يقرأ صفّه» في `staff` هي
     التي تحكم — فلا يستطيع أحدٌ قراءة اسم غيره من هنا ولو بدّل الطلب. */
  const { data } = await supabase
    .from("staff")
    .select("display_name")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  return NextResponse.json({ name: data?.display_name ?? null });
}
