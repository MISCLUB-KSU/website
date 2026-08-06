/* حصّالة قياس واجهة نادي MIS.
   تُلصق في وحدة تحكّم المتصفّح على أي صفحة من الموقع، أو تُنفَّذ عبر أدوات
   المعاينة. لا تعتمد على أي حزمة. تقرأ ما يُرسم فعلًا لا ما نظنّه. */
(function () {
  function parse(c) {
    var n = (c.match(/[\d.]+/g) || []).map(Number);
    return /^color\(/.test(c) ? n.slice(0, 3).map(function (x) { return x * 255; }) : n.slice(0, 3);
  }
  function lum(c) {
    var v = parse(c).map(function (x) {
      x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function ratio(a, b) {
    var s = [lum(a), lum(b)].sort(function (p, q) { return q - p; });
    return +((s[0] + 0.05) / (s[1] + 0.05)).toFixed(2);
  }
  function bgOf(el) {
    var e = el;
    while (e && e.nodeType === 1) {
      var c = getComputedStyle(e).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && !/\/\s*0\)/.test(c)) return c;
      e = e.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  }

  /* ١) هل تولّدت أصناف الرموز؟ نحقن عنصرًا ونقيس ما يُرسم. */
  function tokens() {
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;left:-9999px;top:0';
    document.body.appendChild(probe);
    function read(cls, prop) {
      var d = document.createElement('div');
      d.className = cls; probe.appendChild(d);
      var v = getComputedStyle(d)[prop];
      probe.removeChild(d);
      return v;
    }
    var css = getComputedStyle(document.documentElement);
    var out = {
      'px-s4': read('px-s4', 'paddingInlineStart'),
      'gap-s3': read('gap-s3', 'columnGap'),
      'text-fg': read('text-fg', 'color'),
      'text-fg-muted': read('text-fg-muted', 'color'),
      'bg-accent': read('bg-accent', 'backgroundColor'),
      'text-accent': read('text-accent', 'color'),
      'bg-surface-ink': read('bg-surface-ink', 'backgroundColor'),
      'text-on-ink': read('text-on-ink', 'color'),
      'bg-bg-raised': read('bg-bg-raised', 'backgroundColor'),
      'font-display': read('font-display', 'fontFamily'),
      'text-display': read('text-display', 'fontSize'),
      'text-lead': read('text-lead', 'fontSize'),
      'max-w-measure': read('max-w-measure', 'maxWidth')
    };
    document.body.removeChild(probe);
    var fail = [];
    if (out['px-s4'] !== '16px') fail.push('px-s4 = ' + out['px-s4'] + ' (المتوقّع 16px)');
    if (out['gap-s3'] !== '12px') fail.push('gap-s3 = ' + out['gap-s3'] + ' (المتوقّع 12px)');
    if (!/Kufi/.test(out['font-display'])) fail.push('font-display = ' + out['font-display']);
    if (parseFloat(out['text-display']) <= 20) fail.push('text-display = ' + out['text-display'] + ' (لم يتولّد)');
    if (out['bg-accent'] === 'rgba(0, 0, 0, 0)') fail.push('bg-accent شفّاف');
    if (out['bg-surface-ink'] === 'rgba(0, 0, 0, 0)') fail.push('bg-surface-ink شفّاف');
    if (out['max-w-measure'] === 'none') fail.push('max-w-measure = none');
    /* الخطّ مكرّر بين tokens.generated.css و@theme — يجب ألّا يفترقا */
    if (css.getPropertyValue('--font-display').replace(/\s+/g, '') !==
        out['font-display'].replace(/\s+/g, '')) {
      fail.push('‎--font-display‎ في الرموز يخالف صنف font-display');
    }
    return { values: out, fail: fail, pass: fail.length === 0 };
  }

  /* ٢) تباين كل عقدة نصّية على الخلفية المرسومة فعلًا */
  function contrast(root) {
    var bad = [];
    (root || document).querySelectorAll('main *, header *, footer *').forEach(function (el) {
      var hasText = Array.prototype.some.call(el.childNodes, function (n) {
        return n.nodeType === 3 && n.textContent.trim();
      });
      if (!hasText) return;
      var cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
      var fs = parseFloat(cs.fontSize), w = parseInt(cs.fontWeight, 10) || 400;
      var need = (fs >= 24 || (fs >= 18.66 && w >= 700)) ? 3 : 4.5;
      var r = ratio(cs.color, bgOf(el));
      if (r < need) bad.push({ text: el.textContent.trim().slice(0, 26), ratio: r, need: need });
    });
    return { fail: bad, pass: bad.length === 0 };
  }

  /* ٣) دقّة هبوط الأضلاع الستّة على مراسيها */
  var PTS = [
    '460,0 813,0 659.8,339 306.8,339',
    '659,339 1012,339 859.2,677 506.2,677',
    '153,677 506,677 352.8,1016 -0.2,1016',
    '1518,0 1871,0 1411.8,1016 1058.8,1016',
    '2224,0 2577,0 2347.4,508 1994.4,508',
    '2347,508 2700,508 2470.4,1016 2117.4,1016'
  ];
  var BOX = PTS.map(function (p) {
    var xy = p.split(' ').map(function (q) { return q.split(',').map(Number); });
    var xs = xy.map(function (a) { return a[0]; }), ys = xy.map(function (a) { return a[1]; });
    return {
      x: Math.min.apply(null, xs), y: Math.min.apply(null, ys),
      w: Math.max.apply(null, xs) - Math.min.apply(null, xs),
      h: Math.max.apply(null, ys) - Math.min.apply(null, ys)
    };
  });
  function morph() {
    var hero = document.querySelector('[data-mark-anchor="hero"]');
    var foot = document.querySelector('[data-mark-anchor="foot"]');
    var slots = [].slice.call(document.querySelectorAll('[data-mark-slot]'));
    var sh = [].slice.call(document.querySelectorAll('[data-mark-shard]'));
    if (!sh.length) return { skipped: 'لا طبقة متشكّلة (تقليل حركة أو بلا JS)' };
    function err(anchor, k) {
      var a = anchor.getBoundingClientRect(), s = a.width / 2701;
      return +Math.max.apply(null, sh.map(function (el, i) {
        var r = el.getBoundingClientRect();
        return Math.max(Math.abs(r.left - (a.left + BOX[i].x * s)),
                        Math.abs(r.top - (a.top + BOX[i].y * s)),
                        Math.abs(r.width - BOX[i].w * s));
      })).toFixed(1);
    }
    var slotErr = slots.length === 6 ? +Math.max.apply(null, sh.map(function (el, i) {
      var r = el.getBoundingClientRect(), t = slots[i].getBoundingClientRect();
      return Math.max(Math.abs(r.left - t.left), Math.abs(r.top - t.top), Math.abs(r.width - t.width));
    })).toFixed(1) : null;
    return { scrollY: Math.round(scrollY), slots: slots.length,
             vsHero: err(hero), vsSlots: slotErr, vsFoot: err(foot) };
  }

  /* ٤) هل تحجب القطعُ نصًّا؟ بترتيب الرسم الحقيقي لا بتقاطع المستطيلات */
  function coverage() {
    var layer = document.querySelector('[data-mark-layer]');
    if (!layer) return { skipped: 'لا طبقة' };
    var sh = [].slice.call(document.querySelectorAll('[data-mark-shard]'));
    layer.style.pointerEvents = 'auto';
    sh.forEach(function (s) { s.style.pointerEvents = 'auto'; });
    var hit = [];
    document.querySelectorAll('main h1, main h2, main h3, main p, main a span, footer p')
      .forEach(function (t) {
        var b = t.getBoundingClientRect();
        if (!t.textContent.trim() || b.width === 0 || b.bottom < 2 || b.top > innerHeight - 2) return;
        for (var f = 0.15; f <= 0.85; f += 0.175) {
          var x = b.left + b.width * f, y = b.top + b.height * 0.5;
          if (x < 1 || x > innerWidth - 1 || y < 1 || y > innerHeight - 1) continue;
          var el = document.elementFromPoint(x, y);
          if (el && el.closest && el.closest('[data-mark-shard]')) {
            hit.push(t.textContent.trim().slice(0, 22)); break;
          }
        }
      });
    layer.style.pointerEvents = 'none';
    sh.forEach(function (s) { s.style.pointerEvents = ''; });
    return { fail: hit, pass: hit.length === 0 };
  }

  function all() {
    return { tokens: tokens(), contrast: contrast(), morph: morph(), coverage: coverage(),
             horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
  }
  window.__audit = { tokens: tokens, contrast: contrast, morph: morph, coverage: coverage, all: all };
  return 'audit جاهزة — استعمل __audit.all()';
})();
