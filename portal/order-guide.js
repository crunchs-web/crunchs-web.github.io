/* ==========================================================================
   CRUNCH'S 점주 포털 — 발주하기 › 외부 구매처 가이드
   --------------------------------------------------------------------------
   · 데이터: order-guide-data.js (window.CRB_ORDER_GUIDE_DATA) — JPG 표와 동일 원본
   · 발주하기 화면 상단 탭(본사 발주 / 외부 구매처 가이드)을 제어합니다.
   · 분류 필터 + 통합 검색 + JPG 다운로드(assets/order-guide.jpg)
   ========================================================================== */
(function () {
  'use strict';

  const DATA = window.CRB_ORDER_GUIDE_DATA;
  const ordersView = document.querySelector('[data-view="orders"]');
  if (!DATA || !ordersView) return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s)
    .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const GROUPS = DATA.groups;
  const TOTAL = GROUPS.reduce((n, g) => n + g.items.length, 0);
  const state = { cat: 'all', q: '' };

  /* ---------- 분류 칩 ---------- */
  function renderChips() {
    const row = $('#guideChips');
    if (!row) return;
    const chips = [{ id: 'all', name: '전체', n: TOTAL }].concat(
      GROUPS.map((g) => ({ id: g.id, name: g.name, n: g.items.length }))
    );
    row.innerHTML = chips.map((c) =>
      '<button class="chip' + (state.cat === c.id ? ' is-active' : '') + '" type="button" role="tab"' +
      ' aria-selected="' + (state.cat === c.id) + '" data-guide-cat="' + c.id + '">' +
      esc(c.name) + ' <em>' + c.n + '</em></button>'
    ).join('');
  }

  /* ---------- 비고 뱃지 ---------- */
  function noteHtml(item) {
    const note = (item.note || '').trim();
    if (!note) return { html: '', isEmpty: true };
    const tone = item.tone || '';
    const short = note.length <= 14;
    const cls = tone ? ' g-badge--' + tone : '';
    const html = short
      ? '<span class="g-badge' + cls + '">' + esc(note) + '</span>'
      : '<span class="g-note-long' + (tone ? ' is-' + tone : '') + '">' + esc(note) + '</span>';
    return { html: html, isEmpty: false };
  }

  /* ---------- 한 행 ---------- */
  function rowHtml(item, no) {
    const brand = item.brandFree
      ? {
          html: '<span class="g-badge g-badge--free">' + esc(item.brand) + '</span>' +
            (item.brandExtra ? '<span class="g-sub">' + esc(item.brandExtra) + '</span>' : ''),
          isEmpty: false
        }
      : (item.brand
          ? { html: esc(item.brand), isEmpty: false }
          : { html: '<span class="g-dash">–</span>', isEmpty: true });

    let vendor = { html: '<span class="g-dash">–</span>', isEmpty: true };
    if (item.vendor) {
      if (item.vendorKind === 'hq') vendor = { html: '<span class="g-badge g-badge--hq">' + esc(item.vendor) + '</span>', isEmpty: false };
      else if (item.vendorKind === 'self') vendor = { html: '<span class="g-badge g-badge--self">' + esc(item.vendor) + '</span>', isEmpty: false };
      else vendor = { html: '<span class="g-vendor-name">' + esc(item.vendor) + '</span>', isEmpty: false };
    }

    const note = noteHtml(item);

    return '<tr>' +
      '<td class="g-no">' + no + '</td>' +
      '<td class="g-name"><strong>' + esc(item.name) + '</strong>' +
        (item.detail ? '<small>' + esc(item.detail) + '</small>' : '') + '</td>' +
      '<td class="g-brand" data-label="브랜드"' + (brand.isEmpty ? ' data-empty="1"' : '') + '>' + brand.html + '</td>' +
      '<td class="g-vendor" data-label="구매처"' + (vendor.isEmpty ? ' data-empty="1"' : '') + '>' + vendor.html + '</td>' +
      '<td class="g-note" data-label="비고"' + (note.isEmpty ? ' data-empty="1"' : '') + '>' + note.html + '</td>' +
      '</tr>';
  }

  /* ---------- 목록 ---------- */
  function match(item, q) {
    if (!q) return true;
    const hay = [item.name, item.detail, item.brand, item.brandExtra, item.vendor, item.note]
      .filter(Boolean).join(' ').toLowerCase();
    return hay.indexOf(q) >= 0;
  }

  function render() {
    const body = $('#guideBody');
    if (!body) return;
    const q = state.q.trim().toLowerCase();
    let shown = 0;
    const html = [];

    GROUPS.forEach((g) => {
      if (state.cat !== 'all' && state.cat !== g.id) return;
      const hit = g.items.filter((it) => match(it, q));
      if (!hit.length) return;
      shown += hit.length;
      html.push('<tr class="g-group"><td colspan="5"><span>' + esc(g.name) + '</span>' +
        '<em>' + hit.length + '종</em></td></tr>');
      hit.forEach((it) => {
        const no = g.items.indexOf(it) + 1;
        html.push(rowHtml(it, no));
      });
    });

    body.innerHTML = html.join('');
    const empty = $('#guideEmpty');
    if (empty) empty.hidden = shown > 0;
    const count = $('#guideCount');
    if (count) {
      count.textContent = shown === TOTAL
        ? '전체 ' + TOTAL + '종'
        : (state.cat === 'all' ? '' : (GROUPS.find((g) => g.id === state.cat) || {}).name + ' ') +
          shown + '종 / 전체 ' + TOTAL + '종';
    }
    renderChips();
  }

  /* ---------- 탭 ---------- */
  function setTab(tab) {
    const isGuide = tab === 'guide';
    ordersView.dataset.orderTab = tab;
    $$('.order-tab', ordersView).forEach((b) => {
      const on = b.dataset.orderTab === tab;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    const hqPanel = $('.order-layout', ordersView);
    const guidePanel = $('#orderGuidePanel');
    if (hqPanel) hqPanel.hidden = isGuide;
    if (guidePanel) guidePanel.hidden = !isGuide;
    const hqSub = $('#orderSubHq');
    const gSub = $('#orderSubGuide');
    if (hqSub) hqSub.hidden = isGuide;
    if (gSub) gSub.hidden = !isGuide;
    const fab = $('#cartFab');
    if (fab) fab.hidden = isGuide;
    if (isGuide) render();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function init() {
    ordersView.dataset.orderTab = 'hq';

    $$('.order-tab', ordersView).forEach((b) => {
      b.addEventListener('click', () => setTab(b.dataset.orderTab));
    });

    const chips = $('#guideChips');
    if (chips) chips.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-guide-cat]');
      if (!chip) return;
      state.cat = chip.dataset.guideCat;
      render();
    });

    const search = $('#guideSearch');
    if (search) search.addEventListener('input', (e) => {
      state.q = e.target.value;
      render();
    });

    /* 대쉬보드 '구매처 가이드' 바로가기 → 발주하기 화면의 가이드 탭으로 */
    $$('[data-guide-open]').forEach((btn) => {
      btn.addEventListener('click', () => setTimeout(() => setTab('guide'), 0));
    });

    /* 다른 메뉴로 나갔다가 발주하기로 들어오면 기본 탭은 '본사 발주' */
    document.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (!nav || nav.hasAttribute('data-guide-open')) return;
      if (nav.dataset.nav === 'orders') setTimeout(() => setTab('hq'), 0);
    }, true);

    /* 본사 계정에서는 발주하기 메뉴가 숨겨지므로 바로가기 카드도 함께 숨깁니다. */
    const navOrders = $('#navOrders');
    const syncQuickCard = () => {
      const hq = navOrders ? navOrders.hidden : false;
      $$('[data-guide-open]').forEach((el) => { el.hidden = hq; });
    };
    if (navOrders && 'MutationObserver' in window) {
      new MutationObserver(syncQuickCard).observe(navOrders, { attributes: true, attributeFilter: ['hidden'] });
      syncQuickCard();
    }

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
