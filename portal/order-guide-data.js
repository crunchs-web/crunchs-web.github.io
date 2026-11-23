/* ==========================================================================
   CRUNCH'S 점주 포털 — 발주품목 구매처 가이드 데이터
   --------------------------------------------------------------------------
   · 성진님이 전달한 원본 품목표를 그대로 옮긴 단일 원본입니다.
   · JPG 표(다운로드용)도 이 데이터를 그대로 사용합니다.
   · 항목 수정 시 이 파일만 고치면 화면·JPG 가이드 기준이 함께 바뀝니다.
   tone : stop(대체품 X·필수 지정) / ok(대체 가능) / warn(주의) / ''
   vendorKind : hq(본점 발주) / self(자율구매) / ''
   ========================================================================== */
window.CRB_ORDER_GUIDE_DATA = {
  "title": "발주품목 구매처 가이드",
  "updated": "2026-11-23",
  "groups": [
    {
      "id": "sauce",
      "name": "소스류",
      "items": [
        { "name": "마늘소스", "detail": "마늘치킨, 비프버거 전용", "brand": "대상 달콤알싸 마늘소스", "vendor": "", "note": "대체품 사용 X", "tone": "stop" },
        { "name": "데리야끼소스", "detail": "", "brand": "오뚜기", "vendor": "", "note": "대체품 사용 X", "tone": "stop" },
        { "name": "매운데리야끼소스", "detail": "", "brand": "오뚜기", "vendor": "", "note": "", "tone": "" },
        { "name": "치폴레소스", "detail": "", "brand": "태원식품", "vendor": "", "note": "", "tone": "" },
        { "name": "타르타르소스", "detail": "", "brand": "오뚜기 권장", "vendor": "", "note": "대체품 사용 O", "tone": "ok" },
        { "name": "버거용화이트소스", "detail": "", "brand": "", "vendor": "본점 발주", "vendorKind": "hq", "note": "", "tone": "" },
        { "name": "블랙페퍼소스", "detail": "", "brand": "코다노", "vendor": "", "note": "", "tone": "" },
        { "name": "이거다핫한땡초소스", "detail": "", "brand": "뫼루니식품", "vendor": "", "note": "", "tone": "" },
        { "name": "칠리갈릭소스", "detail": "", "brand": "미담채", "vendor": "", "note": "", "tone": "" },
        { "name": "불고기버거소스", "detail": "", "brand": "오뚜기", "vendor": "", "note": "", "tone": "" },
        { "name": "와사마요소스", "detail": "", "brand": "브랜드 상관 X", "brandFree": true, "vendor": "", "note": "", "tone": "" },
        { "name": "부어먹는돈까스소스", "detail": "", "brand": "오뚜기", "vendor": "", "note": "", "tone": "" },
        { "name": "닭강정소스", "detail": "", "brand": "오뚜기", "vendor": "", "note": "", "tone": "" }
      ]
    },
    {
      "id": "ing1",
      "name": "재료 1",
      "items": [
        { "name": "고소한4호번스", "detail": "", "brand": "삼립", "vendor": "차별화상회", "note": "", "tone": "" },
        { "name": "브리오슈번", "detail": "", "brand": "삼립", "vendor": "차별화상회", "note": "", "tone": "" },
        { "name": "핫마리네이드(염지제)", "detail": "", "brand": "태원식품", "vendor": "", "note": "", "tone": "" },
        { "name": "브라질닭", "detail": "", "brand": "브랜드 상관 X", "brandFree": true, "brandExtra": "(라르, 시에라, 사디아, 페르디가오 등)", "vendor": "미트박스, 쿠팡", "note": "★ 절단육 구매 X", "tone": "stop" },
        { "name": "밀가루", "detail": "다목적용, 중력", "brand": "브랜드 상관 X", "brandFree": true, "vendor": "", "note": "", "tone": "" },
        { "name": "피클", "detail": "", "brand": "브랜드 상관 X", "brandFree": true, "vendor": "", "note": "", "tone": "" },
        { "name": "토마토 / 양상추", "detail": "", "brand": "", "vendor": "자율구매", "vendorKind": "self", "note": "", "tone": "" },
        { "name": "슬라이스체다치즈", "detail": "", "brand": "앵커", "vendor": "차별화상회, 쿠팡", "note": "", "tone": "" },
        { "name": "본레스햄", "detail": "", "brand": "", "vendor": "차별화상회", "note": "", "tone": "" },
        { "name": "스노윙시즈닝", "detail": "", "brand": "태원식품", "vendor": "쿠팡", "note": "", "tone": "" },
        { "name": "일회용케찹, 머스타드", "detail": "", "brand": "오뚜기", "vendor": "", "note": "", "tone": "" },
        { "name": "가쓰오부시", "detail": "토핑용", "brand": "브랜드 상관 X", "brandFree": true, "vendor": "", "note": "", "tone": "" }
      ]
    },
    {
      "id": "frozen",
      "name": "냉동",
      "items": [
        { "name": "슈스트링", "detail": "", "brand": "브랜드 상관 X", "brandFree": true, "vendor": "", "note": "", "tone": "" },
        { "name": "치즈스틱", "detail": "", "brand": "쉐푸드", "vendor": "", "note": "대체품 X", "tone": "stop" },
        { "name": "케이준프라이", "detail": "", "brand": "브랜드 상관 X", "brandFree": true, "vendor": "", "note": "", "tone": "" },
        { "name": "치킨너겟", "detail": "", "brand": "사조 애니쿡", "vendor": "차별화상회", "note": "", "tone": "" },
        { "name": "해시브라운", "detail": "", "brand": "브랜드 상관 X", "brandFree": true, "vendor": "", "note": "", "tone": "" },
        { "name": "불고기패티", "detail": "", "brand": "삼양", "vendor": "쿠팡", "note": "", "tone": "" },
        { "name": "후라이드윙", "detail": "", "brand": "하림 굿초이스", "vendor": "", "note": "", "tone": "" },
        { "name": "팝콘치킨", "detail": "", "brand": "하림", "vendor": "", "note": "대체품 X", "tone": "stop" },
        { "name": "타코야끼", "detail": "", "brand": "브랜드 상관 X", "brandFree": true, "vendor": "", "note": "문어함량 10% 이상", "tone": "warn" },
        { "name": "새우패티", "detail": "", "brand": "사세", "vendor": "", "note": "대체품 X", "tone": "stop" },
        { "name": "우민찌 (소패티)", "detail": "", "brand": "미국산·호주산", "vendor": "차별화상회", "note": "같이 구매 시 미국산 1 : 호주산 2 비율로 구매", "tone": "warn" },
        { "name": "베이컨", "detail": "", "brand": "냉동 쫄깃한 전지베이컨 1.9mm", "vendor": "차별화상회", "note": "대체품 가능하지만 사조오양 요리베이컨 X", "tone": "warn" }
      ]
    },
    {
      "id": "ing2",
      "name": "재료 2",
      "items": [
        { "name": "탄산음료", "detail": "", "brand": "펩시, 제로펩시", "vendor": "차별화상회 최저가", "note": "", "tone": "" },
        { "name": "랜덤탄산음료", "detail": "", "brand": "", "vendor": "쿠팡 (할인 중인 음료)", "note": "", "tone": "" },
        { "name": "라면류", "detail": "", "brand": "", "vendor": "쿠팡", "note": "", "tone": "" },
        { "name": "음료캐리어", "detail": "", "brand": "", "vendor": "쿠팡", "note": "", "tone": "" },
        { "name": "각대봉투", "detail": "규격: 소, 중, 대", "brand": "브랜드 상관 X", "brandFree": true, "vendor": "", "note": "", "tone": "" },
        { "name": "펄프용기", "detail": "규격: b-004", "brand": "", "vendor": "", "note": "", "tone": "" }
      ]
    }
  ]
};
