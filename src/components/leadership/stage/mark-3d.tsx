"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { MARK_POINTS, MARK_VIEWBOX } from "@/lib/geometry.generated";

/**
 * علامةُ النادي مجسَّمةً — WebGL.
 *
 * ⚠️ **الهندسةُ من `geometry.generated.ts` لا من تقدير.** `MARK_POINTS`
 * ستّةُ متوازياتٍ مقيسةٍ من ملف الشعار الأصلي، تُبثق هنا إلى عمق. فالعلامةُ
 * المجسَّمةُ **هي العلامةُ نفسُها** لا رسمًا يشبهها — ولو أُعيد توليدُ
 * الرموز تبعتها هذي بلا لمسِ يد.
 *
 * ⚠️ **زخرفةٌ محضة.** الهيكلُ كلُّه نصٌّ في HTML تحت هذي الطبقة؛ لو لم
 * تعمل WebGL أو طُلب تقليلُ الحركة لم يُركَّب هذا المكوّن أصلًا (يقرّر ذلك
 * `stage.tsx`)، ولا يضيع من المعنى شيء.
 *
 * وقرارٌ سابقٌ يُنقض هنا صراحةً: كان «3D» يُنفَّذ بـ`perspective` في CSS
 * تفاديًا لثقل مكتبةٍ كاملة على الجوّال. طلبت الإدارة three.js صراحةً
 * (١١ أغسطس ٢٠٢٦)، فالثقلُ مقبولٌ بشرطين محقَّقين هنا: تحميلٌ كسولٌ عند
 * الحاجة، وتخطٍّ كاملٌ لمن طلب تقليل الحركة.
 */

const [, , VIEW_W, VIEW_H] = MARK_VIEWBOX.split(" ").map(Number);

/** يحوّل نقاطَ مضلّعٍ من فضاء الـSVG إلى شكلٍ في فضاء ثلاثيّ الأبعاد */
function shapeFromPoints(points: string): THREE.Shape {
  const shape = new THREE.Shape();

  points
    .trim()
    .split(/\s+/)
    .forEach((pair, index) => {
      const [x, y] = pair.split(",").map(Number);
      /* محورُ Y في SVG ينزل وفي WebGL يصعد، والأصلُ يُنقل إلى المركز */
      const px = x - VIEW_W / 2;
      const py = VIEW_H / 2 - y;
      if (index === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    });

  shape.closePath();
  return shape;
}

const EXTRUDE = { depth: 120, bevelEnabled: true, bevelSize: 10, bevelThickness: 14, bevelSegments: 3 };

function Mark({ tint }: { tint: string }) {
  const group = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  const geometries = useMemo(
    () => MARK_POINTS.map((points) => new THREE.ExtrudeGeometry(shapeFromPoints(points), EXTRUDE)),
    [],
  );

  /* المؤشّرُ يميل بالعلامة ميلًا محدودًا، والزمنُ يعطيها طفوًا هادئًا.
     كلاهما دورانٌ فقط — لا حسابَ تخطيطٍ في كل إطار. */
  useFrame((state, delta) => {
    const mesh = group.current;
    if (!mesh) return;

    const targetY = state.pointer.x * 0.34;
    const targetX = -state.pointer.y * 0.2;
    mesh.rotation.y += (targetY - mesh.rotation.y) * Math.min(1, delta * 2.4);
    mesh.rotation.x += (targetX - mesh.rotation.x) * Math.min(1, delta * 2.4);
    mesh.position.y = Math.sin(state.clock.elapsedTime * 0.55) * 24;
  });

  /* المقياس: العلامةُ **تؤطّر** البطاقتين ولا تزاحمهما. قِيست 0.78 أوّلًا
     فابتلعت الواجهةَ وطمست سطرَ الفصل. */
  const scale = (viewport.width * 0.5) / VIEW_W;

  return (
    <group ref={group} scale={scale} position={[0, 0, 0]}>
      {geometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry} castShadow={false}>
          <meshStandardMaterial
            color={tint}
            metalness={0.35}
            roughness={0.42}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function Mark3D({ tint }: { tint: string }) {
  return (
    <Canvas
      className="st-canvas"
      /* زخرفةٌ لا محتوى: خارج شجرة الوصول وخارج مسار الضغط */
      aria-hidden
      style={{ pointerEvents: "none" }}
      dpr={[1, 1.6]}
      /* ⚠️ `far` صراحةً. مستوى القطع الافتراضي في R3F **1000**، والكاميرا
         هنا على بُعد 1400 — فتقع العلامةُ كلُّها خلفه ولا يُرسم شيء، بلا
         خطأ في الطرفية ولا تحذير. قِيس: لوحٌ فارغٌ تمامًا. */
      camera={{ position: [0, 0, 1400], fov: 42, near: 10, far: 4000 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={1.1} />
      <directionalLight position={[600, 800, 900]} intensity={2.1} />
      <directionalLight position={[-700, -300, 400]} intensity={0.7} />
      <Mark tint={tint} />
    </Canvas>
  );
}
