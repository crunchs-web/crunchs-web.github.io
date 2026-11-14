/* CRUNCH'S 브랜드 사이트 — 인터랙션
   가맹 상담 신청은 Supabase `franchise_applications` 테이블로 실제 접수됩니다.
   (미로그인 방문자는 INSERT 만 가능하고, 조회는 본사 관리자만 할 수 있습니다.) */
(function () {
  'use strict';

  /* Supabase 공개(publishable) 설정 — 비밀 키(service_role)는 넣지 않습니다. */
  var SUPABASE_URL = 'https://hgnnaazxpsytjsjmdgbv.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_MIfxqv5yr0WifnFss306hg_vqEtfEXg';
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

  /* ---------- 접수 저장 (Supabase) ---------- */
  var supabaseClient = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    : null;

  function submitApplication(application) {
    if (!supabaseClient) {
      return Promise.reject(new Error('접수 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    }
    return supabaseClient.from('franchise_applications').insert({
      name: application.name,
      phone: application.phone,
      region: application.area,
      memo: application.memo || null,
      receipt_no: application.receiptNo
    }).then(function (res) {
      if (res.error) throw new Error(res.error.message || '접수 저장에 실패했습니다.');
      return true;
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = validateForm();
    if (!data) return;

    var errorBox = document.getElementById('applicationError');
    var submitBtn = document.getElementById('applicationSubmit');
    if (errorBox) errorBox.textContent = '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('is-loading'); }

    data.receiptNo = makeReceiptNo(new Date());

    submitApplication(data).then(function () {
      document.getElementById('successNo').textContent = data.receiptNo;
      document.getElementById('successName').textContent = data.name;
      document.getElementById('successPhone').textContent = data.phone;
      document.getElementById('successArea').textContent = data.area;

      form.hidden = true;
      success.hidden = false;
      success.setAttribute('data-count', '1');
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).catch(function (err) {
      if (errorBox) errorBox.textContent = (err && err.message) || '접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }).then(function () {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('is-loading'); }
    });
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
