import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import Link from "next/link";

import { LeapForm } from "./leap-form";
import { Lockup } from "./marks";
import "./leap.css";

/**
 * ⚠️ **خطُّ LEAP يُحمَّل في هذا المسار وحده.** خطوطُ الموقع قُلِّمت عمدًا
 * (كانت ٦٢٪ من زنة الصفحة)، وإضافةُ عائلةٍ ثالثةٍ عالميًّا تهدم ذلك. استيرادُه
 * هنا يجعل `next/font` يربط ملفَّه بهذي الصفحة فقط.
 *
 * وزنان لا أكثر: ٦٠٠ للحقول والتسميات، و٧٠٠ للاسم ورقم الحجز على البطاقة.
 * و`latin` وحدها — هذا الخطّ لا يرسم عربيًّا هنا بحال.
 */
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "تسجيل حضور LEAP 2026 — نادي نظم المعلومات الإدارية",
  description:
    "سجّل حضورك مع النادي في مؤتمر LEAP 2026 (٣١ أغسطس – ٣ سبتمبر ٢٠٢٦، RECC ملهم بالرياض) ليُجهَّز لك بزنس كارد قبل الفعالية.",
};

export default function LeapPage() {
  return (
    <div className={`leap-root ${montserrat.variable}`}>
      <div className="leap-wrap">
        {/* القِران: علامتُنا بتدرّجهم، وشعارُهم كما هو */}
        <Lockup />

        <LeapForm>
          <div className="leap-intro">
            <h1>
              تسجيل حضور النادي في{" "}
              <span className="leap-lat" dir="ltr" lang="en">
                LEAP 2026
              </span>
            </h1>
            <p>
              هذا التسجيل لمن حجز تذكرته فعلًا وبيحضر. نجمع أسماء الحاضرين من
              النادي، ونجهّز لكل واحد بزنس كارد يستخدمه هناك في التعارف
              والشراكات. خمس خانات وخلصت.
            </p>
          </div>
        </LeapForm>

        <section aria-labelledby="leap-ref-help">
          <div className="leap-section-head">
            <span className="leap-tick" aria-hidden />
            <h2 id="leap-ref-help">وين ألقى رقم الحجز؟</h2>
          </div>

          <div className="leap-steps">
            <Step n="١">
              <p>
                افتح بريدك ودوّر رسالة من{" "}
                <b className="leap-lat" dir="ltr" lang="en">
                  LEAP
                </b>{" "}
                عنوانها{" "}
                <b className="leap-lat" dir="ltr" lang="en">
                  Thank you for registering for LEAP and DeepFest 2026
                </b>
                . لو ما لقيتها، دوّر في بريدك عن المرسِل{" "}
                <b className="leap-lat" dir="ltr" lang="en">
                  noreply@visitcloud.com
                </b>{" "}
                وشِف مجلد الرسائل المزعجة.
              </p>
            </Step>

            <Step n="٢">
              <p>
                داخل الرسالة تحت عنوان{" "}
                <b className="leap-lat" dir="ltr" lang="en">
                  Your Registration Details
                </b>{" "}
                بتلقى قائمة فيها اسمك وبريدك. السطر المطلوب هو:
              </p>
              {/* السطرُ منقولٌ بنصِّه من الرسالة — هذا ما تبحث عنه عينُه فعلًا */}
              <p className="leap-quote leap-lat" dir="ltr" lang="en">
                Unique Reference Number: <i>XXXXXXXX</i>
              </p>
            </Step>

            <Step n="٣">
              <p>
                انسخ الرقم اللي بعد النقطتين — <b>هو وحده بلا العنوان</b> —
                والصقه في خانة رقم الحجز فوق.
              </p>
            </Step>

            <Step n="٤">
              <p>
                ما سجّلت في{" "}
                <b className="leap-lat" dir="ltr" lang="en">
                  LEAP
                </b>{" "}
                أصلًا؟ سجّل عندهم أول من{" "}
                <a
                  href="https://onegiantleap.com/attend/2026-tickets"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  صفحة التذاكر
                </a>
                ، وبعدها ترجع هنا برقم حجزك.
              </p>
            </Step>
          </div>
        </section>

        <footer className="leap-foot">
          <p>
            نادي نظم المعلومات الإدارية — جامعة الملك سعود.{" "}
            <Link href="/">الموقع الرئيسي</Link>
          </p>
          <p>
            <span className="leap-lat" dir="ltr" lang="en">
              LEAP
            </span>{" "}
            علامة تجارية تخص منظّمي المؤتمر، والنادي ليس جهة منظِّمة له.
          </p>
        </footer>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="leap-step">
      {/* الرقمُ في متوازي أضلاعٍ بميلان النادي، والحرفُ داخله مستقيمٌ
          بميلانٍ معاكس — نفسُ بناء العلامة */}
      <span className="leap-step-n" aria-hidden>
        <span>{n}</span>
      </span>
      <div>{children}</div>
    </div>
  );
}
