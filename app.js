/* CRUNCH'S 브랜드 사이트 — 인터랙션
   정적 사이트이므로 신청 데이터는 브라우저 localStorage에만 저장됩니다.
   실제 접수는 백엔드(폼 서비스·Supabase 등) 연동 지점인 `submitApplication()`만 교체하면 됩니다. */
(function () {
  'use strict';

  var STORAGE_KEY = 'crunchs:franchise:applications';
  document.documentElement.classList.add('js');

  /* ---------- 헤더 스크롤 상태 ---------- */
  var header = document.getElementById('siteHeader');
  var toTop = document.getElementById('toTop');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    header.classList.toggle('is-scrolled', y > 24);
    if (toTop) toTop.hidden = y < 600;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- 모바일 내비게이션 ---------- */
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('primaryNav');

  function closeNav() {
    if (!nav || !nav.classList.contains('is-open')) return;
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', '메뉴 열기');
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
  }

  /* ---------- 스크롤 등장 애니메이션 ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- 가맹 상담 폼 ---------- */
  var form = document.getElementById('franchiseForm');
  var success = document.getElementById('formSuccess');
  if (!form || !success) return;

  var fields = {
    fName: { required: '이름을 입력해 주세요.', validate: function (v) { return v.length >= 2 || '이름을 2자 이상 입력해 주세요.'; } },
    fPhone: {
      required: '연락처를 입력해 주세요.',
      validate: function (v) {
        var digits = v.replace(/[^0-9]/g, '');
        return (/^01[016789][0-9]{7,8}$/.test(digits)) || '휴대폰 번호 형식으로 입력해 주세요. (예: 010-1234-5678)';
      }
    },
    fArea: { required: '희망 지역을 입력해 주세요.', validate: function (v) { return v.length >= 2 || '희망 지역을 2자 이상 입력해 주세요.'; } }
  };

  function setError(id, message) {
    var input = document.getElementById(id);
    var field = input.closest('.field') || input.closest('.agree');
    var box = document.querySelector('[data-error-for="' + id + '"]');
    if (field) field.classList.toggle('has-error', Boolean(message));
    if (box) box.textContent = message || '';
  }

  Object.keys(fields).forEach(function (id) {
    var input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('input', function () { setError(id, ''); });
  });

  var agree = document.getElementById('fAgree');
  if (agree) agree.addEventListener('change', function () { setError('fAgree', ''); });

  function validateForm() {
    var firstInvalid = null;

    Object.keys(fields).forEach(function (id) {
      var input = document.getElementById(id);
      var value = input.value.trim();
      var result = value ? fields[id].validate(value) : fields[id].required;
      var message = result === true ? '' : (result || '');
      setError(id, message);
      if (message && !firstInvalid) firstInvalid = input;
    });

    if (agree && !agree.checked) {
      setError('fAgree', '개인정보 수집에 동의해 주세요.');
      if (!firstInvalid) firstInvalid = agree;
    }

    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: false });
      return null;
    }

    return {
      name: document.getElementById('fName').value.trim(),
      phone: document.getElementById('fPhone').value.trim(),
      area: document.getElementById('fArea').value.trim(),
      memo: document.getElementById('fMemo').value.trim(),
      at: new Date().toISOString()
    };
  }

  function makeReceiptNo(date) {
    var p = function (n) { return String(n).padStart(2, '0'); };
    var rand = String(Math.floor(Math.random() * 9000) + 1000);
    return 'CB-' + date.getFullYear() + p(date.getMonth() + 1) + p(date.getDate()) + '-' + rand;
  }

  /* 실제 서비스에서는 이 함수만 서버 전송(fetch)으로 교체 */
  function submitApplication(application) {
    var list = [];
    try { list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { list = []; }
    list.push(application);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list.length;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = validateForm();
    if (!data) return;

    var now = new Date();
    data.receiptNo = makeReceiptNo(now);
    var count = submitApplication(data);

    document.getElementById('successNo').textContent = data.receiptNo;
    document.getElementById('successName').textContent = data.name;
    document.getElementById('successPhone').textContent = data.phone;
    document.getElementById('successArea').textContent = data.area;

    form.hidden = true;
    success.hidden = false;
    success.setAttribute('data-count', String(count));
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  var again = document.getElementById('writeAgain');
  if (again) {
    again.addEventListener('click', function () {
      form.reset();
      Object.keys(fields).forEach(function (id) { setError(id, ''); });
      setError('fAgree', '');
      form.hidden = false;
      success.hidden = true;
      document.getElementById('fName').focus({ preventScroll: true });
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
})();
