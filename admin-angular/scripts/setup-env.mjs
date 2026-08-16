/**
 * يولّد `src/environments/environment.ts` من `.env.local` في مشروع Next.
 *
 * ⚠️ **المصدرُ واحد.** لو كُتبت القيمتان يدويًّا هنا لصار للوحة عنوانُ
 * مشروعٍ قد يفترق عن عنوان الموقع بعد تبديلِ مشروعٍ أو دورةِ مفاتيح —
 * فتقرأ اللوحةُ قاعدةً غيرَ التي يكتب فيها النموذج، وهو عطلٌ يبدو فيه
 * كلُّ شيءٍ سليمًا إلّا أن الجدولَ فارغ.
 *
 * ⛔ ولا يقرأ هذا النصُّ إلّا المفتاحين العامّين. `SUPABASE_SERVICE_ROLE_KEY`
 * لا يُقرأ ولا يُكتب — انظر التعليل في `environment.example.ts`.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = resolve(here, "../../.env.local");
const OUT = resolve(here, "../src/environments/environment.ts");

let raw;
try {
  raw = readFileSync(ENV_FILE, "utf8");
} catch {
  console.error(
    `\n  ✗ لم يُقرأ ${ENV_FILE}\n` +
      `    انسخ .env.example إلى .env.local في مشروع Next واملأ القيمتين.\n`,
  );
  process.exit(1);
}

/** يقرأ مفتاحًا من صيغة `KEY=value` أو `KEY="value"` */
function read(key) {
  const m = raw.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
}

const supabaseUrl = read("NEXT_PUBLIC_SUPABASE_URL");
const supabasePublishableKey = read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

const missing = [
  !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
  !supabasePublishableKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
].filter(Boolean);

if (missing.length) {
  console.error(`\n  ✗ ناقصٌ في .env.local: ${missing.join(" · ")}\n`);
  process.exit(1);
}

/* ⚠️ حارسٌ صريح: لو تسرّب مفتاحُ الخدمة إلى الاسم المقروء يومًا، يتوقّف
   التوليد بدل أن يُشحن في حزمةِ متصفّح. */
if (supabasePublishableKey.startsWith("sb_secret_") ||
    supabasePublishableKey.includes("service_role")) {
  console.error(
    "\n  ⛔ القيمةُ المقروءة ليست مفتاحًا عامًّا — أُوقف التوليد.\n",
  );
  process.exit(1);
}

const body = `/**
 * مولَّدٌ بـ\`npm run setup:env\` — لا تحرّره، ولا يدخل git.
 * القالبُ وتعليلُه في \`environment.example.ts\`.
 */
export const environment = {
  production: false,
  supabaseUrl: ${JSON.stringify(supabaseUrl)},
  supabasePublishableKey: ${JSON.stringify(supabasePublishableKey)},
};
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, body);

const host = supabaseUrl.replace(/^https:\/\/([a-z0-9]{4}).*/, "https://$1…");
console.log(`  ✓ ${OUT}\n    المشروع: ${host}  ·  المفتاح: عامّ (${supabasePublishableKey.length} حرفًا)`);
