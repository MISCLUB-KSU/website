/**
 * إعدادٌ أدنى بلا `next/*` presets.
 *
 * ⚠️ حالة مؤقّتة: الـpresets تستلزم `typescript-eslint` و`eslint-plugin-import`
 * وغيرهما، وهي غير مثبَّتة في هذا المشروع المُستعاد فينهار المحمِّل قبل فحص
 * سطرٍ واحد. الفحص النوعيّ يتكفّل به `tsc` كاملًا الآن.
 * لإعادة القواعد الكاملة: `npm i -D eslint-config-next @typescript-eslint/*`.
 */
export default [
  { ignores: [".next/**", "node_modules/**", "**/*.generated.*", "_old_ui/**"] },
];
