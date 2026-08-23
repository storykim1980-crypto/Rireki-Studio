'use strict';
/* ============================================================
  履歴スタジオ — app.js
  [섹션 지도]
   01. 상수·검증규칙·콘텐츠 데이터 (예문 15건/팁/프리셋)
   02. 和暦(연호) 변환 엔진
   03. 상태 Store (localStorage 로드/저장/교체)
   04. DOM 유틸 (innerHTML 금지: createElement+textContent 전용)
   05. 토스트 시스템
   06. 기본정보 폼 바인딩 + 입력 검증
   07. CRUD 리스트 (학력/직력/자격 + 직무상세)
   08. 경고 시스템 (필수 미입력/공백기간 감지)
   09. 대시보드 (완성도 도넛/섹션바)
   10. A4 미리보기 렌더러 + 화면 스케일 맞춤
   11. 인쇄 출력
   12. 写真スタジ오 (업로드→크롭→배경제거→보정→저장)
   13. 예문 라이브러리 (검색/카테고리/복사)
   14. Export/Import/전체삭제
   15. 설정(테마/연호/템플릿) + 탭 전환
   16. 초기화 init + 글로벌 에러 핸들러
============================================================ */

/* ================================================================
   01. 상수·검증 규칙·데이터
================================================================ */
const LS_KEY = 'rirekiStudio.v1';          // 저장 키(버전 태그)
const SAVE_DELAY = 400;                    // 자동저장 디바운스(ms)
const YEAR_MIN = 1955;                     // 연도 선택 하한
const PHOTO_MAX_BYTES = 15 * 1024 * 1024;  // 사진 업로드 상한 15MB
const PHOTO_STORE_LIMIT = 320 * 1024;      // localStorage 저장용 사진 상한

/* 입력 검증 정규식 (§6 스키마와 동일) */
const RX = {
  kana:   /^[ぁ-ん゛゜ー\s　]+$/,                    // 히라가나 강제
  kanaLoose:/^[ぁ-ん゛゜ー\s　]*$/,                  // 빈값 허용형
  phone:  /^0\d{1,4}-\d{1,4}-\d{4}$/,              // 일본 전화번호
  postal: /^\d{3}-\d{4}$/,                         // 〒123-4567
  email:  /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

/* 사진 보정 프리셋 (참고사이트 6종 → 클라이언트 파라미터 매핑) */
const PRESETS = {
  standard: { ico:'i-file',     name:'履歴書 標準',   bri:100, con:105, sat:100, sharp:false, auto:false, vig:false, sepia:0 },
  studio:   { ico:'i-aperture', name:'スタジオ',      bri:105, con:120, sat:100, sharp:false, auto:false, vig:true,  sepia:0 },
  natural:  { ico:'i-sun',      name:'自然光',        bri:108, con:100, sat:106, sharp:false, auto:false, vig:false, sepia:10 },
  sharp:    { ico:'i-zap',      name:'くっきり',       bri:102, con:106, sat:100, sharp:true,  auto:false, vig:false, sepia:0 },
  light:    { ico:'i-bulb',     name:'照明補正(自動)',  bri:100, con:104, sat:100, sharp:false, auto:true,  vig:false, sepia:0 },
  business: { ico:'i-case',     name:'ビジネストーン', bri:100, con:112, sat:85,  sharp:false, auto:false, vig:false, sepia:0 }
};

/* 예문 라이브러리: 5 직종 × 3건 (志望動機) */
const EX_CATS = ['すべて','新卒','アルバイト','営業','事務','企画','IT・エンジニア','販売・接客','医療・介護','製造・物流'];
const EXAMPLES = [
 { cat:'営業', title:'理念共感型（基本形）',
   text:'貴社の「お客様の些細な困りごとにも寄り添う」という理念に強く共感し、志望いたしました。前職の量販店では、お客様一人ひとりの用途を丁寧に聞き取る接客を心掛け、リピーター獲得に貢献しました。この経験を活かし、貴社の営業職においても数字だけでなく「信頼される営業」を目指してまいります。' },
 { cat:'営業', title:'新規開拓志向',
   text:'学生時代の飲食店アルバイトで、まだ来店したことのない周辺企業へ昼食のチラシを持参し、団体予約を月5件獲得した経験があります。「まだ会えていないお客様に会いに行く」行動力こそ私の強みです。貴社の新規開拓営業において、この行動力と粘り強さを発揮し、地域No.1のシェア拡大に貢献いたします。' },
 { cat:'営業', title:'既存深耕・ルート型',
   text:'前職では既存顧客150件を担当し、定期的な訪問と導入後フォローを徹底した結果、解約率を前年比30%削減しました。「契約後こそ営業の本番」を信条とする私にとって、地域密着で長期的な関係を築く貴社の営業スタイルは理想的な環境です。培った信頼構築力で、顧客満足度の向上に尽力いたします。' },
 { cat:'事務', title:'正確性アピール',
   text:'小さなミスが会社全体の信頼に関わる事務職だからこそ、「正確さ」にこだわりたいと考えています。前職の経理事務では月次処理3,000件超のデータ入力を担当し、ダブルチェック体制を自分なりに工夫して入力ミスを年間1件未満に抑えました。この正確性と集中力を、貴社の事務業務に活かしてまいります。' },
 { cat:'事務', title:'サポート志向',
   text:'「縁の下の力持ち」として周囲を支えることにやりがいを感じます。前職では営業10名のサポートとして資料作成・日程調整を担い、「頼めば安心」と言っていただける存在を目指してきました。貴社の事務職では、先回りして気付く視点を大切にし、チーム全体の生産性向上に貢献いたします。' },
 { cat:'事務', title:'スキル訴求(Excel等)',
   text:'Excelの関数・マクロを独学で習得し、前職では手作業で3時間かかっていた集計業務を30分に短縮しました。業務効率化は「当たり前を疑い、仕組みで解決する」ことだと考えています。貴社でも定型業務の改善に積極的に取り組み、チームの付加価値を高める事務として貢献いたします。' },
 { cat:'企画', title:'マーケティング志向',
   text:'「数字の裏にある人の気持ち」を読み解く企画に惹かれています。前職の販売職では会員データの購買傾向を分析し、40代女性向けの売場提案を行い、担当売場の売上を前年比120%に伸ばしました。貴社の企画職では、現場感覚とデータ分析の両輪で、お客様の心を動かす企画を生み出してまいります。' },
 { cat:'企画', title:'課題解決・企画立案型',
   text:'現職で「若年層の来店減少」という課題に対し、SNS連動キャンペーンを企画・実行し、20代の新規来店を月平均200組増加させました。仮説を立て、小さく試し、検証して広げる。このPDCAの楽しさを知った私は、貴社の企画職でより大きな挑戦がしたいと考え志望いたしました。' },
 { cat:'企画', title:'イベント・編集系',
   text:'大学時代に学園祭の実行委員長として、来場者数歴代最高の3万人を達成しました。関係者30名の意見を調整しながら「誰のための企画か」を軸に据え続けた経験が、私の原点です。貴社の企画職でも関係者を巻き込む調整力とユーザー視点を武器に、愛される企画を作り続けます。' },
 { cat:'IT・エンジニア', title:'Webエンジニア(経験者)',
   text:'現職では受託開発のWebエンジニアとして、PHP/JavaScriptを用いた業務システム開発に3年間携わってきました。要件定義から保守まで一貫して経験する中で、「ユーザーの使いやすさ」を最優先に設計する姿勢を培いました。自社サービスを育てる貴社で、技術と顧客視点の両方を磨き、事業成長に直接貢献したいと考えています。' },
 { cat:'IT・エンジニア', title:'社内SE・ヘルプデスク',
   text:'「困ったときに真っ先に頼られる存在」でありたいと考えています。前職のヘルプデスクでは1日平均40件の問い合わせに対応し、FAQ整備により解決時間を平均25%短縮しました。現場の声を丁寧に拾い上げる私の強みは、社員全員の生産性を支える貴社の社内SE職で最大限に活きると確信しています。' },
 { cat:'IT・エンジニア', title:'未経験挑戦(スクール/独学)',
   text:'営業職の傍らオンラインスクールでJavaScriptとReactを学習し、自社の顧客管理に使える簡易ツールを自作して部署内で活用されました。「仕事の課題を技術で解決する」醍醐味に魅せられ、エンジニアへの転身を決意しました。未経験ならではの現場目線と、毎日2年間続けた学習継続力で、早期の戦力化を約束します。' },
 { cat:'販売・接客', title:'接客のプロ志向',
   text:'お客様の「ありがとう」が何よりの原動力です。前職のアパレル販売では、体型に悩むお客様への提案を徹底的に研究し、個人売上12か月連続で店内1位を獲得しました。貴店の「丁寧な接客で地域に愛される店づくり」という方針に深く共感し、看板スタッフとしてお店のファンづくりに貢献いたします。' },
 { cat:'販売・接客', title:'店舗運営・リーダー志望',
   text:'アルバイトリーダーとしてシフト作成や新人教育を任された経験から、「人を育て、店舗を動かす面白さ」を学びました。貴社のキャリアパス制度に魅力を感じ、販売職から店長、そしてエリアマネージャーへと挑戦したいと考えています。現場での3年間の接客経験を礎に、数字と人の両方に向き合える店舗運営を目指します。' },
 { cat:'販売・接客', title:'商品知識・専門訴求',
   text:'私の強みは商品知識の深さです。家電量販店での勤務では、自らメーカー研修へ参加し全カテゴリの知識を網羅した結果、お客様の予算と用途に最適な一台を提案できるようになり、成約率が店舗平均の1.3倍となりました。専門性の高い貴社の販売職で、この提案力をさらに磨きたいと考えています。' },
 { cat:'新卒', title:'部活動を軸に（高校卒・基本形）',
   text:'3年間続けた部活動で培った「継続力」が私の一番の強みです。キャプテンとしてチームをまとめた経験から、目標に向かって仲間と協力する大切さを学びました。社会人としては未熟ですが、先輩方のご指導を素直に吸収し、貴社の一員として一日も早く貢献できるよう努力いたします。' },
 { cat:'新卒', title:'アルバイト経験を軸に（大学卒）',
   text:'大学4年間、週3日続けた飲食店のアルバイトで育んだのが「気配りと段取り」です。混雑時でも落ち着いて優先順位をつける癖が身につき、店長からはシフト調整の相談役を任されました。貴社ではこの実践経験を土台に、お客様の目線で考えられる社会人に成長したいと考えています。' },
 { cat:'新卒', title:'資格・学びの姿勢を軸に',
   text:'在学中に計画を立てて取得した簿記2級と普通自動車免許は、コツコツ積み上げる学習習慣の証です。「分からないことは分かるまで調べる」好奇心が私の原動力でもあります。貴社の幅広い業務に挑戦しながら、会社と一緒に成長できる人材を目指してまいります。' },
 { cat:'アルバイト', title:'初めてのバイト（高校生）',
   text:'飲食店での接客にあこがれて応募いたしました。部活動では週4日の練習を3年間休まず続け、時間を守ることと明るい挨拶には自信があります。授業のない平日夕方と土日の両方で勤務可能です。お客様に「また来たい」と思っていただける接客を目指して頑張ります。' },
 { cat:'アルバイト', title:'長期勤務アピール（大学生）',
   text:'大学の授業は午前中心のため、平日の夕方以降と休日に週4日、長期で勤務できます。現在カフェでのアルバイト経験があり、レジ締めや仕込み、新人の方への仕事の共有も任されてきました。「貴店で経験を積み、店の戦力として長く働きたい」と考え応募いたしました。' },
 { cat:'アルバイト', title:'バイト→正社員志望（フリーター）',
   text:'3年間のコンビニ勤務で、発注・売上管理・アルバイト教育まで幅広く経験しました。深夜帯の責任者も務め、「任せられる仕事」を着実に増やしてきた自負があります。貴店では正社員登用制度があると伺い、まずは現場力で貢献し、ゆくゆくは店舗運営に携わりたいと考えています。' },
 { cat:'医療・介護', title:'介護・無資格未経験OK応募',
   text:'祖母の介護を家族と分担した経験から、高齢者の方と寄り添う仕事にやりがいを感じて応募いたしました。実務経験はありませんが、「できないことではなく、できることを一緒に探す」姿勢を大切にしたいと考えています。入社後は介護職員初任者研修の取得に挑戦し、一つずつ確実に成長していきます。' },
 { cat:'医療・介護', title:'看護師の転職',
   text:'総合病院の外科病棟で6年間、周術期看護とクリティカルな場面での判断力を磨いてきました。貴院の「退院後の生活まで見据えた看護」という理念に共感し、訪問看護へのキャリアチェンジを決意しました。急性期での経験を活かし、在宅でも安心できる看護を届けてまいります。' },
 { cat:'医療・介護', title:'医療事務（資格活用）',
   text:'医療事務検定とレセプト点検の学習経験を活かし、地域に根ざした貴院で患者様の「最初の窓口」を担いたいと考えています。前職の家電量販店での5年間の接客経験から、不安を抱える方への穏やかな説明には自信があります。正確な事務処理とあたたかい受付の両立を目指します。' },
 { cat:'製造・物流', title:'製造・未経験からの挑戦',
   text:'モノづくりの現場で手に職をつけたいと考え応募いたしました。前職の飲食店では冷蔵庫の温度管理と衛生チェック表の運用を任され、「記録に基づく確認」の大切さを実践していました。未経験ではありますが、交換勤務への対応も可能です。貴社の品質第一のものづくりを現場で支えたいと思います。' },
 { cat:'製造・物流', title:'物流・フォークリフト資格活用',
   text:'フォークリフト運転技能講習を修了し、倉庫での2年間の実務経験があります。前職では入出庫作業の効率化を提案し、ピッキングミスを月平均40%削減しました。「安全と正確さは両立できる」を信条に、貴社の物流センターの安心な運営に貢献いたします。' },
 { cat:'製造・物流', title:'品質管理・ものづくり経験者',
   text:'前職の電子部品メーカーで外観検査と測定業務に4年間従事し、不良率の低減改善チームにも参加しました。0.1mmの見落としが大きな信頼を損なうことを現場で学んだ私にとって、貴社の「品質は企業の命」という方針は働く意味そのものです。培った目と改善視点で、検査工程の信頼性向上に貢献します。' }
];

/* 履歴書チェックリスト (팁) */
const TIPS = [
 '写真は縦4cm×横3cm・3か月以内に撮影・脱帽・正面が基本です（当スタジオで変換できます）。',
 '年号は和暦・西暦どちらかに統一しましょう（設定で切替可能）。',
 '修正液・修正テープは使わず、書き間違えたら最初から書き直すのがマナーです。',
 '履歴書の日付は「提出日」、郵送の場合は「投函日」を記入します。',
 '学歴は高等学校以降から書くのが一般的です（義務教育は省略可）。',
 '空白期間がある場合は「資格取得のための学習期間」など、理由を簡潔に添えると印象が変わります。',
 '手書きの場合は黒のボールペン・楷書で。消えるペン（フリクション）は不可です。'
];

/* ================================================================
   02. 和暦(연호) 변환 엔진
   - 明治~令和. 경계일 정밀 비교(年月, 생년월일은 日까지)
================================================================ */
const ERAS = [
  { name:'令和', y:2019, m:5,  d:1  },
  { name:'平成', y:1989, m:1,  d:8  },
  { name:'昭和', y:1926, m:12, d:25 },
  { name:'大正', y:1912, m:7,  d:30 },
  { name:'明治', y:1868, m:9,  d:8  }
];
/* 年月(日) → 和暦 문자열 (예: 令和元年 / 平成31年) */
function toWareki(y, m, d){
  m = m || 1; d = d || 1;
  for (const e of ERAS){
    const after = (y > e.y) || (y === e.y && (m > e.m || (m === e.m && d >= e.d)));
    if (after){ const n = y - e.y + 1; return e.name + (n === 1 ? '元' : n) + '年'; }
  }
  return '明治以前';
}
/* 年月 표기: 설정에 따라 和暦/西暦 */
function fmtYM(y, m){
  const era = store.get().settings.eraNotation;
  if (!y) return '';
  return era === 'wareki' ? toWareki(y, m) : y + '年';
}
/* 헤더 날짜: 令和8年8月23日 / 2026年8月23日
   v2.34: 종전의 '現在' 꼬리표 제거 — 「○日現在」는 厚労省 양식의 관례였으나, 職務経歴書를 비롯한
   최신 양식은 '날짜만' 표기가 일반적. 꼬리표가 있는 쪽이 오히려 어색하다는 사용감 피드백 반영.
   (이력서·직무경력서 DOM+PNG 모두 이 함수 하나를 공유하므로 일괄 통일됨) */
function fmtDateHeader(dt){
  const era = store.get().settings.eraNotation;
  const y = dt.getFullYear(), m = dt.getMonth() + 1, d = dt.getDate();
  return (era === 'wareki' ? toWareki(y, m, d) : y + '年') + m + '月' + d + '日';
}

/* ================================================================
   03. 상태 Store (localStorage)
================================================================ */
function defaultState(){
  return {
    version: 1,
    profile: { nameKanji:'', nameKana:'', birthDate:'', gender:'', postal:'',
               address:'', addressKana:'', phone:'', email:'', photoDataUrl:'' },
    education: [], workHistory: [], licenses: [],
    motivation:'', selfPr:'', workSummary:'', requests:'',
    /* 退職届/退職願 (탭5 — 라이프사이클 서류 차별화) */
    taishoku: { docType:'todoke', company:'', president:'', dept:'', leaveDate:'', reason:'isshin' },
    /* 送付状/添え状 (탭6 — 우편 제출용 커버레터. 날짜·時候·프로필은 자동) */
    sofu: { company:'', tantou:'', job:'', docRireki:true, docShokumu:true, otherDoc:'', note:'' },
    /* 模擬面接 (탭7 — v2.12 차별화 자산) */
    mensetsu: { cat:'共通', gqStage:'一次面接', gqTarget:'人事' },
    /* 内定対応パック (탭8 — 手取り 시뮬레이션・비교 조건 영속) */
    pay: { monthly:null, bonus:2, age:'u39', noJumin:false, cmpA:{monthly:null,bonus:2}, cmpB:{monthly:null,bonus:1} },
    payUi: { scene:'accept', company:'', phoneScene:'thanks' },
    settings: { theme:'auto', eraNotation:'wareki', template:'jis-a4', bgColor:'#ffffff', autoSave:true,
                showMot:true, showReq:true },   /* v2.32: 志望動機/本人希望欄 인쇄 포함 여부 (기본 ON = JIS 표준) */
    meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  };
}
const store = {
  state: defaultState(),
  _timer: null,
  get(){ return this.state; },
  load(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.state = sanitizeState(parsed);   // 스키마 정제 후 탑재
    }catch(e){ console.warn('저장 데이터를 읽지 못했습니다(초기화):', e); }
  },
  save(){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(this.state)); }
    catch(e){ console.warn('localStorage 저장 실패(용량 부족 가능):', e); }
  },
  /* 변경 적용: render=true(전체갱신)/'light'(미리보기·대시보드만)/false, persist=저장 예약
     ※ 입력 중인 리스트를 재생성하면 포커스가 날아가므로, 필드별 편집은 반드시 'light' 사용 */
  update(mutator, opts){
    const o = Object.assign({ render:true, persist:true }, opts);
    try{ mutator(this.state); }catch(e){ console.error(e); }
    this.state.meta.updatedAt = new Date().toISOString();
    if (o.render === 'light') renderLight();
    else if (o.render) renderDynamic();
    if (o.persist && this.state.settings.autoSave) this.scheduleSave();
  },
  scheduleSave(){
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      try{ store.save(); }catch(e){ toast('保存容量が不足しています。写真サイズを小さくしてください', 'error'); }
    }, SAVE_DELAY);
  },
  replace(newState){ this.state = newState; this.save(); renderAll(); }
};
function uuid(){
  return (crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}
/* Import/로드 데이터 정제: 키·타입·범위 점검 (악성 JSON 차단) */
function sanitizeState(src){
  const s = defaultState();
  if (!src || typeof src !== 'object') return s;
  const str = (v)=> (typeof v === 'string' ? v : '');
  const num = (v)=> (Number.isFinite(v) ? v : null);
  for (const k of Object.keys(s.profile)){
    if (k === 'photoDataUrl') continue;              // 사진은 아래 화이트리스트에서만 수용
    if (k in (src.profile||{})) s.profile[k] = str(src.profile[k]);
    if (k === 'gender' && !['', '男', '女', '回答しない'].includes(s.profile.gender)) s.profile.gender = ''; // v2.24 화이트리스트
  }
  if (src.profile && typeof src.profile.photoDataUrl === 'string' &&
      src.profile.photoDataUrl.startsWith('data:image/')) s.profile.photoDataUrl = src.profile.photoDataUrl;
  const arr = (a)=> Array.isArray(a) ? a : [];
  s.education = arr(src.education).map(i => ({
    id:str(i.id)||uuid(), year:num(i.year), month:num(i.month),
    type:['entry','grad','other'].includes(i.type)?i.type:'entry', school:str(i.school)
  }));
  s.workHistory = arr(src.workHistory).map(i => ({
    id:str(i.id)||uuid(), startY:num(i.startY), startM:num(i.startM),
    endY:num(i.endY), endM:num(i.endM), company:str(i.company), role:str(i.role)
  }));
  s.licenses = arr(src.licenses).map(i => ({ id:str(i.id)||uuid(), year:num(i.year), month:num(i.month), name:str(i.name) }));
  for (const k of ['motivation','selfPr','workSummary','requests']) s[k] = str(src[k]);
  /* 退職届 데이터도 화이트리스트 정제 (백업 복원 시 XSS·형태 오류 방지) */
  const tq = src.taishoku || {};
  s.taishoku.docType    = ['todoke','negai'].includes(tq.docType) ? tq.docType : 'todoke';
  s.taishoku.reason     = ['isshin','katei','keiyaku','kaisha'].includes(tq.reason) ? tq.reason : 'isshin';
  s.taishoku.company    = str(tq.company);
  s.taishoku.president  = str(tq.president);
  s.taishoku.dept       = str(tq.dept);
  s.taishoku.leaveDate  = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(tq.leaveDate||'') ? tq.leaveDate : '';
  /* 送付状 데이터 화이트리스트 정제 (체크박스는 boolean 강제) */
  const sf = src.sofu || {};
  s.sofu.company    = str(sf.company);
  s.sofu.tantou     = str(sf.tantou);
  s.sofu.job        = str(sf.job);
  s.sofu.docRireki  = sf.docRireki !== false;
  s.sofu.docShokumu = sf.docShokumu !== false;
  s.sofu.otherDoc   = str(sf.otherDoc);
  s.sofu.note       = str(sf.note);
  /* 面接 카테고리 화이트리스트 정제 */
  const msm = src.mensetsu || {};
  s.mensetsu.cat = MQ_CATS.includes(msm.cat) ? msm.cat : '共通';
  s.mensetsu.gqStage  = GQ_STAGES.includes(msm.gqStage)  ? msm.gqStage  : '一次面接';
  s.mensetsu.gqTarget = GQ_TARGETS.includes(msm.gqTarget) ? msm.gqTarget : '人事';
  /* 手取り 입력값 화이트리스트 정제 (범위 밖 숫자 차단) */
  const py = src.pay || {};
  const yen = (v)=>{ const n = Number(v); return (Number.isFinite(n) && n>=0 && n<=3000000) ? n : null; };
  const bon = (v)=>{ const n = Number(v); return (Number.isFinite(n) && n>=0 && n<=12) ? Math.round(n*10)/10 : 2; };
  s.pay.monthly = yen(py.monthly); s.pay.bonus = bon(py.bonus);
  s.pay.age     = ['u39','a40','a65'].includes(py.age) ? py.age : 'u39';
  s.pay.noJumin = py.noJumin === true;
  const ca = py.cmpA || {}, cb = py.cmpB || {};
  s.pay.cmpA = { monthly:yen(ca.monthly), bonus:bon(ca.bonus) };
  s.pay.cmpB = { monthly:yen(cb.monthly), bonus:bon(cb.bonus) };
  const pu = src.payUi || {};
  s.payUi.scene   = Object.keys(MAIL_TPL).includes(pu.scene) ? pu.scene : 'accept';
  s.payUi.company = str(pu.company).slice(0, 60);
  s.payUi.phoneScene = Object.keys(PHONE_TPL || {}).includes(pu.phoneScene) ? pu.phoneScene : 'thanks';
  const st = src.settings || {};
  s.settings.theme      = ['auto','dark','light'].includes(st.theme)?st.theme:'auto';
  s.settings.eraNotation= st.eraNotation === 'seireki' ? 'seireki' : 'wareki';
  s.settings.template   = st.template === 'modern' ? 'modern' : 'jis-a4';
  s.settings.bgColor    = /^#[0-9a-f]{6}$/i.test(st.bgColor||'') ? st.bgColor : '#ffffff';
  s.settings.autoSave   = st.autoSave !== false;
  /* v2.32: 섹션 표시 플래그 — 기존 백업(키 없음)은 true 유지로 후방호환 */
  s.settings.showMot    = st.showMot !== false;
  s.settings.showReq    = st.showReq !== false;
  s.meta = { createdAt:str(src.meta&&src.meta.createdAt)||s.meta.createdAt, updatedAt:new Date().toISOString() };
  return s;
}

/* ================================================================
   04. DOM 유틸 — innerHTML 금지 정책
================================================================ */
const $ = (id)=> document.getElementById(id);
/* 엘리먼트 생성 헬퍼: h('div',{class:'x',text:'문구'}, 자식...) */
function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  if (attrs) for (const [k,v] of Object.entries(attrs)){
    if (v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'on') for (const [ev,fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === 'attrs') for (const [a,b] of Object.entries(v)) el.setAttribute(a,b);
    else el[k] = v;
  }
  for (const kid of kids.flat(Infinity)) if (kid != null) el.append(kid);
  return el;
}
/* SVG 아이콘 생성 헬퍼: index.html 스프라이트의 <symbol>을 <use>로 참조.
   innerHTML 없이 createElementNS만 사용 (XSS 안전 + OS 이모지 폰트 비의존) */
const SVGNS = 'http://www.w3.org/2000/svg';
function ic(name, cls){
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('class', 'ic' + (cls ? ' ' + cls : ''));
  s.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS(SVGNS, 'use');
  u.setAttribute('href', '#' + name);
  s.append(u);
  return s;
}
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = h('a', { href:url, download:filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 4000);
}
const todayStr = ()=>{ const d=new Date(); return ''+d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0'); };

/* ================================================================
   05. 토스트 시스템
================================================================ */
function toast(msg, type){
  type = type || 'success';
  const iconName = { success:'i-check', error:'i-x', warn:'i-alert' }[type] || 'i-check'; // 유형별 SVG 아이콘
  const t = h('div', { class:'toast ' + type, attrs:{ role:'status' } }, ic(iconName), msg);
  $('toastRoot').append(t);
  setTimeout(()=>{ t.classList.add('out'); setTimeout(()=> t.remove(), 320); }, 3000);
}

/* ================================================================
   06. 기본정보 폼 바인딩 + 검증
   - 정적 input: 초기 1회 바인딩(재렌더 X → 포커스 유지)
================================================================ */
const PROFILE_FIELDS = ['nameKanji','nameKana','birthDate','gender','postal','address','addressKana','phone','email'];
const FIELD_IDS = { nameKanji:'p_nameKanji', nameKana:'p_nameKana', birthDate:'p_birth', gender:'p_gender',
                    postal:'p_postal', address:'p_address', addressKana:'p_addressKana', phone:'p_phone', email:'p_email' };

function validateField(key, value){
  switch(key){
    case 'nameKanji': return value.trim() ? '' : '氏名は必須です';
    case 'nameKana':
      if (!value.trim()) return 'ふりがなは必須です';
      return RX.kana.test(value) ? '' : 'ひらがなで入力してください';
    case 'addressKana': return (value && !RX.kanaLoose.test(value)) ? 'ひらがなで入力してください' : '';
    case 'phone':
      if (!value.trim()) return '電話番号は必須です';
      return RX.phone.test(value) ? '' : '090-1234-5678 の形式で入力してください';
    case 'postal': return (value && !RX.postal.test(value)) ? '123-4567 の形式で入力してください' : '';
    case 'email':  return (value && !RX.email.test(value)) ? 'メール形式が正しくありません' : '';
  }
  return '';
}
function showFieldError(key, msg){
  const map = { nameKanji:'e_nameKanji', nameKana:'e_nameKana', postal:'e_postal', phone:'e_phone', addressKana:'e_addressKana', email:'e_email' };
  const errEl = $(map[key]); if (errEl) errEl.textContent = msg;
  const input = $(FIELD_IDS[key]); if (input) input.classList.toggle('invalid', !!msg);
}
function bindProfileForm(){
  for (const key of PROFILE_FIELDS){
    const el = $(FIELD_IDS[key]);
    if (!el) continue;
    el.addEventListener('input', ()=>{
      let v = el.value;
      if (key === 'postal'){                             // 우편번호 하이픈 자동
        const digits = v.replace(/\D/g,'');
        if (digits.length === 7 && !v.includes('-')) { v = digits.slice(0,3)+'-'+digits.slice(3); el.value = v; }
      }
      store.update(st => { st.profile[key] = v; }, { render:'light' });
      showFieldError(key, validateField(key, v));
      if (key === 'birthDate') updateWarekiHint();
    });
    el.addEventListener('blur', ()=> showFieldError(key, validateField(key, el.value)));
  }
  /* textarea 계열 (지원동기/기타/직무요약/자기PR) */
  bindTextArea('ta_motivation','motivation','motCount','motGauge');
  bindTextArea('ta_requests','requests',null,null);
  bindTextArea('ta_workSummary','workSummary','sumCount',null);
  bindTextArea('ta_selfPr','selfPr','prCount',null);
  /* v2.32: 섹션 인쇄 포함 토글 — OFF = プレビュー/印刷/PNG에서 해당 란 전체 제외 (입력 내용은 유지) */
  const bindSecToggle = (cbId, key, noteId)=>{
    const cb = $(cbId); if (!cb) return;
    cb.addEventListener('change', ()=>{
      store.update(st=>{ st.settings[key] = cb.checked; }, {render:'light'});
      /* 연속 입력과 달리 '설정 토글'은 단발 동작 — 디바운스(400ms) 안 기다리고 즉시 확정 저장해
         토글 직후 탭을 닫아도 설정이 날아가지 않도록 한다 (v2.32 하드닝) */
      store.save();
      const note = $(noteId); if (note) note.hidden = cb.checked;
      toast(cb.checked ? 'この欄を履歴書に含めます'
                       : 'この欄は印刷・画像から除外されます（入力内容は保持されます）');
    });
  };
  bindSecToggle('tgMot','showMot','motOffNote');
  bindSecToggle('tgReq','showReq','reqOffNote');
}
function bindTextArea(id, key, countId, gaugeId){
  const el = $(id); if (!el) return;
  el.addEventListener('input', ()=>{
    store.update(st => { st[key] = el.value; }, { render:'light' });
    updateCharCounter(el.value, countId, gaugeId);
  });
}
function updateCharCounter(text, countId, gaugeId){
  if (countId){ const c = $(countId); if (c) c.textContent = String(text.length); }
  if (gaugeId){
    const g = $(gaugeId); if (!g) return;
    const len = text.length; const ratio = Math.min(1, len/400);
    g.style.width = (ratio*100) + '%';
    g.style.background = len > 420 ? 'var(--err)' : (len >= 300 ? 'var(--ok)' : 'var(--accent)');
  }
}
/* 生年月日(YYYY,M,D) → 満年齢 (履歴書の年齢表記は 満年齢 が公式ルール) */
function computeAge(y, m, d){
  const t = new Date();
  let a = t.getFullYear() - y;
  if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) a--;
  return a;
}
/* 생년월일 → 和暦 힌트 표시 */
function updateWarekiHint(){
  const v = $('p_birth').value; const hint = $('warekiHint');
  if (!v){ hint.textContent = ''; return; }
  const [y,m,d] = v.split('-').map(Number);
  hint.textContent = '和暦: ' + toWareki(y,m,d) + m + '月' + d + '日生まれ（満' + computeAge(y,m,d) + '歳）';
}
/* store → 폼 값 주입 (초기/복원/리셋 시에만 호출) */
function fillProfileForm(){
  const p = store.get().profile;
  for (const key of PROFILE_FIELDS){ const el = $(FIELD_IDS[key]); if (el) el.value = p[key] || ''; }
  showOnlyValidErrors();
  updateWarekiHint();
  $('ta_motivation').value = store.get().motivation;
  $('ta_requests').value   = store.get().requests;
  $('ta_workSummary').value= store.get().workSummary;
  $('ta_selfPr').value     = store.get().selfPr;
  updateCharCounter(store.get().motivation,'motCount','motGauge');
  updateCharCounter(store.get().workSummary,'sumCount',null);
  updateCharCounter(store.get().selfPr,'prCount',null);
  /* v2.32: 섹션 표시 토글 상태 복원 (재방문/백업 복원 시에도 OFF 유지) */
  const stg = store.get().settings;
  const tgm = $('tgMot'), tgr = $('tgReq');
  if (tgm) tgm.checked = stg.showMot !== false;
  if (tgr) tgr.checked = stg.showReq !== false;
  const nMot = $('motOffNote'); if (nMot) nMot.hidden = !tgm || tgm.checked;
  const nReq = $('reqOffNote'); if (nReq) nReq.hidden = !tgr || tgr.checked;
}
function showOnlyValidErrors(){
  for (const key of ['nameKanji','nameKana','phone','postal','email','addressKana']){
    const v = store.get().profile[key];
    if (v) showFieldError(key, validateField(key, v)); else showFieldError(key,'');
  }
}

/* ================================================================
   07. CRUD 리스트 (학력/직력/자격/직무상세)
================================================================ */
/* 연도/월 select 생성기 */
function yearOptions(sel, current){
  sel.replaceChildren();
  sel.append(h('option',{ value:'', text:'—' }));
  const nowY = new Date().getFullYear();
  for (let y = nowY; y >= YEAR_MIN; y--){
    const label = y + '（' + toWareki(y,6,1) + '）';   // 연중 6월 기준 연호 병기
    const op = h('option',{ value:String(y), text:label });
    if (current === y) op.selected = true;
    sel.append(op);
  }
}
function monthOptions(sel, current){
  sel.replaceChildren();
  sel.append(h('option',{ value:'', text:'—' }));
  for (let m = 1; m <= 12; m++){
    const op = h('option',{ value:String(m), text:m + '月' });
    if (current === m) op.selected = true;
    sel.append(op);
  }
}
const EDU_TYPES = { entry:'入学', grad:'卒業', other:'その他' };

/* --- 학력 리스트 --- */
function renderEduList(){
  const list = $('eduList'); list.replaceChildren();
  const items = store.get().education;
  if (!items.length){ list.append(h('div',{class:'empty-note',text:'まだ項目がありません。「＋ 追加」から入力してください。'})); return; }
  items.forEach((item, idx)=>{
    const selY = h('select',{attrs:{'aria-label':'年'}}); yearOptions(selY, item.year);
    const selM = h('select',{attrs:{'aria-label':'月'}}); monthOptions(selM, item.month);
    const selT = h('select',{attrs:{'aria-label':'区分'}});
    for (const [k,v] of Object.entries(EDU_TYPES)){
      const op = h('option',{ value:k, text:v }); if (item.type === k) op.selected = true; selT.append(op);
    }
    const txt = h('input',{ type:'text', value:item.school, placeholder:'例: ○○大学 経済学部', attrs:{'aria-label':'学校名'} });
    selY.addEventListener('change',()=> store.update(st=>{ st.education[idx].year = +selY.value || null; },{render:'light'}));
    selM.addEventListener('change',()=> store.update(st=>{ st.education[idx].month = +selM.value || null; },{render:'light'}));
    selT.addEventListener('change',()=> store.update(st=>{ st.education[idx].type = selT.value; },{render:'light'}));
    txt.addEventListener('input', ()=> store.update(st=>{ st.education[idx].school = txt.value; },{render:'light'}));
    list.append(h('div',{class:'crud-item'},
      h('div',{class:'crud-row'}, selY, selM, txt),
      h('div',{class:'crud-row', style:'grid-template-columns:110px 1fr', }, selT, crudTools('education', idx, items.length))
    ));
  });
}
/* --- 직력 리스트 --- */
function renderWorkList(){
  const list = $('workList'); list.replaceChildren();
  const items = store.get().workHistory;
  if (!items.length){ list.append(h('div',{class:'empty-note',text:'職歴がある場合は「＋ 追加」から入力してください。'})); return; }
  items.forEach((item, idx)=>{
    const sY=h('select',{attrs:{'aria-label':'入社年'}}), sM=h('select',{attrs:{'aria-label':'入社月'}});
    const eY=h('select',{attrs:{'aria-label':'退社年'}}), eM=h('select',{attrs:{'aria-label':'退社月'}});
    yearOptions(sY,item.startY); monthOptions(sM,item.startM); yearOptions(eY,item.endY); monthOptions(eM,item.endM);
    const isCurrent = item.endY == null;
    eY.disabled = isCurrent; eM.disabled = isCurrent;
    const cb = h('input',{ type:'checkbox' }); cb.checked = isCurrent;
    const cbWrap = h('label',{class:'check-inline'}, cb, '現在に至る');
    const txt = h('input',{ type:'text', value:item.company, placeholder:'例: ○○株式会社', attrs:{'aria-label':'会社名'} });
    sY.addEventListener('change',()=> store.update(st=>{ st.workHistory[idx].startY = +sY.value||null; },{render:'light'}));
    sM.addEventListener('change',()=> store.update(st=>{ st.workHistory[idx].startM = +sM.value||null; },{render:'light'}));
    eY.addEventListener('change',()=> store.update(st=>{ st.workHistory[idx].endY = +eY.value||null; },{render:'light'}));
    eM.addEventListener('change',()=> store.update(st=>{ st.workHistory[idx].endM = +eM.value||null; },{render:'light'}));
    cb.addEventListener('change',()=>{
      store.update(st=>{ const w=st.workHistory[idx];
        if (cb.checked){ w.endY = null; w.endM = null; }
        else {
          /* v2.29 치명 수정: 해제 시 퇴사연월이 미선택(placeholder 값 '')이면 endY=null이 유지되어
             재렌더에서 다시 '재직'으로 되돌아가 체크를 영구히 해제할 수 없던 데드락.
             입사년(없으면 올해)을 기본 퇴사년으로 채워 해제 상태가 성립되도록 한다 */
          w.endY = +eY.value || w.startY || new Date().getFullYear();
          w.endM = +eM.value || null;
        }
      },{render:false});
      renderDynamic();                     // 체크 = 구조 변경(선택框 비활성) → 리스트 재구성
    });
    txt.addEventListener('input',()=> store.update(st=>{ st.workHistory[idx].company = txt.value; },{render:'light'}));
    list.append(h('div',{class:'crud-item'},
      h('div',{class:'crud-row work'}, sY, sM, eY, eM, txt),
      h('div',{class:'crud-bottom'}, cbWrap, crudTools('workHistory', idx, items.length))
    ));
  });
}
/* --- 자격증 리스트 --- */
function renderLicList(){
  const list = $('licList'); list.replaceChildren();
  const items = store.get().licenses;
  if (!items.length){ list.append(h('div',{class:'empty-note',text:'免許・資格があれば追加してください（任意）。'})); return; }
  items.forEach((item, idx)=>{
    const selY=h('select',{attrs:{'aria-label':'取得年'}}), selM=h('select',{attrs:{'aria-label':'取得月'}});
    yearOptions(selY,item.year); monthOptions(selM,item.month);
    const txt = h('input',{ type:'text', value:item.name, placeholder:'例: TOEIC 800点 / 普通自動車免許', attrs:{'aria-label':'資格名'} });
    selY.addEventListener('change',()=> store.update(st=>{ st.licenses[idx].year = +selY.value||null; },{render:'light'}));
    selM.addEventListener('change',()=> store.update(st=>{ st.licenses[idx].month = +selM.value||null; },{render:'light'}));
    txt.addEventListener('input',()=> store.update(st=>{ st.licenses[idx].name = txt.value; },{render:'light'}));
    list.append(h('div',{class:'crud-item'},
      h('div',{class:'crud-row'}, selY, selM, txt),
      h('div',{class:'crud-bottom'}, h('span'), crudTools('licenses', idx, items.length))
    ));
  });
}
/* --- CRUD 공통 도구(위/아래/삭제) --- */
function crudTools(kind, idx, len){
  const mv = (dir)=>{
    store.update(st=>{
      const a = st[kind]; const j = idx + dir;
      if (j < 0 || j >= a.length) return;
      [a[idx], a[j]] = [a[j], a[idx]];
    },{ render:false });
    renderDynamic();
    toast('順序を変更しました');
  };
  const del = ()=>{
    const label = { education:'学歴', workHistory:'職歴', licenses:'資格' }[kind];
    if (!confirm('この' + label + '項目を削除しますか？')) return;
    store.update(st=>{ st[kind].splice(idx,1); },{ render:false });
    renderDynamic();
    toast(label + '項目を削除しました', 'warn');
  };
  return h('div',{class:'crud-tools'},
    h('button',{ type:'button', class:'btn small', text:'▲', disabled:idx===0, attrs:{'aria-label':'上へ'}, on:{click:()=>mv(-1)} }),
    h('button',{ type:'button', class:'btn small', text:'▼', disabled:idx===len-1, attrs:{'aria-label':'下へ'}, on:{click:()=>mv(1)} }),
    h('button',{ type:'button', class:'btn small danger', attrs:{'aria-label':'削除'}, on:{click:del} }, ic('i-trash'))
  );
}
/* --- 직무 상세 (職務経歴書 탭) — v2.28: 읽기 전용에서 '이 화면에서 바로 편집'으로 격상.
       회사명/入退社 연월/재직 체크/이동·삭제까지 이 탭에서 전부 가능 (履歴書 탭과同一 store) --- */
function renderWorkDetail(){
  const list = $('workDetailList'); list.replaceChildren();
  const items = store.get().workHistory;
  if (!items.length){ list.append(h('div',{class:'empty-note',text:'まだ職歴がありません。上の「＋ 追加」から登録してください（履歴書タブと同期されます）。'})); return; }
  items.forEach((item, idx)=>{
    /* 연월 선택 (履歴書 탭의 職歴 행과 동일한 바인딩 규칙) */
    const sY=h('select',{attrs:{'aria-label':'入社年'}}), sM=h('select',{attrs:{'aria-label':'入社月'}});
    const eY=h('select',{attrs:{'aria-label':'退社年'}}), eM=h('select',{attrs:{'aria-label':'退社月'}});
    yearOptions(sY,item.startY); monthOptions(sM,item.startM); yearOptions(eY,item.endY); monthOptions(eM,item.endM);
    const isCurrent = item.endY == null;
    eY.disabled = isCurrent; eM.disabled = isCurrent;
    const cb = h('input',{ type:'checkbox' }); cb.checked = isCurrent;
    const cbWrap = h('label',{class:'check-inline'}, cb, '現在に至る');
    const comp = h('input',{ type:'text', value:item.company, placeholder:'例: ○○株式会社', attrs:{'aria-label':'会社名'} });
    sY.addEventListener('change',()=> store.update(st=>{ st.workHistory[idx].startY = +sY.value||null; },{render:'light'}));
    sM.addEventListener('change',()=> store.update(st=>{ st.workHistory[idx].startM = +sM.value||null; },{render:'light'}));
    eY.addEventListener('change',()=> store.update(st=>{ st.workHistory[idx].endY = +eY.value||null; },{render:'light'}));
    eM.addEventListener('change',()=> store.update(st=>{ st.workHistory[idx].endM = +eM.value||null; },{render:'light'}));
    cb.addEventListener('change',()=>{
      store.update(st=>{ const w=st.workHistory[idx];
        if (cb.checked){ w.endY = null; w.endM = null; }
        else {
          /* v2.29 치명 수정: 해제 시 퇴사연월이 미선택(placeholder 값 '')이면 endY=null이 유지되어
             재렌더에서 다시 '재직'으로 되돌아가 체크를 영구히 해제할 수 없던 데드락.
             입사년(없으면 올해)을 기본 퇴사년으로 채워 해제 상태가 성립되도록 한다 */
          w.endY = +eY.value || w.startY || new Date().getFullYear();
          w.endM = +eM.value || null;
        }
      },{render:false});
      renderDynamic();                     // 체크 = 구조 변경(선택框 비활성) → 리스트 재구성
    });
    comp.addEventListener('input',()=> store.update(st=>{ st.workHistory[idx].company = comp.value; },{render:'light'}));
    /* 업무 상세 */
    const ta = h('textarea',{ rows:4, placeholder:'担当業務・実績・工夫した点などを具体的に', attrs:{'aria-label':'業務内容'} });
    ta.value = item.role || '';
    ta.addEventListener('input',()=> store.update(st=>{ st.workHistory[idx].role = ta.value; },{render:'light'}));
    list.append(h('div',{class:'crud-item'},
      h('div',{class:'crud-row work'}, sY, sM, eY, eM, comp),
      h('div',{class:'crud-bottom'}, cbWrap, crudTools('workHistory', idx, items.length)),
      ta
    ));
  });
}

/* ================================================================
   08. 경고 시스템 (필수 미입력/공백기간/사진/글자수)
================================================================ */
function computeWarnings(){
  const w = []; const s = store.get(); const p = s.profile;
  if (!p.nameKanji.trim()) w.push('氏名が未入力です');
  if (!p.nameKana.trim())  w.push('ふりがなが未入力です');
  if (!p.birthDate)        w.push('生年月日が未入力です');
  if (!p.phone.trim())     w.push('電話番号が未入力です');
  if (!p.address.trim())   w.push('現住所が未入力です');
  if (!p.photoDataUrl)     w.push('証明写真が未登録です（「証明写真」タブで作成できます）');
  /* v2.32: 志望動機 란을 인쇄에서 제외한 사용자에게 글자수 경고는 무의미 → 스킵 */
  if (s.settings.showMot !== false){
    const ml = s.motivation.trim().length;
    if (ml > 0 && ml < 150)  w.push('志望動機が短めです（目安300〜400字）');
    if (ml > 420)            w.push('志望動機が枠を超える可能性があります（現在 ' + ml + '字）');
  }
  /* 공백기간 감지: 정렬 후 인접 경력 사이 3개월 초과 → 경고 */
  const jobs = s.workHistory.filter(j=>j.startY).slice().sort((a,b)=> (a.startY*12+(a.startM||1)) - (b.startY*12+(b.startM||1)));
  for (let i = 0; i < jobs.length - 1; i++){
    const end = jobs[i].endY ? jobs[i].endY*12 + (jobs[i].endM||12) : null;
    if (end == null) continue;                        // 재직 중은 이후 공백 아님
    const next = jobs[i+1].startY*12 + (jobs[i+1].startM||1);
    const gap = next - end - 1;
    if (gap > 3) w.push('職歴に約' + gap + 'か月の空白期間があります（理由を本人希望欄などで補足すると安心です）');
  }
  return w;
}

/* ================================================================
   09. 대시보드 (완성도 도넛 + 섹션바 + 경고)
================================================================ */
function sectionScores(){
  const s = store.get(); const p = s.profile;
  const req = ['nameKanji','nameKana','birthDate','phone','address'];
  const profileRatio = req.filter(k => (p[k]||'').trim()).length / req.length;
  const list = [
    { label:'基本情報', ratio: profileRatio, weight:25 },
    { label:'写真',     ratio: p.photoDataUrl ? 1 : 0, weight:10 },
    { label:'学歴',     ratio: s.education.some(e=>e.school.trim()&&e.year) ? 1 : (s.education.length ? .5 : 0), weight:15 },
    { label:'職歴',     ratio: s.workHistory.some(e=>e.company.trim()&&e.startY) ? 1 : (s.workHistory.length ? .5 : 0), weight:15 },
    { label:'資格',     ratio: s.licenses.some(e=>e.name.trim()) ? 1 : (s.licenses.length ? .5 : 0), weight:5 }
  ];
  /* v2.32: 인쇄 제외한 志望動機는 완성도 계산에서도 제외 (대신 가중치 재정규화로 총점 왜곡 방지) */
  if (s.settings.showMot !== false)
    list.push({ label:'志望動機', ratio: Math.min(1, s.motivation.trim().length / 300), weight:20 });
  list.push({ label:'職務経歴', ratio: Math.min(1, (s.workSummary.trim().length + s.selfPr.trim().length) / 200), weight:10 });
  return list;
}
function renderDashboard(){
  const secs = sectionScores();
  /* v2.32: 제외된 섹션(志望動機 OFF 등)이 있으면 가중치 합 기준으로 재정규화 — 기본(100 합)일 때 결과 동일 */
  const sumW = secs.reduce((a,x)=> a + x.weight, 0);
  const total = sumW ? Math.round(secs.reduce((sum,x)=> sum + x.ratio * x.weight, 0) / sumW * 100) : 0;
  const C = 2 * Math.PI * 52;                                  // 도넛 원주 (r=52)
  const val = C * (1 - total/100);
  $('dcVal').style.strokeDashoffset = String(val);
  $('dcText').textContent = total + '%';
  const bars = $('secBars'); bars.replaceChildren();
  for (const s of secs){
    bars.append(h('div',{class:'secbar'},
      h('span',{text:s.label}),
      h('div',{class:'track'}, h('div',{class:'fill', style:'width:'+Math.round(s.ratio*100)+'%'})),
      h('span',{text:Math.round(s.ratio*100)+'%'})
    ));
  }
  const wl = $('warnList'); wl.replaceChildren();
  const warns = computeWarnings();
  if (!warns.length) wl.append(h('li',{class:'ok-item',text:'必須項目はすべて入力されています'}));
  else {
    warns.slice(0,4).forEach(w => wl.append(h('li',{text:w})));       // 최대 4건 + 나머지 건수 안내 (v2.29)
    if (warns.length > 4) wl.append(h('li',{class:'ok-item', text:'ほか' + (warns.length - 4) + '件の指摘があります'}));
  }
}

/* ================================================================
   10. A4 미리보기 렌더러 (履歴書 / 職務経歴書)
================================================================ */
/* --- 이력서 이벤트 행 생성 (학력+직력을 연월 정렬) --- */
function historyRows(){
  const s = store.get(); const rows = [];
  for (const e of s.education){
    /* v2.31: 연도 미선택 상태에서 학교명만 입력하든 행이 미리보기에서 통째로 사라지던 문제 수정
       (기존 if(!e.year) continue → 입력 중이던 행의 조용한 유실. '내용만 먼저 적고 연도는 나중에' 라는
        자연스러운 입력 순서를 깨뜨려 사용자가 버그로 인지하게 됨. licenses는 이름만으로 표시되는데 불일치했음) */
    if (!e.year && !(e.school||'').trim()) continue;
    const ym = e.year ? e.year*12 + (e.month||0) : 99998;   // 연도 미정 행은 現在に至る(99999) 직전으로
    /* v2.31: 학교명 끝에 사용자가 직접 적은 卒業/中退/入学을 '종류 셀렉트 값'보다 우선해 표기.
       종전엔 무조건 잘라내고 셀렉트 기본값(入学)을 붙여 「○○大学 卒業」입력이 「○○大学 入学」으로
       뒤바뀌어 인쇄되는 치명적 오표기 발생 (v2.27 dedupe 로직의 부작용) */
    const rawEdu = (e.school||'');
    const sufM = rawEdu.match(/[\s　]*(入学|卒業|中退)$/u);
    const school = sufM ? rawEdu.replace(/[\s　]*(入学|卒業|中退)$/u, '') : rawEdu;
    const eduLabel = sufM ? sufM[1] : EDU_TYPES[e.type];
    rows.push({ y:e.year, m:e.month, key:ym, text:school + (school ? ' ' : '') + eduLabel, kind:'edu' });   /* v2.30: kind 태그 */
  }
  /* 회사명/학교명 끝에 사용자가 入社·退社·卒業 등을 직접 적은 경우 자동 접미사와의 이중 표기를 정리 (v2.27)
     예: 「株式会社○○ 入社」라고 입력하면 「…入社 入社」가 되던 것 방지 */
  const stripEnd = (t, re) => (t||'').replace(re, '');
  const RE_WORK_SUFFIX = /[\s　]*(入社|退社|入|退)$/u;
  let hasCurrent = false;
  for (const w of s.workHistory){
    /* v2.31: 회사명만 입력(입사년 미선택)한 경우에도 행이 사라지던 문제 동일 수정 */
    if (!w.startY && !(w.company||'').trim()) continue;
    const comp = stripEnd(w.company, RE_WORK_SUFFIX);
    rows.push({ y:w.startY, m:w.startM, key: w.startY ? w.startY*12+(w.startM||0) : 99998, text:comp + (comp?' ':'') + '入社', kind:'work' });
    if (w.endY){
      rows.push({ y:w.endY, m:w.endM, key:w.endY*12+(w.endM||0)+0.5, text:comp + (comp?' ':'') + '退社', kind:'work' });
    } else {
      hasCurrent = true;   /* 「現在に至る」은 재직 행이 몇 개든 맨 마지막에 '단 1회만' 출력 — JIS 표준 (v2.27) */
    }
  }
  if (hasCurrent) rows.push({ y:new Date().getFullYear(), m:new Date().getMonth()+1, key:99999, text:'現在に至る', isNow:true, kind:'work' });
  rows.sort((a,b)=> a.key - b.key);
  return rows;
}
/* --- 履歴書 미리보기 DOM 구성 --- */
/* v2.38: 氏名을 성씨 단위로 분할 — 「姓かなは姓の真上、名かなは名の真上」배치용 (PC 履歴書 빌더 관례).
   성씨·명 각 파트의 // 가나를 해당 한자 파트의 수평 중심에 맞춘다. 양쪽 모두 같은 개수(2개 이상)로
   나뉘는 경우에만 per-part 레이아웃, 아니면 null 폐백(종전 전폭 중앙 정렬) */
function splitNameParts(nm, kn){
  const n = String(nm||'').trim().split(/[\s　]+/).filter(Boolean);
  const k = String(kn||'').trim().split(/[\s　]+/).filter(Boolean);
  if (n.length >= 2 && n.length === k.length) return n.map((t,i)=>({ n:t, k:k[i] }));
  return null;
}
function buildRirekiA4(){
  const s = store.get(); const p = s.profile;
  const tpl = s.settings.template === 'modern' ? 'a4 modern' : 'a4';
  const a4 = h('div',{ class: tpl });

  a4.append(h('h1',{class:'r-title', text:'履　歴　書'}));
  a4.append(h('div',{class:'r-date', text: fmtDateHeader(new Date())}));

  /* 상단: 신원 정보 + 사진 */
  const photoBox = h('div',{class:'r-photo'});
  if (p.photoDataUrl){ photoBox.append(h('img',{ src:p.photoDataUrl, alt:'証明写真' })); }
  else photoBox.append(h('span',{text:'写真を貼る位置\n（縦4cm×横3cm）'}), );

  /* v2.38: 氏名 영역 재설계 — 분할 가능한 姓/名이면 각 카운트의 카/나를 한자 파트의 수평 중심에
     배치(姓かなは姓の真上、名かなは名の真上). 종전 '칸 전체 중앙에 가나 1줄' 방식은 긴 가나가
     이름보다 크게 퍼져 어색해 보인다는 사용자 지적 반영. 라벨은 양식 관례대로 칸 좌상단 소형. */
  const nmParts = splitNameParts(p.nameKanji, p.nameKana);
  const nameCell = h('div',{class:'c', style:'flex-direction:column;align-items:center;justify-content:center;position:relative'});
  nameCell.append(h('span',{class:'r-kana-label', style:'top:.9mm;transform:none;left:.6mm', text:'ふりがな'}));
  if (nmParts){
    const grp = h('div',{class:'r-npairs'});
    for (const pt of nmParts){
      grp.append(h('span',{class:'r-npair'},
        h('span',{class:'r-np-k', text:pt.k}),
        h('span',{class:'r-np-n', text:pt.n})));
    }
    nameCell.append(grp);
  } else {
    nameCell.append(
      h('div',{class:'r-kana-line', style:'margin-top:1.2mm'},
        h('span',{class:'r-kana-val', text:p.nameKana||''})),
      h('span',{class:'r-name', text:p.nameKanji || '氏　　名'}));
  }
  const nameRow = h('div',{class:'r-row name', style:'grid-template-columns:1fr;flex:1'}, nameCell);
  const birthText = (()=>{
    if (!p.birthDate) return '生年月日';
    const [y,m,d] = p.birthDate.split('-').map(Number);
    return '生年月日　' + fmtYM(y,m) + m + '月' + d + '日生（満' + computeAge(y,m,d) + '歳）'; // JIS慣例: 満年齢併記
  })();
  const birthRow = h('div',{class:'r-row', style:'grid-template-columns:1fr 26mm'},
    h('div',{class:'c', text:birthText}),
    h('div',{class:'c center', text:p.gender ? '性別　' + p.gender : '性別'}));

  const idRows = h('div',{class:'r-rows', style:'display:flex;flex-direction:column'}, nameRow, birthRow);
  const idWrap = h('div',{class:'r-idwrap'}, idRows,
    h('div',{}, photoBox, h('div',{class:'r-ph-cap', text:p.photoDataUrl? '' : '写真'})));
  a4.append(idWrap);

  /* 주소·연락처 블록 */
  const addr = h('div',{class:'r-rows', style:'margin-top:2.5mm'},
    h('div',{class:'r-row hist', style:'grid-template-columns:1fr;min-height:6mm'},
      h('div',{class:'c', style:'min-height:6mm'},
        h('div',{class:'r-kana-line'},                       /* v2.33: 주소 칵나도 동일 배치 */
          h('span',{class:'r-kana-label', text:'ふりがな'}),
          h('span',{class:'r-kana-val', text:p.addressKana||''})))),
    h('div',{class:'r-row hist', style:'grid-template-columns:18mm 1fr'},
      h('div',{class:'c center', text:'現住所'}),
      h('div',{class:'c', text:(p.postal ? '〒' + p.postal + '　' : '') + (p.address || '')})),
    h('div',{class:'r-row hist', style:'grid-template-columns:18mm 1fr 22mm 1fr'},
      h('div',{class:'c center', text:'電話'}), h('div',{class:'c', text:p.phone||''}),
      h('div',{class:'c center', text:'E-mail'}), h('div',{class:'c', text:p.email||''}))
  );
  a4.append(addr);

  /* 학력·직력 블록 (고정 행수로 1페이지 유지) */
  const hist = historyRows();
  const TOTAL = 11; const blankCount = Math.max(2, TOTAL - hist.length);
  const histGrid = h('div',{class:'r-rows', style:'margin-top:2.5mm'});
  histGrid.append(h('div',{class:'r-sect', text:'学　歴'}));
  /* 학력/직력을 한 그리드에: 学歴 header → 학력 rows → 職歴 header → 직력 rows */
  const eduList = [], workList = [];
  for (const r of hist){ (r.kind === 'edu' ? eduList : workList).push(r); }   /* v2.30: kind 태그 분류(캔버스 렌더러와 통일) */
  eduList.forEach(r=> histGrid.append(histRow(r)));
  histGrid.append(h('div',{class:'r-sect', text:'職　歴'}));
  workList.forEach(r=> histGrid.append(histRow(r)));
  for (let i=0;i<blankCount;i++) histGrid.append(histRow(null));
  /* 「以上」행 */
  histGrid.append(h('div',{class:'r-row hist', style:'grid-template-columns:1fr'},
    h('div',{class:'c', style:'justify-content:flex-end;padding-right:6mm', text:'以　上'})));
  a4.append(histGrid);

  /* 자격 블록 */
  const licGrid = h('div',{class:'r-rows', style:'margin-top:2.5mm'});
  licGrid.append(h('div',{class:'r-sect', text:'免許・資格'}));
  const lics = s.licenses.filter(l=>l.year||l.name.trim());
  lics.forEach(l=> licGrid.append(    /* v2.30: slice(0,4) 캡 폐지 — 5개째 이후 資格 조용한 유실 방지 */
    h('div',{class:'r-row hist', style:'grid-template-columns:18mm 15mm 1fr'},
      h('div',{class:'c center', text: l.year? fmtYM(l.year,l.month):''}),
      h('div',{class:'c center', text: l.month? l.month+'月':''}),
      h('div',{class:'c', text:l.name||''}))));
  for (let i=lics.length;i<3;i++) licGrid.append(
    h('div',{class:'r-row hist', style:'grid-template-columns:18mm 15mm 1fr'},
      h('div',{class:'c'}), h('div',{class:'c'}), h('div',{class:'c'})));
  a4.append(licGrid);

  /* 志望動機 · 本人希望欄 (v2.32: 설정에서 OFF 시 섹션째로 미출력 —
     Web応募/企業指定書式처럼 두 란이 불필요한 사용자에게 빈 박스가 어색하게 남지 않도록.
     입력 내용은 store에 그대로 보존, 프린트/PNG와도 동일 플래그 공유) */
  if (s.settings.showMot !== false){
    const motGrid = h('div',{class:'r-rows', style:'margin-top:2.5mm'});
    motGrid.append(h('div',{class:'r-sect', text:'志望の動機'}));
    motGrid.append(h('div',{class:'r-row r-mot', style:'grid-template-columns:1fr'},
      h('div',{class:'c', style:'min-height:22mm', text:s.motivation||''})));   /* v2.30: 압축 */
    a4.append(motGrid);
  }
  if (s.settings.showReq !== false){
    const reqGrid = h('div',{class:'r-rows', style:'margin-top:2.5mm'});
    reqGrid.append(h('div',{class:'r-sect', text:'本人希望欄'}));
    reqGrid.append(h('div',{class:'r-row r-mot', style:'grid-template-columns:1fr'},
      h('div',{class:'c', style:'min-height:10mm', text:s.requests||'貴社の規定に従います。'})));   /* v2.30: 압축 */
    a4.append(reqGrid);
  }

  return a4;
}
function histRow(r){
  return h('div',{class:'r-row hist', style:'grid-template-columns:18mm 15mm 1fr'},
    h('div',{class:'c center', text: r ? fmtYM(r.y, r.m) : ''}),
    h('div',{class:'c center', text: (r && r.m) ? r.m + '月' : ''}),
    h('div',{class:'c', text: r ? r.text : ''}));
}
/* --- 職務経歴書 미리보기 DOM --- */
function buildShokumuA4(){
  const s = store.get();
  const a4 = h('div',{ class: s.settings.template==='modern' ? 'a4 tall modern' : 'a4 tall' });
  a4.append(h('h1',{class:'s-title', text:'職務経歴書'}));
  a4.append(h('div',{class:'s-date', text:fmtDateHeader(new Date())}));
  a4.append(h('div',{class:'s-name', text: s.profile.nameKanji || '氏名'}));

  a4.append(h('div',{class:'s-h', text:'職務要約'}));
  a4.append(h('div',{class:'s-box', text: s.workSummary || ''}));

  a4.append(h('div',{class:'s-h', text:'職務経歴'}));
  const jobs = s.workHistory.filter(j=>j.startY||j.company.trim());
  if (!jobs.length) a4.append(h('div',{class:'s-box', text:''}));
  for (const j of jobs){
    const period = fmtYM(j.startY,j.startM) + (j.startM? j.startM+'月':'') + ' 〜 ' +
      (j.endY ? fmtYM(j.endY,j.endM)+(j.endM? j.endM+'月':'') : '現在');
    a4.append(h('div',{class:'s-job'},
      h('div',{class:'j-head'}, h('span',{text:j.company||''}), h('span',{text:period})),
      h('div',{class:'j-role', text:j.role||''})));
  }

  const licText = s.licenses.filter(l=>l.name.trim())
    .map(l => (l.year? fmtYM(l.year,l.month)+(l.month?l.month+'月 ':''):'') + l.name).join('\n');
  a4.append(h('div',{class:'s-h', text:'免許・資格'}));
  a4.append(h('div',{class:'s-box', text: licText}));

  a4.append(h('div',{class:'s-h', text:'自己PR'}));
  a4.append(h('div',{class:'s-box', text: s.selfPr || ''}));
  return a4;
}
/* --- 미리보기 반영 + 스케일 맞춤 --- */
let mmProbePx = null;
function mmToPx(mm){
  if (!mmProbePx){
    const probe = h('div',{ style:'position:absolute;visibility:hidden;width:100mm;height:100mm;padding:0' });
    document.body.append(probe);
    mmProbePx = probe.offsetWidth / 100; probe.remove();
  }
  return mm * mmProbePx;
}
function fitA4(a4El, fitEl){
  if (!a4El || !fitEl) return;
  const w = fitEl.clientWidth - 2; if (w <= 0) return;
  const pageW = mmToPx(210), pageH = mmToPx(297);
  let scale = Math.min(1, w / pageW);
  /* 데스크탑(sticky 미리보기): 뷰포트 '높이' 안에 A4 1페이지 전체가 온전히 보이도록 추가 축소.
     노트북 등 세로가 짧은 화면에서 미리보기 하단이 잘려본문 스크롤이 필요했던 문제 수정 (v2.25) */
  try{
    if (window.matchMedia('(min-width:1024px)').matches){
      let topOff = 136;                                       // CSS .pv-col sticky top 값과 동기화(기본값)
      const col = fitEl.closest ? fitEl.closest('.pv-col') : null;
      if (col){ const t = parseFloat(getComputedStyle(col).top); if (isFinite(t)) topOff = t; }
      const tb = fitEl.parentElement ? fitEl.parentElement.querySelector('.pv-toolbar') : null;
      const toolbarH = tb ? (tb.offsetHeight + 8) : 0;
      const availH = window.innerHeight - topOff - toolbarH - 16;   // 하단 여유 16px
      if (availH > 200){
        const visibleH = Math.min(a4El.offsetHeight || pageH, pageH); // 다페이지(.tall) 문서는 1페이지 기준
        scale = Math.min(scale, availH / visibleH);
        scale = Math.max(scale, 0.34);                        // 과도한 축소 방지 하한(최악의 짧은 화면은 스크롤 허용)
      }
    }
  }catch(e){ /* 측정 실패 시 폭 맞춤만 적용 */ }
  a4El.style.transform = 'scale(' + scale + ')';
  a4El.style.marginLeft = Math.max(0, Math.floor((w - pageW * scale) / 2)) + 'px';  // 축소 시 좌우 가울데 정렬
  fitEl.style.height = Math.ceil(a4El.offsetHeight * scale + 8) + 'px';
}
function renderPreview(){
  const host = $('a4Preview');
  host.replaceChildren();
  const fresh = buildRirekiA4();               // 새 DOM으로 교체
  host.parentNode.replaceChild(fresh, host);
  fresh.id = 'a4Preview';
  fitA4(fresh, $('pvFit1'));
  /* v2.30: A4 초과 시 배지 표시 — 종전엔 화면엔 보이는데 인쇄/PNG에서만 잘려 사용자가 인지 불가능했음 */
  try{
    const wn = $('pvWarn1');
    if (wn) wn.hidden = fresh.offsetHeight <= mmToPx(297) + 2;
  }catch(e){}
}
function renderPreview2(){
  const host = $('a4Preview2');
  const fresh = buildShokumuA4();
  host.parentNode.replaceChild(fresh, host);
  fresh.id = 'a4Preview2';
  fitA4(fresh, $('pvFit2'));
}
/* 창 크기 변경/탭 전환 시 재피팅 */
function bindPreviewFit(){
  const refitAll = ()=>{ fitA4($('a4Preview'),$('pvFit1')); fitA4($('a4Preview2'),$('pvFit2')); fitA4($('a4PreviewT'),$('pvFit3')); fitA4($('a4PreviewS'),$('pvFit4')); };
  try{
    if (typeof ResizeObserver === 'function'){
      const ro = new ResizeObserver(refitAll);
      ro.observe($('pvFit1')); ro.observe($('pvFit2')); ro.observe($('pvFit3')); ro.observe($('pvFit4'));
    }
  }catch(e){ /* RO 미지원 환경은 아래 resize 리스너로 커버 */ }
  /* 뷰포트 '높이' 변화(창 세로 리사이즈/회전)는 RO가 감지 못하므로 항상 함께 리스닝 (v2.25) */
  window.addEventListener('resize', refitAll);
  window.addEventListener('orientationchange', refitAll);
  /* 확대 표시: 4개 문서 공용 (v2.34: 기존 이력서 전용에서 職務経歴書/退職届/送付状로 확장 — 사용자 요청)
     클론을 dlgZoom의 zoomBox에 넣고 폭 맞춤 스케일링. 다이얼로그는 하나를 재사용 */
  const ZOOM_DOCS = [
    ['pvZoomBtn',  'a4Preview',  '履歴書'],
    ['pvZoomBtn2', 'a4Preview2', '職務経歴書'],
    ['pvZoomBtn3', 'a4PreviewT', '退職届 / 退職願'],
    ['pvZoomBtn4', 'a4PreviewS', '送付状']
  ];
  for (const [btnId, prevId, label] of ZOOM_DOCS){
    const btn = $(btnId); if (!btn) continue;
    btn.addEventListener('click', ()=>{
      const src = $(prevId); if (!src) return;
      const tt = $('zoomTitle'); if (tt) tt.textContent = label + ' — 拡大表示';
      const box = $('zoomBox'); box.replaceChildren();
      const clone = src.cloneNode(true);   // DOM 복제(innerHTML 미사용)
      clone.style.transform = 'none';
      clone.style.marginLeft = '0';
      box.append(clone);
      openDlg($('dlgZoom'));
      /* 확대 다이얼로그: 폭에 맞춰 스케일링해 가로 스크롤 제거 — 세로로만 읽으면 됨 (v2.25) */
      requestAnimationFrame(()=>{
        try{
          const bw = box.clientWidth - 2;
          if (bw > 0){
            const s = Math.min(1, bw / mmToPx(210));
            clone.style.transform = 'scale(' + s + ')';
            clone.style.transformOrigin = 'top left';
            box.style.height = Math.ceil(clone.offsetHeight * s + 4) + 'px';
          }
        }catch(e){ /* 실패 시 원본 크기 그대로 스크롤 */ }
      });
    });
  }
  $('btnZoomClose').addEventListener('click', ()=> closeDlg($('dlgZoom')));
}

/* ================================================================
   11. 인쇄 출력 (printRoot에 복제 후 window.print)
================================================================ */
function printDoc(kind){
  const root = $('printRoot'); root.replaceChildren();
  root.append(kind === 'shokumu' ? buildShokumuA4() : kind === 'taishoku' ? buildTaishokuA4() : kind === 'sofu' ? buildSofuA4() : buildRirekiA4());
  /* 렌더 안정화 후 인쇄 호출 */
  setTimeout(()=>{ try{ window.print(); }catch(e){ toast('印刷に失敗しました', 'error'); } }, 60);
}

/* ================================================================
   11-5. 履歴書 PNG 이미지 익스포트 (프린터 없는 모바일 사용자용)
   - 경쟁 서비스(ヤギッシュ/リクナビ 등)의 PDF/이미지 다운로드와 동급 기능
   - Canvas에 JIS 레이아웃을 직접 래스터화 (DOM 미리보기와 동일 store 데이터 사용)
   - A4 @150dpi (1240×1754) 로 출력 → 휴폐 단위의 선명도
================================================================ */
async function downloadResumePNG(){
  try{
    const test = document.createElement('canvas');
    if (!test.getContext || !test.getContext('2d')) throw new Error('canvas-unsupported');
    const result = await renderResumePNG();
    if (!result || !result.blob) throw new Error('blob-null');
    downloadBlob(result.blob, 'rirekisho-' + todayStr() + '.png');
    if (result.overflow) toast('内容がA4を超えているため、縦長の画像として保存しました（すべての項目が入っています）', 'warn');  /* v2.30 */
    else toast('履歴書のPNG画像を保存しました（ダウンロードフォルダをご確認ください）');
  }catch(e){
    toast('画像の生成に失敗しました。「印刷 / PDF保存」をご利用ください', 'error');
  }
}
async function renderResumePNG(){
  const s = store.get(); const p = s.profile;
  const K = 1240 / 210;                       // mm → px 변환 계수 (A4 @150dpi)
  const cv = document.createElement('canvas'); cv.width = 1240; cv.height = 1754;
  const ctx = cv.getContext('2d');
  const stack = s.settings.template === 'modern'
    ? '"Hiragino Sans","Noto Sans JP","Noto Sans CJK JP","Yu Gothic",Meiryo,sans-serif'
    : '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP","Noto Serif CJK JP","MS Mincho",serif';
  const fset = (mm, bold)=> ctx.font = (bold ? '700 ' : '') + (mm * K) + 'px ' + stack;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.lineCap = 'butt'; ctx.textBaseline = 'middle';
  const bg = s.settings.bgColor || '#ffffff';

  /* --- 사진 (2패스 공용으로 미리 로드) --- */
  const photoImg = p.photoDataUrl ? await new Promise(res=>{
    const im = new Image();
    im.onload = ()=> res(im);
    im.onerror = ()=> res(null);
    setTimeout(()=> res(null), 4000);
    im.src = p.photoDataUrl;
  }) : null;

  /* 본체 레이아웃: 지정 ctx에 그리고 최종 y(mm)를 반환.
     v2.30: ①측정 패스로 실제 소요 높이 산정 → 캔버스를 필요한 높이로 확정 → ②본 패스.
     종전엔 1754px(=297mm) '고정'이라 내용이 넘치면 어떤 경고도 없이 잘려나갔다 */
  const drawAll = (ctx)=>{
    const fset = (mm, bold)=> ctx.font = (bold ? '700 ' : '') + (mm * K) + 'px ' + stack;
    ctx.lineCap = 'butt'; ctx.textBaseline = 'middle';
    const line  = (x1,y1,x2,y2,w)=>{ ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=(w||.35)*K;
      ctx.beginPath(); ctx.moveTo(x1*K,y1*K); ctx.lineTo(x2*K,y2*K); ctx.stroke(); };
    const text  = (t,x,y,mm,align,bold)=>{ fset(mm,!!bold); ctx.fillStyle='#111111';
      ctx.textAlign = align||'left'; ctx.fillText(t, x*K, y*K); };
    const wrap  = (str, mm, maxWmm)=>{          // 폭 초과 시 개행 + 禁則処理(킨소쿠) 적용
      fset(mm,false); const maxW = maxWmm*K; const lines=[]; let cur='';
      const NO_START = '。、）』」!?！？・ー—─…‥ァィゥェォッャュョぁぃぅぇぉっゃゅょ％‰°′″℃'; // 행두금지 문자
      const NO_END   = '（「『【〔［｛〈《';                                       // 행말금지 문자
      for (const ch of String(str)){
        if (ch === '\n'){ lines.push(cur); cur=''; continue; }
        if (cur && ctx.measureText(cur + ch).width > maxW){
          if (NO_START.indexOf(ch) >= 0){ cur += ch; }                                 // 구두점 등은 줄 끝에 매달기(垂れ下げ)
          else if (NO_END.indexOf(cur.charAt(cur.length-1)) >= 0){ lines.push(cur.slice(0,-1)); cur = cur.charAt(cur.length-1) + ch; } // 여는 괄호는 다음 줄로
          else { lines.push(cur); cur = ch; }
        } else cur += ch;
      }
      if (cur) lines.push(cur);
      return lines;
    };

    const L = 14, R = 196;                      // 좌우 기준선(mm)

    /* --- 타이틀 / 날짜 --- */
    text(fmtDateHeader(new Date()), R, 12, 3.6, 'right');
    text('履　歴　書', 105, 20, 8, 'center', true);

    /* --- 신원 블록 (ふりがな / 氏名 / 生年月日+性別) --- */
    const X1 = L, X2 = 158, PHW = 30, PHX = R - PHW;   // 사진 30×40 (JIS)
    let y = 28;
    const idRows = [ {h:7, label:'ふりがな', val:(p.nameKana||'')},
                     {h:14, label:'', val:(p.nameKanji||'氏　　名'), big:true},
                     {h:9, label:'', val:'sex', split:124} ];
    /* v2.38: 氏名 per-part 레이아웃 — 姓かなは姓の真上、名かなは名の真上 (DOM과 동일 관례).
       각 유닛 폭 = 카/나·한자 중 넓은 쪽, 그룹 전체는 신원 칸((X1+X2)/2 중심)에 중앙 정렬 */
    const nmParts2 = splitNameParts(p.nameKanji, p.nameKana);
    let npLayout = null;
    if (nmParts2){
      npLayout = [];
      let total = 0;
      for (const pt of nmParts2){
        fset(3.3,false); ctx.textAlign='left';
        let kW;
        try{ ctx.letterSpacing = (0.6*K)+'px'; kW = ctx.measureText(pt.k).width; ctx.letterSpacing='0px'; }
        catch(e){ kW = ctx.measureText(pt.k).width; }
        fset(7,true);
        const nW = ctx.measureText(pt.n).width;
        const colW = Math.max(kW, nW);
        npLayout.push({ k:pt.k, n:pt.n, colW }); total += colW;
      }
      const GAP = 3*K; total += GAP*(nmParts2.length-1);
      let x = ((X1+X2)*K - total)/2;
      for (const col of npLayout){ col.cx = x + col.colW/2; x += col.colW + GAP; }
    }
    line(X1,y,X2,y);
    let birthLine = '生年月日';
    if (p.birthDate){
      const [by,bm,bdy] = p.birthDate.split('-').map(Number);
      birthLine = '生年月日　' + fmtYM(by,bm) + bm + '月' + bdy + '日生（満' + computeAge(by,bm,bdy) + '歳）';
    }
    for (const r of idRows){
      if (r.big){
        if (npLayout){                                   /* v2.38: 파트별 한자를 유닛 중심에 */
          fset(7,true); ctx.fillStyle='#111111'; ctx.textAlign='center';
          for (const col of npLayout) ctx.fillText(col.n, col.cx, (y + r.h/2)*K);
        } else {
          text(r.val, (X1+X2)/2, y + r.h/2, 7, 'center', true);   /* v2.36: 이름 중앙 정렬 (ふりがな와 세로축 일치) */
        }
      }
      else if (r.val === 'sex'){
        text(birthLine, X1+3, y + r.h/2, 4.2);
        text(p.gender ? '性別　' + p.gender : '性別', r.split+3, y + r.h/2, 4.2);
        line(r.split, y, r.split, y + r.h);
      } else if (r.label){
        /* v2.33: DOM과 동일하게 라벨(左소형)+칵나(칸 전체 중앙) 분리 배치 */
        fset(2.2,false); ctx.fillStyle='#444444'; ctx.textAlign='left';
        ctx.fillText(r.label, (X1+2.4)*K, (y + r.h/2)*K);
        if (r.val && npLayout){                          /* v2.38: 파트별 카/나를 유닛 중심에 */
          fset(3.3,false); ctx.fillStyle='#111111'; ctx.textAlign='center';
          try{
            ctx.letterSpacing = (0.6*K)+'px';
            for (const col of npLayout) ctx.fillText(col.k, col.cx, (y + r.h/2)*K);
            ctx.letterSpacing = '0px';
          }catch(e){ for (const col of npLayout) ctx.fillText(col.k, col.cx, (y + r.h/2)*K); }
        } else if (r.val){
          fset(3.3,false); ctx.fillStyle='#111111'; ctx.textAlign='center';
          try{ ctx.letterSpacing = (0.6*K)+'px'; ctx.fillText(r.val, ((X1+X2)/2)*K, (y + r.h/2)*K); ctx.letterSpacing = '0px'; }
          catch(e){ ctx.fillText(r.val, ((X1+X2)/2)*K, (y + r.h/2)*K); }   // letterSpacing 미지원 방어
        }
      }
      y += r.h; line(X1, y, X2, y);
    }
    line(X1, 28, X1, y); line(X2, 28, X2, y);
    /* 사진 박스/이미지 */
    line(PHX, 28, R, 28); line(PHX, 68, R, 68); line(PHX, 28, PHX, 68); line(R, 28, R, 68);
    if (photoImg){
      /* 3:4 커버 크롭 (결과 캔버스는 이미 3:4지만 방어적 처리) */
      const sw = photoImg.width, sh = photoImg.height, target = 3/4;
      let sx=0, sy=0, cw=sw, ch=sh;
      if (sw/sh > target) cw = sh*target, sx = (sw-cw)/2; else ch = sw/target, sy = (sh-ch)/2;
      ctx.fillStyle = bg; ctx.fillRect((PHX+.4)*K, (28.4)*K, (PHW-.8)*K, (40-.8)*K);
      ctx.drawImage(photoImg, sx, sy, cw, ch, (PHX+.4)*K, 28.4*K, (PHW-.8)*K, (40-.8)*K);
    } else {
      fset(3.2,false); ctx.fillStyle='#666666'; ctx.textAlign='center';
      ctx.fillText('写真を貼る位置', (PHX+PHW/2)*K, 47*K);
      ctx.fillText('(縦4cm×横3cm)', (PHX+PHW/2)*K, 52*K);
    }

    /* --- 주소·연락처 블록 (사진 박스 하단 y=68 아래에서 시작 → 겹침 방지) --- */
    y = 72; const addrRows = [
      { h:6,  v:'kana', val:(p.addressKana||'') },   /* v2.33: 칵나 전용 행 — 라벨+중앙 정렬 렌더 */
      { h:10, v: '現住所　' + (p.postal ? '〒' + p.postal + '　' : '') + (p.address||'') },
      { h:8,  v:'tel', split:96 }
    ];
    line(X1, y, R, y);
    for (const r of addrRows){
      if (r.v === 'kana'){
        fset(2.2,false); ctx.fillStyle='#444444'; ctx.textAlign='left';
        ctx.fillText('ふりがな', (X1+2.4)*K, (y + r.h/2)*K);
        if (r.val){
          fset(3.2,false); ctx.fillStyle='#111111'; ctx.textAlign='center';
          try{ ctx.letterSpacing = (0.5*K)+'px'; ctx.fillText(r.val, ((X1+R)/2)*K, (y + r.h/2)*K); ctx.letterSpacing = '0px'; }
          catch(e){ ctx.fillText(r.val, ((X1+R)/2)*K, (y + r.h/2)*K); }
        }
      } else if (r.v === 'tel'){
        text('電話　' + (p.phone||''), X1+3, y + r.h/2, r.small?3:4.2);
        text('Eメール　' + (p.email||''), r.split+3, y + r.h/2, 4.2);
        line(r.split, y, r.split, y + r.h);
      } else {
        text(r.v, X1+3, y + r.h/2, r.small ? 3 : 4.2);
      }
      y += r.h; line(X1, y, R, y);
    }
    line(X1, y - 24, X1, y); line(R, y - 24, R, y);

    /* --- 학력·직력 그리드 --- */
    const C1 = 18, C2 = 15;   // 年 폭 / 月 폭
    const hist = historyRows();
    const eduR = [], workR = [];
    for (const r of hist){ (r.kind === 'work' ? workR : eduR).push(r); }   /* v2.30: 분류 버그 수정 — 종전 '現在に至る'가 学歴 블록에 들어감 */
    const HK = 6.8;
    const sect = (label)=>{
      y += 4; text(label, 105, y + HK/2, 4.4, 'center', true);
      line(X1,y,R,y,.35); y += HK; line(X1,y,R,y,.35);
      /* v2.33: セクション見出し行은 전폭(年/月 칸분할 없음) — DOM 미리보기·공식 양식과 일치 */
      line(X1,y-HK,X1,y); line(R,y-HK,R,y);
    };
    const row = (r, center)=>{
      if (r && center !== true){
        text(fmtYM(r.y, r.m), X1+C1/2, y + HK/2, 3.6, 'center');
        text(r.m ? r.m+'月' : '', X1+C1+C2/2, y + HK/2, 3.6, 'center');
        text(r.text, X1+C1+C2+3, y + HK/2, 4, 'left');
      } else if (r && center === true){
        /* 「以　上」행도 전폭 — 우측 정렬 텍스트만 (v2.33) */
        text('以　上', R-8, y + HK/2, 4, 'right');
      }
      line(X1,y,R,y,.3); line(X1,y+HK,R,y+HK,.3);
      line(X1,y,X1,y+HK); line(R,y,R,y+HK);
      if (!center){ line(X1+C1,y,X1+C1,y+HK); line(X1+C1+C2,y,X1+C1+C2,y+HK); }
      y += HK;
    };
    const blankTotal = Math.max(2, 11 - (eduR.length + workR.length));
    sect('学　歴'); eduR.forEach(r=>row(r));
    sect('職　歴'); workR.forEach(r=>row(r));
    for (let i=0;i<blankTotal;i++) row(null);
    row({ y:0, m:0, text:'以上' }, true);

    /* --- 자격 블록 --- */
    y += 2; sect('免許・資格');
    const lics = s.licenses.filter(l=> l.year || l.name.trim());   /* v2.30: slice(0,4) 캡 폐지 — 자격 조용한 유실 방지 */
    lics.forEach(l=> row({ y:l.year, m:l.month, text:l.name||'' }));
    for (let i=lics.length;i<3;i++) row(null);

    /* --- 지원동기 / 희망사항 (박스 + 자동개행) --- */
    const boxText = (label, body, fallback)=>{
      y += 2; sect(label);
      const inner = (body||'').trim() || fallback;
      const lines = wrap(inner, 4, R - X1 - 8);
      const needH = Math.max(10, lines.length * 5.6 + 4);   /* v2.30: 상한 폐지 — 문장이 절대 잘리지 않게 박스를 내용만큼 키움 */
      line(X1,y,R,y,.3); line(X1,y,X1,y+needH); line(R,y,R,y+needH); line(X1,y+needH,R,y+needH,.3);
      lines.forEach((ln,i)=> text(ln, X1+4, y + 4 + 2.8 + i*5.6, 4));
      y += needH;
    };
    /* v2.32: DOM 미리보기와 동일하게 표시 플래그 적용 — PNG에서도 OFF 섹션 제외 */
    if (s.settings.showMot !== false) boxText('志望の動機', s.motivation, '');
    if (s.settings.showReq !== false) boxText('本人希望欄', s.requests, '貴社の規定に従います。');
    return y;
  };

  /* ① 측정 패스(1×1 캔버스로 높이만 계산) ② 높이 확정 후 본 패스 */
  const probe = document.createElement('canvas');
  const yEnd = drawAll(probe.getContext('2d'));
  const overflow = yEnd > 297;
  if (overflow){ cv.height = Math.ceil((yEnd + 4) * K); }   // A4 초과 시 세로 연장 — 내용 100% 보존
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
  drawAll(ctx);
  return new Promise(res=> cv.toBlob(b=> res({ blob:b, overflow }), 'image/png'));
}

/* ================================================================
   12. 写真スタジ오
   파이프라인: 업로드 → 정규화(≤1600px) → 크롭(3:4) → 마스크(크로마키)
   → 브러시 보정 → 프리셋/슬라이더 보정 → 결과 저장/삽입/시트
================================================================ */
const CW = 450, CH = 600;                    // 크롭 캔버스 표시 크기(3:4)
const photoS = {                             // 사진 작업 상태 (영속 대상 아님)
  src:null, zoom:1, ox:0, oy:0,              // 원본 작업 캔버스 / 크롭 상태
  cropped:null, mask:null, result:null,      // 단계별 캔버스
  preset:'standard', tol:45, bri:100, con:100, sat:100,
  brush:null, brushSize:30, drag:null
};
function setStep(n){
  for (let i=1;i<=4;i++){ const el = $('st'+i); el.classList.toggle('done', i<=n); }
}
/* --- 12-1. 업로드 --- */
function bindPhotoUpload(){
  const dz = $('dz'), fi = $('fileInput');
  $('btnPick').addEventListener('click', (e)=>{ e.stopPropagation(); fi.click(); });
  dz.addEventListener('click', ()=> fi.click());
  dz.addEventListener('keydown', (e)=>{ if (e.key==='Enter'||e.key===' '){ e.preventDefault(); fi.click(); } });
  ['dragover','dragenter'].forEach(ev => dz.addEventListener(ev, (e)=>{ e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, (e)=>{ e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', (e)=>{ const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) loadPhotoFile(f); });
  fi.addEventListener('change', ()=>{ if (fi.files && fi.files[0]) loadPhotoFile(fi.files[0]); fi.value=''; });
}
async function loadPhotoFile(file){
  try{
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)){ toast('JPG/PNG/WebP形式の画像のみアップロードできます', 'error'); return; }
    if (file.size > PHOTO_MAX_BYTES){ toast('写真は15MB以下でアップロードしてください', 'error'); return; }
    toast('写真を読み込んでいます…');
    let bmp;
    try{ bmp = await createImageBitmap(file); }
    catch(e){ bmp = await loadImageFallback(file); }
    /* 정규화: 최대 변 1600px로 축소 (성능/메모리 보호) */
    const maxDim = Math.max(bmp.width, bmp.height);
    const scale = Math.min(1, 1600 / maxDim);
    const w = Math.round(bmp.width*scale), hgt = Math.round(bmp.height*scale);
    const cv = document.createElement('canvas'); cv.width=w; cv.height=hgt;
    cv.getContext('2d').drawImage(bmp, 0,0,w,hgt);
    if (bmp.close) bmp.close();
    photoS.src = cv; photoS.zoom=1; photoS.ox=0; photoS.oy=0;
    $('cropStage').classList.remove('hidden');
    $('editPanel').classList.add('hidden');
    $('rngZoom').value = 100;
    applyPhotoDefaults();
    setStep(2); drawCrop();
    toast('写真を読み込みました。範囲を決めてください');
  }catch(e){ console.error(e); toast('画像の読み込みに失敗しました', 'error'); }
}
function loadImageFallback(file){                    // 구형 브라우저 폐핑
  return new Promise((res, rej)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{ URL.revokeObjectURL(url); res(img); };
    img.onerror = rej; img.src = url;
  });
}
function applyPhotoDefaults(){                        // 설정의 기본 배경색 반영
  const bg = store.get().settings.bgColor;
  const radio = document.querySelector('input[name="bgSel"][value="'+bg+'"]');
  if (radio) radio.checked = true;
}
/* --- 12-2. 크롭 (드래그 이동 + 휠/슬라이더 줌) --- */
function bindCrop(){
  const cv = $('cvCrop');
  cv.addEventListener('pointerdown', (e)=>{
    cv.setPointerCapture(e.pointerId);
    photoS.drag = { x:e.clientX, y:e.clientY, ox:photoS.ox, oy:photoS.oy };
  });
  cv.addEventListener('pointermove', (e)=>{
    if (!photoS.drag || !photoS.src) return;
    photoS.ox = photoS.drag.ox + (e.clientX - photoS.drag.x);
    photoS.oy = photoS.drag.oy + (e.clientY - photoS.drag.y);
    drawCrop();
  });
  ['pointerup','pointercancel'].forEach(ev => cv.addEventListener(ev, ()=>{ photoS.drag=null; }));
  cv.addEventListener('wheel', (e)=>{
    if (!photoS.src) return;
    e.preventDefault();
    photoS.zoom = clamp(photoS.zoom * (e.deltaY < 0 ? 1.08 : 0.92), 1, 3);
    $('rngZoom').value = Math.round(photoS.zoom*100);
    drawCrop();
  }, { passive:false });
  $('rngZoom').addEventListener('input', ()=>{ photoS.zoom = clamp(+$('rngZoom').value/100,1,3); drawCrop(); });
  $('btnCropOk').addEventListener('click', doCrop);
  $('btnCropCancel').addEventListener('click', ()=>{
    $('cropStage').classList.add('hidden'); photoS.src=null; setStep(1);
  });
}
function drawCrop(){
  if (!photoS.src) return;
  const ctx = $('cvCrop').getContext('2d');
  const iw = photoS.src.width, ih = photoS.src.height;
  const s = Math.max(CW/iw, CH/ih) * photoS.zoom;
  const w = iw*s, hgt = ih*s;
  photoS.ox = clamp(photoS.ox, Math.min(0, CW-w), 0);
  photoS.oy = clamp(photoS.oy, Math.min(0, CH-hgt), 0);
  ctx.fillStyle = '#111'; ctx.fillRect(0,0,CW,CH);
  ctx.drawImage(photoS.src, photoS.ox, photoS.oy, w, hgt);
}
function doCrop(){
  const iw = photoS.src.width, ih = photoS.src.height;
  const s = Math.max(CW/iw, CH/ih) * photoS.zoom;
  const sx = -photoS.ox/s, sy = -photoS.oy/s, sw = CW/s, sh = CH/s;
  const outW = Math.min(1200, Math.max(360, Math.round(sw)));
  const outH = Math.round(outW*4/3);
  const cv = document.createElement('canvas'); cv.width=outW; cv.height=outH;
  cv.getContext('2d').drawImage(photoS.src, sx, sy, sw, sh, 0, 0, outW, outH);
  photoS.cropped = cv;
  buildMask();                                        // 크로마키 마스크 생성
  $('cropStage').classList.add('hidden');
  $('editPanel').classList.remove('hidden');
  setStep(3);
  composite();
  toast('範囲を確定しました。背景と補正を調整してください');
}
/* --- 12-3. 배경 제거 마스크 (모서리 색 샘플 + 가장자리 연결 BFS 플러드필) ---
   v2.36 근본 수정: 종전은 '배경색과 거리가 가까운 픽셀을 화면 전체에서 제거'하는 전역 크로마키라,
   코 끝의 밝은 하이라이트나 흰 와이셔츠처럼 인물 "내부"의 밝은 영역까지 배경으로 오판해 지워버리는
   심각한 결함이 있었다 (흰 얼룩·화질 붕괴의 원인).
   → ①배경색 유사 픽셀이더라도 가장자리(테두리)와 연결된 영역만 배경으로 인정(BFS),
     ②인물 내부 픽셀은 색이 아무리 비슷하든 절대 지우지 않음,
     ③경계는 feather 대역 부분 알파 + 3×3 블러로 부드럽게. */
function buildMask(){
  const src = photoS.cropped, w = src.width, hgt = src.height;
  const ctx = src.getContext('2d');
  const data = ctx.getImageData(0,0,w,hgt).data;
  const N = w * hgt;
  /* 모서리 4점 8×8 평균 → 배경 기준색.
     v2.36+: 모서리끼리 색이 크게 다륾면(옷·인물이 모서리까지 닿은 경우) 초상권 사진 특성상
     '위쪽 모서리 = 배경'이 가장 안전하므로 상단 2점만 사용해 기준색 오염을 막는다 */
  const pts = [[0,0],[w-8,0],[0,hgt-8],[w-8,hgt-8]];
  const corners = pts.map(([px,py])=>{
    let r=0,g=0,b=0,n2=0;
    for (let y=py;y<py+8;y++) for (let x=px;x<px+8;x++){
      const i=(y*w+x)*4; r+=data[i]; g+=data[i+1]; b+=data[i+2]; n2++;
    }
    return [r/n2, g/n2, b/n2];
  });
  let pairMax = 0;
  for (let a=0;a<4;a++) for (let b=a+1;b<4;b++){
    const d=Math.hypot(corners[a][0]-corners[b][0], corners[a][1]-corners[b][1], corners[a][2]-corners[b][2]);
    if (d>pairMax) pairMax=d;
  }
  const pool = pairMax > 60 ? [corners[0], corners[1]] : corners;   // 불일치 시 상단 모서리 우선
  let kr=0, kg=0, kb=0, n=0;
  for (const c of pool){ kr+=c[0]; kg+=c[1]; kb+=c[2]; n++; }
  kr/=n; kg/=n; kb/=n;
  const t0 = photoS.tol * 2.0, t1 = t0 * 1.45;        // 내부 유사도 임계 + 페더링 경계
  /* 이웃 스텝 상한: 실물 스마트폰 사진의 어깨/옷깃 초점면은 1~3px로 비교적 선명해 코어 스텝이
     9~25/px, 배경 벽의 조명 그라디언트는 0.1~3/px → 9 근처에서 둘을 가른다.
     ※ 순백 셔츠 × 순백 벽처럼 색 자체가 동일한 경우는 물리적으로 구분 불가 → UI 힌트+브러시로 안내 */
  const tLoc = Math.max(9, t0*0.1);
  /* 1) 각 픽셀과 배경 기준색의 거리 맵 */
  const dist = new Float32Array(N);
  for (let p=0, i=0; p<N; p++, i=p*4){
    const dr=data[i]-kr, dg=data[i+1]-kg, db=data[i+2]-kb;
    dist[p] = Math.sqrt(dr*dr+dg*dg+db*db);
  }
  /* 2) 가장자리 연결 배경 판정 (BFS): 테두리에서 시작해 '배경 유사색'으로 이어진 픽셀만 isBg.
     v2.36+: 이중 제약 — ①배경 기준색과의 거리 ≤ t0, ②전파 시 이웃 픽셀과의 색 스텝 ≤ tLoc.
     ②가 어깨·옷깃의 희미한 윤곽선(그림자·색변화)에서 플러드를 멈춰줘,
     배경색과 비슷한 밝은 옷까지 삼켜버리는 문제를 최대한 억제한다 */
  const isBg = new Uint8Array(N);
  const stack = new Int32Array(N); let sp = 0;
  /* 시드 이중 기준: 상단 변은 t0(머리 위 배경이 가장 확실), 좌우·하단 변은 t0*0.45로 엄격하게 —
     하단/측면 테두리를 채우는 밝은 '옷'이 시드로 오인돼 통째로 삼켜지는 것을 차단.
     벽이 비네트 등으로 다소 어두워도(t0*0.45 이내) 정상 시드되도록 여유는 유지 */
  const tSeed = t0 * 0.45;
  const seedTop  = (idx)=>{ if (!isBg[idx] && dist[idx] <= t0){ isBg[idx]=1; stack[sp++]=idx; } };
  const seedSide = (idx)=>{ if (!isBg[idx] && dist[idx] <= tSeed){ isBg[idx]=1; stack[sp++]=idx; } };
  for (let x=0;x<w;x++){ seedTop(x); seedSide((hgt-1)*w+x); }
  for (let y=0;y<hgt;y++){ seedSide(y*w); seedSide(y*w + w-1); }
  while (sp){
    const idx = stack[--sp];
    const x = idx % w, y = (idx / w) | 0;
    const fi = idx*4;
    const tryRel = (to)=>{                        // 전파: 유사색 + 이웃 스텝 모두 만족해야
      if (isBg[to] || dist[to] > t0) return;
      const ti = to*4;
      const dr=data[fi]-data[ti], dg=data[fi+1]-data[ti+1], db=data[fi+2]-data[ti+2];
      if (dr*dr+dg*dg+db*db > tLoc*tLoc) return;
      isBg[to]=1; stack[sp++]=to;
    };
    if (x>0) tryRel(idx-1);
    if (x<w-1) tryRel(idx+1);
    if (y>0) tryRel(idx-w);
    if (y<hgt-1) tryRel(idx+w);
  }
  /* 3) 알파 맵: 배경=0 / 인물=255 / 배경에 맞닿은 feather 대역 경계 픽셀은 부분 알파 */
  const alpha = new Uint8ClampedArray(N);
  for (let p=0;p<N;p++){
    if (isBg[p]){ alpha[p]=0; continue; }
    const x=p%w, y=(p/w)|0;
    const edge = (x>0 && isBg[p-1]) || (x<w-1 && isBg[p+1]) || (y>0 && isBg[p-w]) || (y<hgt-1 && isBg[p+w]);
    alpha[p] = edge ? clamp(Math.round((dist[p]-t0)/(t1-t0)*255), 0, 255) : 255;
  }
  /* 4) 경계 3×3 박스 블러 (계단 현상 완화 — 내부는 인접 픽셀이 전부 255라 영향 없음) */
  const blur = new Uint8ClampedArray(N);
  for (let y=0;y<hgt;y++) for (let x=0;x<w;x++){
    let s=0, c=0;
    for (let dy=-1;dy<=1;dy++){ const yy=y+dy; if (yy<0||yy>=hgt) continue;
      for (let dx=-1;dx<=1;dx++){ const xx=x+dx; if (xx<0||xx>=w) continue;
        s += alpha[yy*w+xx]; c++; } }
    blur[y*w+x] = s/c;
  }
  const mask = document.createElement('canvas'); mask.width=w; mask.height=hgt;
  const mctx = mask.getContext('2d');
  const mi = mctx.createImageData(w,hgt);
  for (let p=0, i=0; p<N; p++, i=p*4) mi.data[i+3] = blur[p];   // 알파 = 인물 유지량
  mctx.putImageData(mi,0,0);
  photoS.mask = mask;
}
/* --- 12-4. 합성 파이프라인 (마스크→보정→배경 합성→표시) --- */
function composite(){
  if (!photoS.cropped || !photoS.mask) return;
  const w = photoS.cropped.width, hgt = photoS.cropped.height;
  const P = PRESETS[photoS.preset];
  /* 1) 인물 레이어 준비 (원본 RGB 복사)
     v2.36: 샤프닝은 마스크 적용 '전'에 수행한다. 종전엔 마스크 적용 후(투명 가장자리RGB=블랙)에
     언샤프를 걸어 인물 윤곽에 검은 헤일로가 생기는 화질 결함이 있었다 → 원본에서 샤프닝 후 마스킹으로 해결 */
  const person = document.createElement('canvas'); person.width=w; person.height=hgt;
  const pctx = person.getContext('2d');
  pctx.drawImage(photoS.cropped,0,0);
  /* 2) 샤프닝 (언샤프 3×3, 불투명 원본에서만 수행 → compounding 없음) */
  if (P.sharp) sharpen(person);
  /* 3) 마스크 적용 (인물만 추출) */
  pctx.globalCompositeOperation = 'destination-in';
  pctx.drawImage(photoS.mask,0,0);
  pctx.globalCompositeOperation = 'source-over';
  /* 4) 자동 조명 보정 (평균 휘도 → 0.55 타깃) */
  let briAdj = 1;
  if (P.auto){
    try{
      const id = pctx.getImageData(0,0,w,hgt).data;
      let sum=0, cnt=0;
      for (let i=0;i<id.length;i+=16){                 // 4픽셀 간격 샘플링
        if (id[i+3] > 40){ sum += (0.299*id[i]+0.587*id[i+1]+0.114*id[i+2])/255; cnt++; }
      }
      if (cnt>0) briAdj = clamp(0.55/(sum/cnt), .8, 1.25);
    }catch(e){ console.warn('자동 밝기 생략:', e); }
  }
  /* 4) 보정 필터 적용본 생성 */
  const fb = clamp((photoS.bri/100)*(P.bri/100)*briAdj, .5, 2);
  const fc = (photoS.con/100)*(P.con/100);
  const fs = (photoS.sat/100)*(P.sat/100);
  const toned = document.createElement('canvas'); toned.width=w; toned.height=hgt;
  const tctx = toned.getContext('2d');
  tctx.filter = 'brightness('+fb.toFixed(3)+') contrast('+fc.toFixed(3)+') saturate('+fs.toFixed(3)+')'
              + (P.sepia ? ' sepia('+(P.sepia/100)+')' : '');
  tctx.drawImage(person,0,0);
  /* 5) 배경 합성 */
  const bg = document.querySelector('input[name="bgSel"]:checked');
  const out = document.createElement('canvas'); out.width=w; out.height=hgt;
  const octx = out.getContext('2d');
  octx.fillStyle = bg ? bg.value : '#ffffff'; octx.fillRect(0,0,w,hgt);
  octx.drawImage(toned,0,0);
  /* 6) 비네트(스튜디오 프리셋) */
  if (P.vig){
    const g = octx.createRadialGradient(w/2,hgt/2, Math.min(w,hgt)*.35, w/2,hgt/2, Math.max(w,hgt)*.75);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.25)');
    octx.fillStyle = g; octx.fillRect(0,0,w,hgt);
  }
  photoS.result = out;
  displayResult();
}
function displayResult(){
  const cv = $('cvEdit'); const ctx = cv.getContext('2d');
  ctx.clearRect(0,0,cv.width,cv.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(photoS.result, 0,0, cv.width, cv.height);
}
/* 비교 모드: 필터만 적용한 "원본 베이스" 표시 */
function displayOriginal(){
  if (!photoS.cropped) return;
  const w=photoS.cropped.width, hgt=photoS.cropped.height;
  const bg = document.querySelector('input[name="bgSel"]:checked');
  const tmp = document.createElement('canvas'); tmp.width=w; tmp.height=hgt;
  const c = tmp.getContext('2d');
  c.filter = 'brightness('+(photoS.bri/100)+') contrast('+(photoS.con/100)+') saturate('+(photoS.sat/100)+')';
  c.fillStyle = bg?bg.value:'#fff'; c.fillRect(0,0,w,hgt);
  c.drawImage(photoS.cropped,0,0);
  const cv = $('cvEdit');
  cv.getContext('2d').drawImage(tmp,0,0,cv.width,cv.height);
}
/* 샤프닝: 3×3 컨볼루션 [0,-1,0,-1,5,-1,0,-1,0] (패딩=가장자리 복사) */
function sharpen(cv){
  const ctx = cv.getContext('2d');
  const w=cv.width, hgt=cv.height;
  const src = ctx.getImageData(0,0,w,hgt);
  const dst = ctx.createImageData(w,hgt);
  const S=src.data, D=dst.data;
  for (let y=0;y<hgt;y++) for (let x=0;x<w;x++){
    const i=(y*w+x)*4;
    if (S[i+3]===0){ D[i+3]=0; continue; }             // 투명부 패스
    for (let ch=0;ch<3;ch++){
      let v=0;
      v += -1*S[((Math.max(0,y-1))*w+x)*4+ch];
      v += -1*S[(y*w+Math.max(0,x-1))*4+ch];
      v +=  5*S[i+ch];
      v += -1*S[(y*w+Math.min(w-1,x+1))*4+ch];
      v += -1*S[((Math.min(hgt-1,y+1))*w+x)*4+ch];
      D[i+ch] = clamp(v,0,255);
    }
    D[i+3]=S[i+3];
  }
  ctx.putImageData(dst,0,0);
}
/* --- 12-5. 편집 UI 바인딩 --- */
function bindEditor(){
  /* 프리셋 버튼 생성 */
  const grid = $('presetGrid');
  for (const [key,P] of Object.entries(PRESETS)){
    const b = h('button',{ type:'button', class:'preset-btn'+(key==='standard'?' active':'') },
      h('span',{class:'pi'}, ic(P.ico)), h('span',{text:P.name}));
    b.addEventListener('click', ()=>{
      photoS.preset = key;
      grid.querySelectorAll('.preset-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      composite();
    });
    grid.append(b);
  }
  /* 슬라이더: rAF 스로틀로 합성 재실행 */
  let pending = false;
  const rerun = ()=>{ if(pending) return; pending=true; requestAnimationFrame(()=>{ pending=false; composite(); }); };
  $('rngBri').addEventListener('input', e=>{ photoS.bri=+e.target.value; rerun(); });
  $('rngCon').addEventListener('input', e=>{ photoS.con=+e.target.value; rerun(); });
  $('rngSat').addEventListener('input', e=>{ photoS.sat=+e.target.value; rerun(); });
  $('rngTol').addEventListener('change', e=>{       // 제거 강도 = 마스크 재생성(브러시 초기화)
    photoS.tol=+e.target.value;
    if (photoS.cropped){ buildMask(); composite(); toast('ブラシの修正がリセットされました','warn'); }
  });
  document.querySelectorAll('input[name="bgSel"]').forEach(r=> r.addEventListener('change', composite));
  /* 비교 버튼 (길게 눌러 원본 보기) */
  const cmp = $('btnCompare');
  ['pointerdown'].forEach(ev=> cmp.addEventListener(ev, ()=> displayOriginal()));
  ['pointerup','pointerleave','pointercancel'].forEach(ev=> cmp.addEventListener(ev, ()=> photoS.result && displayResult()));
  /* 브러시 */
  const be = $('btnBrushErase'), br = $('btnBrushRestore');
  const setBrush = (mode)=>{
    photoS.brush = (photoS.brush === mode ? null : mode);
    be.classList.toggle('on', photoS.brush==='erase');
    br.classList.toggle('on', photoS.brush==='restore');
  };
  be.addEventListener('click', ()=> setBrush('erase'));
  br.addEventListener('click', ()=> setBrush('restore'));
  $('rngBrush').addEventListener('input', e=>{ photoS.brushSize=+e.target.value; });
  bindBrushPainting();
  /* 리셋 */
  $('btnPhotoReset').addEventListener('click', ()=>{
    /* v2.29: 「やり直し」가 보정만 초기화하던 것 → 라벨 기대에 맞게 '완전 초기화'(사진 선택 단계로 복귀) */
    photoS.preset='standard'; photoS.tol=45; photoS.bri=100; photoS.con=100; photoS.sat=100;
    $('rngBri').value=100; $('rngCon').value=100; $('rngSat').value=100; $('rngTol').value=45;
    photoS.src=null; photoS.cropped=null; photoS.result=null; photoS.mask=null;
    photoS.zoom=1; photoS.ox=0; photoS.oy=0; $('rngZoom').value=100;
    $('cropStage').classList.add('hidden'); $('editPanel').classList.add('hidden');
    const fi = $('fileInput'); if (fi) fi.value='';
    setStep(1);
    toast('最初からやり直します。写真を選んでください');
  });
  /* 저장/삽입/시트 */
  $('btnSavePng').addEventListener('click', savePhotoPng);
  $('btnInsertResume').addEventListener('click', insertPhotoToResume);
  $('btnSheet').addEventListener('click', makePhotoSheet);
}
/* 브러시 페인팅: 마스크 알파를 지우기/복원 */
function bindBrushPainting(){
  const cv = $('cvEdit');
  let painting = false;
  const paint = (e)=>{
    if (!photoS.mask) return;
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) * (photoS.mask.width / r.width);
    const y = (e.clientY - r.top)  * (photoS.mask.height / r.height);
    const mctx = photoS.mask.getContext('2d');
    const rad = photoS.brushSize * (photoS.mask.width / r.width);
    mctx.beginPath(); mctx.arc(x,y,rad,0,Math.PI*2);
    if (photoS.brush === 'erase'){ mctx.globalCompositeOperation='destination-out'; mctx.fillStyle='#000'; }
    else { mctx.globalCompositeOperation='source-over'; mctx.fillStyle='rgba(0,0,0,1)'; }
    mctx.fill();
    composite();
  };
  cv.addEventListener('pointerdown', (e)=>{
    if (!photoS.brush) return;
    painting = true; cv.setPointerCapture(e.pointerId); paint(e);
  });
  cv.addEventListener('pointermove', (e)=>{ if (painting) paint(e); });
  ['pointerup','pointercancel'].forEach(ev=> cv.addEventListener(ev, ()=>{ painting=false; }));
}
/* --- 12-6. 저장/삽입/인쇄시트 --- */
function savePhotoPng(){
  if (!photoS.result){ toast('まず写真を準備してください', 'warn'); return; }
  photoS.result.toBlob(b=>{
    downloadBlob(b, 'shomei-shashin.png');
    toast('PNGで保存しました'); setStep(4);
  }, 'image/png');
}
function insertPhotoToResume(){
  if (!photoS.result){ toast('まず写真を準備してください', 'warn'); return; }
  /* v2.36: 썸네일 300×400 → 360×480 상향 (A4 300dpi 인쇄 시 3cm 폭 = 354px 필요.
     종전엔 300pxを업스케일해 인쇄·확대 시 흐릿해지는 2차 화질 손실이 있었다) */
  const th = document.createElement('canvas'); th.width=360; th.height=480;
  const t2 = th.getContext('2d'); t2.imageSmoothingEnabled = true; t2.imageSmoothingQuality = 'high';
  t2.drawImage(photoS.result,0,0,360,480);
  let url = th.toDataURL('image/png');
  if (url.length > PHOTO_STORE_LIMIT*1.4){           // 초과 시 고품질 JPEG로 절감
    const c2 = document.createElement('canvas'); c2.width=360; c2.height=480;
    const cx = c2.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,360,480);
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(photoS.result,0,0,360,480);
    url = c2.toDataURL('image/jpeg', .88);
  }
  store.update(st=>{ st.profile.photoDataUrl = url; });
  setStep(4);
  toast('履歴書に写真を配置しました');
}
function makePhotoSheet(){
  if (!photoS.result){ toast('まず写真を準備してください', 'warn'); return; }
  /* A4 @300dpi (2480×3508)에 3×4cm 사진 6매 배치 */
  const SW=708, SH=944, GAP=60;
  const cv = document.createElement('canvas'); cv.width=2480; cv.height=3508;
  const ctx = cv.getContext('2d');
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,cv.width,cv.height);
  const x0 = Math.round((2480 - (SW*2+GAP))/2), y0 = Math.round((3508 - (SH*3+GAP*2))/2);
  for (let r=0;r<3;r++) for (let c=0;c<2;c++){
    ctx.drawImage(photoS.result, x0 + c*(SW+GAP), y0 + r*(SH+GAP), SW, SH);
  }
  cv.toBlob(b=>{ downloadBlob(b,'shashin-sheet-a4.png'); toast('印刷シートを保存しました'); setStep(4); },'image/png');
}
function clamp(v,min,max){ return Math.min(max, Math.max(min, v)); }

/* ================================================================
   13. 예문 라이브러리 (검색/카테고리/복사)
================================================================ */
let libCat = 'すべて';
function bindLibrary(){
  const cats = $('exCats');
  for (const c of EX_CATS){
    const b = h('button',{ type:'button', class:'chip'+(c==='すべて'?' active':''), text:c });
    b.addEventListener('click', ()=>{
      libCat = c;
      cats.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      renderExamples();
    });
    cats.append(b);
  }
  $('exSearch').addEventListener('input', renderExamples);
  /* 팁 리스트 */
  const tl = $('tipList');
  for (const t of TIPS) tl.append(h('li',{text:t}));
  renderExamples();                       // 초기 목록 렌더
}

/* ================================================================
   13-B. 志望動機 셀프 진단 (v2.11 차별화 자산)
   - 공개된 履歴書 작성 룰 7항목을 규칙 기반으로 즉시 채점
   - 외부 전송 0·계정 불필요 ("AI 느낌"의 가치를 순수 클라이언트로 구현)
================================================================ */
/* 문자 수 (공백 제외, サロゲートペア 안전) */
function diagCount(t){ return Array.from(String(t).replace(/\s+/g,'')).length; }
const DIAG_NG_CLICHE = ['貴社の将来性に魅力','精一杯頑張','一生懸命頑張','未熟ながら','未熟ですが','成長できる環境'];
const DIAG_NEGA = ['嫌い','我慢できな','人間関係が悪','前職への不満','辞めたくな'];
function runDiagnosis(text){
  const t = String(text || '').trim();
  const n = diagCount(t);
  const st = (ok, soft)=> ok ? 'pass' : (soft ? 'warn' : 'fail');
  const checks = [];
  /* ① 文字数 */
  checks.push({
    st: n === 0 ? 'fail' : (n >= 150 && n <= 400 ? 'pass' : (n > 520 ? 'fail' : 'warn')),
    name: '文字数（150〜400字が目安）',
    hint: n === 0 ? ''
      : n < 150      ? '現在' + n + '字。根拠となる経験を1つ足すと説得力が増します。'
      : n > 400 && n <= 520 ? '現在' + n + '字。少し長め。結論→根拠→貢献の3点に絞ると読みやすくなります。'
      : n > 520      ? '現在' + n + '字。面接官が30秒で読める量（400字程度）に絞りましょう。'
      : '' });
  /* ② 結論의 문 — 志望의意思表明 */
  const hasConclusion = /志望いたしました|志望します|志望したと|応募させていただき|応募いたしました/.test(t);
  checks.push({ st: st(hasConclusion, false), name:'結論（「志望いたしました」など意思表明）がある',
    hint:'冒頭か結尾で、意思を一文ではっきり伝えましょう。' });
  /* ③ 根拠의 문 — 나만의 경험/학습 */
  const hasBase = /経験|実績|従事|担当|取り組|部活|アルバイト|ゼミ|インターン|資格|学んだ|培っ|実習|研究/.test(t);
  checks.push({ st: st(hasBase, false), name:'根拠（自分の経験・学び）が書かれている',
    hint:'部活・アルバイト・研究・資格など、自分だけの経験を1つ添えましょう。' });
  /* ④ 数字의 구체성 */
  const hasNum = /[0-9０-９]|[一二三四五六七八九十]?(年間|か月|ヶ月|件|人|倍|％|%)/.test(t);
  checks.push({ st: hasNum ? 'pass' : (hasBase ? 'warn' : 'fail'), name:'数字で語れる実績・期間がある',
    hint:'「3年間」「月5件」「1.3倍」など、数字は記憶に残ります。' });
  /* ⑤ 貢献 자세 — 貴社 호칭 + 기여 동사 */
  const hasKisha = /貴社|御社|貴店|貴校/.test(t);
  const hasContrib = /貢献|活か|役立|力を発揮|目指|挑戦|支え|推進|改善|成長に寄与/.test(t);
  checks.push({ st: st(hasKisha && hasContrib, hasKisha || hasContrib),
    name:'貢献の姿勢が「貴社で〜する」形になっている',
    hint:'経験の紹介で終わらせず「貴社の◯◯で活かす/貢献する」まで結びつけましょう。' });
  /* ⑥ 定型句 회피 */
  const cliches = DIAG_NG_CLICHE.filter(w => t.includes(w));
  checks.push({ st: cliches.length === 0 ? 'pass' : 'warn',
    name:'そのままでも通じる定型句を避けている',
    hint: cliches.length ? '検出: 「' + cliches.join('」「') + '」— どの会社にも送れる文は届きません。その会社だけの一言に。' : '' });
  /* ⑦ 긍정 표현 (부정 어휘 회피) */
  const negas = DIAG_NEGA.filter(w => t.includes(w));
  checks.push({ st: negas.length === 0 ? 'pass' : 'warn',
    name:'前職・環境への否定的な表現がない',
    hint: negas.length ? '検出: 「' + negas.join('」「') + '」— 「〜したい」など前向きな理由に置き換えましょう。' : '' });
  const score = Math.round(checks.reduce((a,c)=> a + (c.st === 'pass' ? 1 : c.st === 'warn' ? .5 : 0), 0) / checks.length * 100);
  return { checks, score, n };
}
function diagVerdict(s){
  if (s >= 90) return '提出レベル。あとは会社ごとの一言を足すだけ。';
  if (s >= 70) return 'あと一歩。指摘を1か所直せばぐっと良くなります。';
  if (s >= 40) return '骨組みはOK。不足している要素を足して肉付けしましょう。';
  return 'まだ荒削り。下の例文を土台に組み立て直すのが近道です。';
}
function renderDiag(){
  const host = $('diagResult');
  if (!host) return;
  host.replaceChildren();
  if (!String($('dgText').value).trim()){ toast('まず志望動機の文を入力してください', 'warn'); return; }
  const r = runDiagnosis($('dgText').value);
  const row = h('div',{ class:'diag-score' },
    h('div',{ class:'gauge' }, h('div',{ class:'gauge-bar' })),
    h('div',{ class:'diag-pct', text:r.score + '点' }));
  host.append(row);
  const bar = row.querySelector('.gauge-bar');
  bar.style.width = r.score + '%';
  bar.style.background = r.score >= 90 ? 'linear-gradient(90deg,#22c55e,#16a34a)'
    : r.score >= 70 ? 'linear-gradient(90deg,#f6c945,#eaa50d)'
    : r.score >= 40 ? 'linear-gradient(90deg,#fb923c,#f97316)' : 'linear-gradient(90deg,#f43f5e,#e11d48)';
  host.append(h('p',{ class:'diag-verdict', text:diagVerdict(r.score) }));
  const list = h('div',{ class:'diag-rows' });
  for (const c of r.checks){
    list.append(h('div',{ class:'diag-row ' + c.st },
      ic(c.st === 'pass' ? 'i-check' : 'i-alert'),
      h('div',{}, h('strong',{ text:c.name }), c.hint ? h('small',{ text:c.hint }) : null)));
  }
  host.append(list);
  toast('診断が完了しました');
}
function bindDiag(){
  if (!$('btnDiag')) return;
  $('btnDiag').addEventListener('click', renderDiag);
  $('btnDiagLoad').addEventListener('click', ()=>{
    $('dgText').value = store.get().motivation || '';
    toast(store.get().motivation ? '履歴書タブの志望動機を読み込みました' : '履歴書タブの志望動機はまだ未入力です',
          store.get().motivation ? 'success' : 'warn');
  });
}
/* ================================================================
   13-C. 模擬面接・想定質問ジェネレーター (v2.12 차별화 자산)
   - 共通의 鉄板 18問 + 직종 9카테고리×6問 (面接官の意図・答え方·NG例付き)
   - store의 志望動機·学職歴에서 'あなた専用 深掘り質問' 규칙 기반 생성
     (서버 AI 없이 규칙 기반 — 즉시·묵料·프라이버시 안전이라는 차별점 유지)
================================================================ */
const MQ_CATS = ['共通','新卒','アルバイト','営業','事務','企画','IT・エンジニア','販売・接客','医療・介護','製造・物流'];
/* { cat:카테고리, q:想定質問, why:面接官の意図, tip:答え方のコツ, ng:NG例 } */
const MQ_COMMON = [
  { q:'自己紹介をお願いします', why:'話し方・表情・第一印象を見る導入の質問', tip:'氏名→経歴の要約→簡単な強みを30〜60秒で。「本日はよろしくお願いいたします」で締める', ng:'履歴書の全文朗読' },
  { q:'自己PRをお願いします', why:'強みと、その仕事への活かし方の具体性を確認', tip:'強み→根拠エピソード→入社後の貢献、の順で約1分にまとめる', ng:'「真面目です」など抽象語だけ' },
  { q:'志望動機を教えてください', why:'企業研究の深さ・本気度・他社との違いを見極める', tip:'会社の特徴(事業・理念)と自分の経験を結びつけ、貢献できることで締める', ng:'給与・休日など条件面ばかりの理由' },
  { q:'長所と短所を教えてください', why:'自己理解度と正直さを確認', tip:'長所はエピソード付きで。短所には「克服のためにしていること」を必ず添える', ng:'「短所はありません」' },
  { q:'（前職の）退職理由を教えてください', why:'ネガティブさと、同じ理由での早期退職リスクを確認', tip:'事実を簡潔に述べ、「次はこう挑戦したい」と前向きに転換する', ng:'前職・上司の悪口・愚痴' },
  { q:'学生時代に力を入れたことは何ですか', why:'学業以外での価値観と行動力を測る（ガクチカ）', tip:'課題→行動→結果→学びの順に、数字を入れて語る', ng:'「特にありません」' },
  { q:'5年後・10年後のキャリアビジョンを教えてください', why:'方向性が会社の将来と重なるか確認', tip:'その会社で実現できる成長イメージに結びつける', ng:'独立や転職を前提にした話' },
  { q:'当社の印象は？／どこで知りましたか', why:'企業研究の深さを測る', tip:'具体的な事業・商品・ニュースに触れ、共感ポイントを1つ伝える', ng:'「ホームページを見ました」だけ' },
  { q:'他社の選考状況を教えてください', why:'志望度の高さと採用の余裕を確認', tip:'正直に。「御社が第一志望」なら理由とセットで伝える', ng:'嘘、または他社の自慢話' },
  { q:'これまでの成功体験と失敗体験を教えてください', why:'再現性ある行動力と、失敗からの学びを見る', tip:'失敗談は「改善して次に活かした話」で終わらせる', ng:'成功自慢だけ／人のせいにする失敗' },
  { q:'仕事で大切にしていることは何ですか', why:'仕事観が社風と合うか確認', tip:'経験に基づく一言(例: 約束を守る)＋具体エピソード', ng:'教科書どおりのきれいごとだけ' },
  { q:'ストレスとどう向き合っていますか', why:'セルフケアと安定して働けるかの確認', tip:'具体的なリフレッシュ法＋「困ったら相談できる」も伝わると◎', ng:'「ストレスは感じません」' },
  { q:'残業や休日出勤についてどう考えますか', why:'労働条件に関する考え方のすり合わせ', tip:'必要な時への協力姿勢＋「効率的に終わらせる工夫」も語る', ng:'「一切できません」／根拠のない全面肯定' },
  { q:'転勤は可能ですか', why:'配属の柔軟性を確認', tip:'可否を正直に。条件がある場合は具体的に伝える', ng:'曖昧にごまかす(入社後の齟齬のもと)' },
  { q:'希望の年収・給与はありますか', why:'条件面の一致を確認', tip:'誠実にレンジで答え、「御社の規定に従います」も添えられる', ng:'「いくらでも」／根拠のない高額提示' },
  { q:'入社後に挑戦したいことはありますか', why:'主体性と成長意欲を確認', tip:'会社の事業と結びつく具体的な挑戦を1つ語る', ng:'「何でもやります」だけ' },
  { q:'あなたの経験を当社でどう活かせますか', why:'即戦力性×企業研究の掛け算を見る', tip:'自分の経験1つ×会社の課題1つ、の形で答える', ng:'経歴の羅列だけ' },
  { q:'最後に何か質問はありますか（逆質問）', why:'関心の度合いの最終確認', tip:'「入社までに身につけておくべきことは？」など前向きな質問を2〜3個準備', ng:'「特にありません」／待遇だけの質問' }
];
MQ_COMMON.forEach(x => { x.cat = '共通'; });
const MQ_JOB = [
  /* 新卒 */
  { cat:'新卒', q:'なぜこの業界を選んだのですか', why:'就活の軸の一貫性を確認', tip:'体験(アルバイト・授業・就活)に根づいた理由を語る', ng:'「華やかそう」などイメージだけ' },
  { cat:'新卒', q:'ゼミ・研究で学んだことを教えてください', why:'学びへの姿勢を見る', tip:'内容の詳細より「どう取り組んだか」に時間を使う', ng:'専門用語の説明だけで終わる' },
  { cat:'新卒', q:'部活・サークルでの役割は何でしたか', why:'組織の中での立ち回り方を知りたい', tip:'役職がなくても「工夫した行動」を語ればOK', ng:'「何もしていませんでした」' },
  { cat:'新卒', q:'挫折した経験を教えてください', why:'立ち直る力・レジリエンスを見る', tip:'原因分析→次に取った行動、の順で語る', ng:'「挫折したことはありません」' },
  { cat:'新卒', q:'社会人と学生の違いは何だと思いますか', why:'働く覚悟があるか確認', tip:'責任の重さ・信用の大切さに触れる', ng:'「あまり変わらないと思います」' },
  { cat:'新卒', q:'希望の職種・配属先はありますか', why:'志向の明確さを確認', tip:'理由を添えて希望を述べ＋「まず現場で学ぶ姿勢」も', ng:'「どこでもいいです」' },
  /* アルバイト */
  { cat:'アルバイト', q:'働ける曜日・時間帯を教えてください', why:'シフトとの適合確認が第一目的', tip:'正直かつ具体的に。長期勤務の可否も伝える', ng:'曖昧なまま受け流す' },
  { cat:'アルバイト', q:'家からどのくらいかかりますか', why:'通勤の無理のなさ=定着率を見ている', tip:'移動手段と片道時間を正確に答える', ng:'遠いのに「大丈夫です」の一点張り' },
  { cat:'アルバイト', q:'土日祝日に入れますか', why:'最も忙しい時間帯の稼働確認', tip:'入れる条件(週1なら可、など)を明確に伝える', ng:'面接ではOKと言い、実際は入らない' },
  { cat:'アルバイト', q:'接客・立ち仕事の経験はありますか', why:'即応できるかの確認', tip:'未経験なら「人と話すのが好き」など適性をアピール', ng:'「疲れそう」など不安な発言' },
  { cat:'アルバイト', q:'品出し・清掃など裏方の仕事もありますが大丈夫ですか', why:'仕事の全体像への納得を確認', tip:'「仕事の一部」と理解している旨を伝える', ng:'「接客だけしたいです」' },
  { cat:'アルバイト', q:'他にバイトの掛け持ち予定はありますか', why:'シフトを確保できるかの確認', tip:'正直に共有する(学生・家庭優先は珍しくない)', ng:'隠す(バレると信用問題)' },
  /* 営業 */
  { cat:'営業', q:'数字を追った経験を教えてください', why:'目標達成への姿勢を見る', tip:'目標→行動量→結果を数字で語る(例: 月5件獲得)', ng:'根拠のない「頑張ります」' },
  { cat:'営業', q:'断られた経験と、その後どうしたか教えてください', why:'打たれ強さ(レジリエンス)を確認', tip:'断られた理由の分析→次の工夫を語る', ng:'「断られるのは辛いです」で終わる' },
  { cat:'営業', q:'新規開拓と既存顧客の深耕、得意なのはどちらですか', why:'営業タイプを把握したい', tip:'どちらにも自分なりの考えを述べられるとよい', ng:'「新規は苦手です」だけ' },
  { cat:'営業', q:'価格競争で負けたとき、どうしますか', why:'課題解決のアプローチを見る', tip:'価値提案・信頼関係など価格以外の勝ち筋を語る', ng:'「値下げを提案します」' },
  { cat:'営業', q:'繁忙期の時間管理はどうしていますか', why:'セルフマネジメント力を確認', tip:'優先順位づけの具体的ルール(例: 午前は訪問、夕方は事務)を', ng:'「がむしゃらにやります」' },
  { cat:'営業', q:'当社の商品をあなたならどう売りますか', why:'準備度と発想力を同時に見る', tip:'ターゲット仮説(誰に・どう困っているか)まで語れると◎', ng:'商品知識ゼロ' },
  /* 事務 */
  { cat:'事務', q:'Excel・Wordのスキルはどのくらいですか', why:'実務適性の確認', tip:'使える機能を具体的に(例: VLOOKUP・ピボット)正直に', ng:'実力以上の申告(実技でバレる)' },
  { cat:'事務', q:'ミスを見つけたとき、どうしますか', why:'正確性と誠実さの確認', tip:'即報告→修正→再発防止、の流れで答える', ng:'「黙って直します」' },
  { cat:'事務', q:'締切が重なったとき、どうさばきますか', why:'段取り力を見る', tip:'「担当者に相談して優先順位を決める」は正解の一つ', ng:'「全部一人で抱えます」' },
  { cat:'事務', q:'電話応対の経験はありますか', why:'会社の代表窓口としての適性を見る', tip:'敬語・取次ぎの基本(保留ボタンの使用前確認など)を交えて', ng:'「電話は苦手です」だけ' },
  { cat:'事務', q:'定型業務が多い仕事ですが、続けられますか', why:'持続できるかの確認', tip:'「正確に回せる」＋「改善提案もしたい」が好印象', ng:'「すぐ飽きます」' },
  { cat:'事務', q:'他部署からの急な依頼にはどう対応しますか', why:'臨機応変さを見る', tip:'内容と納期の確認は失礼ではないことを知っている', ng:'「何でもOK」or「全部断ります」' },
  /* 企画 */
  { cat:'企画', q:'最近気になった商品・サービスはありますか', why:'感度と分析眼を見る', tip:'「なぜ売れているか」の自分なりの仮説まで語る', ng:'流行の羅列だけ' },
  { cat:'企画', q:'企画の良し悪しを何で判断しますか', why:'仕事観と判断力を確認', tip:'顧客価値×実現性×収支など、自分の軸を語る', ng:'「直感です」' },
  { cat:'企画', q:'通らなかった企画を、その後どう修正しましたか', why:'粘り強さと修正力を見る', tip:'フィードバック→改訂→再提案の具体的経験を', ng:'「諦めました」' },
  { cat:'企画', q:'社内外の関係者を巻き込むコツは何ですか', why:'調整力は企画職の心臓', tip:'早期の目的共有・相手の利害に合わせた説明を語る', ng:'「一人でやりきります」' },
  { cat:'企画', q:'データと感性、どちらを信じますか', why:'判断プロセスを見る質問', tip:'「仮説は感性、検証はデータ」など往復させる答えが実務的', ng:'極端な片方信仰' },
  { cat:'企画', q:'当社に提案したい企画はありますか', why:'研究度と実力の両方を見る', tip:'小さくてもいいので具体的な改善提案を1つ', ng:'「入ってから考えます」' },
  /* IT・エンジニア */
  { cat:'IT・エンジニア', q:'得意な言語・技術スタックを教えてください', why:'技術適合の確認', tip:'「何を作ったか」(動くもの・規模)まで語る', ng:'資格名の羅列だけ' },
  { cat:'IT・エンジニア', q:'バグにハマったときの解決プロセスを教えてください', why:'問題解決の手順を見る', tip:'切り分け→仮説→検証、の自分なりの手順を語る', ng:'「諦めて先輩に丸投げ」' },
  { cat:'IT・エンジニア', q:'チーム開発で心がけていることは何ですか', why:'協調性を確認', tip:'コードレビューの姿勢・共有ドキュメントなど具体例を', ng:'「一人でやる方が早い」' },
  { cat:'IT・エンジニア', q:'未経験の技術をどうキャッチアップしますか', why:'学習力は生存戦略', tip:'「小さく作って動かす」「公式ドキュメントを読む」など自分の型を', ng:'「教えてもらいたいです」だけ' },
  { cat:'IT・エンジニア', q:'ユーザー視点で意識していることは何ですか', why:'開発姿勢を確認', tip:'使いやすさ・速度など改善した具体エピソードを', ng:'「技術が面白ければいい」' },
  { cat:'IT・エンジニア', q:'当社のサービスを使ってみて、気づいた点はありますか', why:'関心の高さを測る', tip:'実際に使った上での誠実な感想＋改善提案1つ', ng:'サービス未体験' },
  /* 販売・接客 */
  { cat:'販売・接客', q:'クレーム対応の経験を教えてください', why:'危機対応力を見る', tip:'傾聴→謝罪→代替案、の流れに沿った実例を', ng:'逆ギレ・放置の経験談' },
  { cat:'販売・接客', q:'これまでで一番嬉しかった接客は何ですか', why:'モチベーションの源泉を知りたい', tip:'お客様の反応が具体的な話を選ぶ', ng:'「売上が上がったこと」だけ' },
  { cat:'販売・接客', q:'陳列・在庫整理など目立たない努力も多いですが', why:'基本動作を厭わないか確認', tip:'工夫した経験(見やすい陳列の工夫など)を語る', ng:'「面倒そう」な空気' },
  { cat:'販売・接客', q:'お客様の要望に応えられないとき、どうしますか', why:'対応バランスを見る', tip:'代替案の提示＋上司への相談で答える', ng:'マニュアルどおりの拒否だけ' },
  { cat:'販売・接客', q:'立ち仕事・早朝シフトは大丈夫ですか', why:'実務への許容確認', tip:'正直に＋健康管理法(柔軟運動など)を添えると◎', ng:'無理を隠して「大丈夫です」' },
  { cat:'販売・接客', q:'リピーターを増やすために何をすると思いますか', why:'商売の感覚を見る', tip:'会話・信頼づくりなど本質的な視点を', ng:'「安く売ればいい」' },
  /* 医療・介護 */
  { cat:'医療・介護', q:'なぜこの分野を選んだのですか', why:'動機の本質を確認(離職防止)', tip:'体験(家族の介護・実習など)に根づいた一貫した話を', ng:'「人の役に立ちたい」だけ' },
  { cat:'医療・介護', q:'夜勤・交代制勤務に対応できますか', why:'勤務適性の確認', tip:'体調管理法まで答えられると信頼される', ng:'曖昧な答え' },
  { cat:'医療・介護', q:'利用者・患者さんとの距離感で大切にしていることは', why:'倫理観の確認', tip:'尊厳・プライバシーへの配慮に触れる', ng:'私情に流された発言' },
  { cat:'医療・介護', q:'力仕事も多いですが大丈夫ですか', why:'身体負担の許容確認', tip:'正直に＋腰痛防止の工夫など自己管理法を', ng:'「重くても我慢します」だけ' },
  { cat:'医療・介護', q:'チーム連携で心がけていることは何ですか', why:'連携が命に関わる現場', tip:'申し送り・報連相の具体エピソードを', ng:'「自分の仕事だけ完璧に」' },
  { cat:'医療・介護', q:'資格取得と実務を両立できますか', why:'成長意欲と計画性を見る', tip:'現時点での学習計画を具体的に', ng:'「勉強は苦手で…」だけ' },
  /* 製造・物流 */
  { cat:'製造・物流', q:'朝が早い・立ち仕事の経験はありますか', why:'勤務形態への適性を確認', tip:'過去の勤務経験で証明できると強い', ng:'根拠なく「余裕です」' },
  { cat:'製造・物流', q:'単調作業を正確に続けるコツはありますか', why:'品質の土台を支える質問', tip:'ルーティン化・セルフチェック等の自分の工夫を', ng:'「集中力が続きません」' },
  { cat:'製造・物流', q:'安全第一とよく言いますが、あなたなら何をしますか', why:'安全リテラシーの確認', tip:'指差呼称・声かけ・報連相などの実践例を', ng:'「気をつけます」だけ' },
  { cat:'製造・物流', q:'フォークリフトなどの資格はありますか', why:'即戦力性の確認', tip:'なくても「取得したい」の意思表明はプラス', ng:'「資格は不要ですよね」' },
  { cat:'製造・物流', q:'5S(整理・整頓・清掃・清潔・しつけ)の経験はありますか', why:'職場文化への適合を見る', tip:'改善提案の経験があれば添えると◎', ng:'「聞いたことがありません」' },
  { cat:'製造・物流', q:'チーム内での連携・声かけで心がけていることは', why:'事故防止と生産性の両方に関係', tip:'具体的な声かけの習慣(例: 通路での「右通ります」)を', ng:'「黙々とやります」だけ' }
];
const MQ = MQ_COMMON.concat(MQ_JOB);

/* 面接直前ミニチェック */
const MQ_TIPS = [
  '5〜10分前着が鉄則。遅れる場合は5分でも必ず電話連絡を',
  'スマホは「マナーモード」ではなく電源オフ(バイブ音が鳴る例があります)',
  '自己紹介・自己PR・志望動機は「30秒版」と「1分版」の2種類を用意',
  '逆質問は2〜3個準備。待遇だけの質問は避け、前向きな内容に',
  '深掘り質問には数字で答えられるよう、自分の実績を再確認しておく',
  '挨拶・目線・姿勢が第一印象の8割。声はワントーン高め、ゆっくりと'
];

/* --- 想定質問ライブラリ描画 (共通분 + 선택 카테고리) --- */
function mqFiltered(){
  const cat = store.get().mensetsu.cat;
  if (cat === '共通') return MQ_COMMON.slice();
  return MQ_COMMON.concat(MQ_JOB.filter(x => x.cat === cat));
}
function renderMensetsu(){
  const host = $('mqList'); if (!host) return;
  host.replaceChildren();
  const cat = store.get().mensetsu.cat;
  const list = mqFiltered();
  const cnt = $('mqCount');
  if (cnt) cnt.textContent = cat === '共通'
    ? '鉄板の共通 18問を表示中 — 職種を選ぶと＋6問追加されます'
    : '共通 18問 ＋「' + cat + '」6問 = 計 ' + list.length + '問を表示中';
  for (const x of list){
    const d = h('details', { class:'mq-item' },
      h('summary', {},
        h('span', { class:'mq-tag', text: x.cat }),
        h('span', { text: x.q })),
      h('div', { class:'mq-body' },
        h('div', { class:'mq-row why' }, h('span', { class:'mq-k', text:'意図' }), h('span', { text: x.why })),
        h('div', { class:'mq-row tip' }, h('span', { class:'mq-k', text:'コツ' }), h('span', { text: x.tip })),
        h('div', { class:'mq-row ng'  }, h('span', { class:'mq-k', text:'NG例' }), h('span', { text: x.ng })),
        h('button', { type:'button', class:'btn small mq-copy',
          on:{ click:()=> copyText('【想定質問】' + x.q) } }, ic('i-copy'), 'この質問をコピー')));
    host.append(d);
  }
}

/* --- あなた専用 深掘り質問 생성 규칙 (志望動機+経歴 기반) --- */
function buildDeepQuestions(){
  const s = store.get();
  const mot = (s.motivation || '').replace(/\s+/g,'');
  if (mot.length < 25) return null;                      // 미작성/너무 짧음
  const out = [];
  const push = (q, base)=> out.push({ q, base });
  /* ① 숫자 실적 → 재현성 파고들기 */
  const mnum = mot.match(/[0-9０-９]+(?:[\.・][0-9０-９]+)?\s*(?:件|人|%|％|倍|年間|か月|ヶ月|年|万円|円|回|社|日|時間)/);
  if (mnum) push('文中の「' + mnum[0] + '」について——その数字はどんな工夫・行動の結果ですか？別の環境でも再現できますか？', '数字の実績への深掘り');
  /* ② 定型句 NG → 他社転用可能性 */
  const cliche = DIAG_NG_CLICHE.find(w => mot.includes(w));
  if (cliche) push('「' + cliche + '」という表現は他の会社にも言えませんか？当社"だからこそ"の理由を1文で教えてください。', '定型句への指摘');
  /* ③ 強み 키워드 → 뒷면 파고들기 */
  const STRENGTHS = ['行動力','リーダー','リーダーシップ','粘り','コミュニケーション','責任感','真面目','向上心','チャレンジ','主体性','柔軟'];
  const sw = STRENGTHS.find(w => mot.includes(w));
  if (sw) push('その「' + sw + '」という強みが、裏目に出てしまった経験はありますか？どう修正しましたか？', '強みの「裏の顔」を問う定番');
  /* ④ 단체 경험 → 대립 해결 */
  const TEAME = ['部活','サークル','アルバイト','バイト','ボランティア','研究','ゼミ','チーム'];
  const tw = TEAME.find(w => mot.includes(w));
  if (tw) push('その経験(' + tw + ')の中で、仲間と意見が対立したとき、あなたはどう行動しましたか？', 'チーム経験への深掘り');
  /* ⑤ 경력 여부 분기 */
  if (s.workHistory.length > 0){
    push('前職では、なぜ同じことができなかったのですか？退職理由と志望動機の一貫性を教えてください。', '転職者への一貫性チェック');
    push('前職で最も評価されたことは何ですか？それを当社でどう活かしますか？', '即戦力性の確認');
  } else if (s.education.length > 0){
    push('学生時代の経験を、社会人として具体的にどう活かしますか？1つ例を挙げてください。', '新卒・第二新卒の定番');
  }
  /* ⑥ 企業研究 확인 (貴社 존재 여부로 분기) */
  if (mot.includes('貴社') || mot.includes('御社')){
    push('当社のどこに魅力を感じましたか？事業・商品・社風の中で一つ挙げるとしたら？', '企業研究の深さの確認');
  } else {
    push('なぜ"この会社"でなければならないのですか？同業他社ではいけない理由を教えてください。', '企業理解の確認');
  }
  /* ⑦ 피날레 定番 (항상 마지막) */
  const fin = { q:'もし内定したら、入社後3か月でまず何をしますか？', base:'締めの定番質問' };
  return out.slice(0, 6).concat([fin]);
}
function renderDeep(){
  const host = $('mqDeepResult'); if (!host) return;
  host.replaceChildren();
  const qs = buildDeepQuestions();
  if (!qs){
    host.append(h('p', { class:'hint', style:'margin-top:.8rem',
      text:'志望動機が未入力か短すぎます(25文字以上で分析します)。下のボタンから履歴書タブで書いてきてください。' }));
    return;
  }
  host.append(h('p', { class:'mq-deeplead', text:'あなたの志望動機から ' + qs.length + ' 問の深掘り質問を生成しました。声に出して練習してみましょう。' }));
  qs.forEach((x, i) => {
    const card = h('div', { class:'mq-deep' },
      h('p', { class:'mq-deepq', text:'Q' + (i+1) + '. ' + x.q }),
      h('div', { class:'mq-deeprow' },
        h('span', { class:'mq-tag gold', text: x.base }),
        h('button', { type:'button', class:'btn small',
          on:{ click:()=> copyText(x.q) } }, ic('i-copy'), 'コピー')));
    host.append(card);
  });
  toast(qs.length + '件の深掘り質問を生成しました');
}
/* ================================================================
   13-D. 逆質問ジェネレーター (v2.12 연장 — 면접 대응 완결)
   - 段階(3)×相手(3) 매트릭스로 5問 + 締めの一言 생성
   - 職種は 想定質問ライブラリ(mensetsu.cat)과 連動 (データ 자산 재활용)
================================================================ */
const GQ_STAGES  = ['一次面接', '二次面接', '最終面接'];
const GQ_TARGETS = ['人事', '現場リーダー', '役員・社長'];
/* 段階別 pool (先頭 2問 사용) */
const GQ_STAGE_Q = {
  '一次面接': [
    { q:'入社までに身につけておくべき知識やスキルはありますか', why:'「準備します」という前向きさが最も伝わる定番' },
    { q:'入社後に活躍している方に共通する特徴はありますか', why:'活躍したい意欲の表明になる' },
    { q:'一日の業務の流れを教えていただけますか', why:'仕事内容への真剣な関心が伝わる' }
  ],
  '二次面接': [
    { q:'配属先のチームが今取り組んでいる課題を教えていただけますか', why:'配属後を具体的にイメージしている証拠' },
    { q:'この職種で評価される仕事の進め方は、どのようなものですか', why:'成果を出す意志の表れ' },
    { q:'チームの人数構成や雰囲気を教えていただけますか', why:'人間関係を重視する姿勢が自然に伝わる' }
  ],
  '最終面接': [
    { q:'会社として3年後に目指している姿を教えていただけますか', why:'経営視点への関心=長く働く意志' },
    { q:'役員の皆様が仕事で最も大切にされていることは何ですか', why:'ビジョンへの共感姿勢が伝わる' },
    { q:'御社に入社して「この人に来てよかった」と言われるには、何が必要ですか', why:'入社意欲の強い締めの質問' }
  ]
};
/* 相手別 pool (先頭 2問 사용) */
const GQ_TARGET_Q = {
  '人事': [
    { q:'入社後のキャリアパスの事例を教えていただけますか', why:'将来像を描いている姿勢' },
    { q:'御社の社風を表すエピソードがあれば教えていただけますか', why:'文化との相性を確かめる誠実さ' }
  ],
  '現場リーダー': [
    { q:'一緒に働くメンバーの方々は、どんな方が多いですか', why:'チーム適合を気にする自然な関心' },
    { q:'現場で特に求められている行動は何ですか', why:'即戦力の意欲を示せる' }
  ],
  '役員・社長': [
    { q:'業界が大きく変化する中で、御社が守り続けたい軸は何ですか', why:'経営視点で対等に会話できる印象' },
    { q:'創業（事業開始）の頃の原体験を聞かせていただけますか', why:'理念への深い敬意が伝わる' }
  ]
};
/* 職種別 (1問) — mensetsu.cat 과 連動 */
const GQ_JOB_Q = {
  '共通':        { q:'入社後、最初の3か月で理解しておくべきことは何ですか', why:'早期戦力化の意欲' },
  '新卒':        { q:'新入社員のうちにチャレンジできることはありますか', why:'受け身でない印象になる' },
  'アルバイト':  { q:'長く活躍されているスタッフさんに共通する点はありますか', why:'定着の意志が伝わる' },
  '営業':        { q:'トップセールスの方は、どんな工夫をされていますか', why:'成果志向のアピール' },
  '事務':        { q:'業務改善の提案は歓迎される風土ですか', why:'定型業務＋αの姿勢' },
  '企画':        { q:'最近実現に至った企画の裏話を聞かせていただけますか', why:'企画職への本気度が伝わる' },
  'IT・エンジニア': { q:'技術選定はどのように行われていますか', why:'技術への感度の高さ' },
  '販売・接客':  { q:'このお店が大切にしているお客様像を教えてください', why:'理念への共感' },
  '医療・介護':  { q:'資格取得の支援制度はありますか', why:'成長意欲と定着の意志の両立' },
  '製造・物流':  { q:'安全への取り組みで、現場発の改善例はありますか', why:'安全意識の高さをアピール' }
};
/* 締めの一言 (段階で 분기) */
const GQ_CLOSING = {
  '一次面接': '本日は貴重なお時間をありがとうございました。お話を伺い、御社で働くイメージがより具体的になりました。',
  '二次面接': 'ありがとうございました。チームの皆様と一緒に成果を出したいという気持ちが一層強くなりました。',
  '最終面接': '本日はありがとうございました。ぜひ御社の一員として貢献したいと、心から思いました。よろしくお願いいたします。'
};
/* 逆質問 NG 6選 */
const GQ_NG = [
  '「残業はどのくらいありますか」— 聞いて構わないが、「最初の質問」にすると消極的な印象に',
  '「給与はいくら上がりますか」— 待遇の確認は内定後の条件交渉が基本',
  '「休みは取りやすいですか」— 単体で聞くと働く意欲を疑われる',
  '「どんな会社ですか」— 調べれば分かる質問は研究不足の露呈',
  '「特にありません」— 最大のNG。関心ゼロに見える',
  '面接中に既に説明された内容をもう一度聞く — 聞いていなかった印象になる'
];
/* 5問 생성 (段階2 + 相手2 + 職種1) — 결정적(랜덤 없음: 再現性·테스트 용이) */
function buildGyaku(){
  const ms = store.get().mensetsu;
  const list = GQ_STAGE_Q[ms.gqStage].slice(0, 2)
    .concat(GQ_TARGET_Q[ms.gqTarget].slice(0, 2))
    .concat([GQ_JOB_Q[ms.cat] || GQ_JOB_Q['共通']]);
  return { list, closing: GQ_CLOSING[ms.gqStage] };
}
function renderGyaku(){
  const host = $('gqResult'); if (!host) return;
  host.replaceChildren();
  const ms = store.get().mensetsu;
  /* 職種 連動 안내 */
  const note = $('gqJobNote');
  if (note) note.textContent = ms.cat === '共通'
    ? '※ 上のライブラリで職種を選ぶと、その職種向けの逆質問も1問生成されます。'
    : '※ 職種「' + ms.cat + '」向けの逆質問を1問含みます（上のライブラリの選択と連動中）。';
  const { list, closing } = buildGyaku();
  host.append(h('p', { class:'mq-deeplead',
    text: ms.gqStage + ' × ' + ms.gqTarget + ' — 好印象の逆質問 ' + list.length + '問' }));
  list.forEach((x, i) => {
    host.append(h('div', { class:'mq-deep' },
      h('p', { class:'mq-deepq', text:'Q' + (i+1) + '. ' + x.q }),
      h('div', { class:'mq-deeprow' },
        h('span', { class:'mq-tag gold', text: x.why }))));
  });
  /* 締めの一言 카드 */
  host.append(h('div', { class:'mq-deep gq-close' },
    h('p', { class:'mq-deepq', text:'締めの一言：「' + closing + '」' }),
    h('div', { class:'mq-deeprow' }, h('span', { class:'mq-tag', text:'退室前の最後の印象づくり' }))));
}
function gqCopyAllText(){
  const { list, closing } = buildGyaku();
  const lines = list.map((x, i) => 'Q' + (i+1) + '. ' + x.q + '（' + x.why + '）');
  lines.push('', '締めの一言：' + closing);
  return lines.join('\n');
}
/* ================================================================
   13-E. 手取りシミュレーター & 内定メール (v2.14)
   - 概算 규칙: 社保率(약14.65%/15.45%), 給与所得控除 단계식,
     所得税 5〜45% 累進 + 復興特別 1.021, 住民税 10% + 均等割 5천
   - 서버 없는 즉시 계산 + '개인정보 외부전송 제로' 정책 유지
================================================================ */
const PAY_AGES = [ {k:'u39', label:'39歳以下'}, {k:'a40', label:'40・60代（介護保険あり）'}, {k:'a65', label:'65歳以上'} ];
/* 給与所得控除 (2020년 개정 기준 단계) */
function payKojo(g){
  if (g <= 1625000) return 550000;
  if (g <= 1800000) return g * 0.4 - 100000;
  if (g <= 3600000) return g * 0.3 + 80000;
  if (g <= 6600000) return g * 0.2 + 440000;
  if (g <= 8500000) return g * 0.1 + 1100000;
  return 1950000;
}
/* 所得税累進 (소득공제 후 金額 → 세액, 復興特別 별도) */
function payTaxRate(t){
  if (t <= 1950000) return t * 0.05;
  if (t <= 3300000) return t * 0.10 - 97500;
  if (t <= 6950000) return t * 0.20 - 427500;
  if (t <= 9000000) return t * 0.23 - 636000;
  if (t <= 18000000) return t * 0.33 - 1536000;
  if (t <= 40000000) return t * 0.40 - 2796000;
  return t * 0.45 - 4796000;
}
/* 手取り 1세트 계산: {G:額面年収, SI:社報年, TAX:所得税年, J:住民税年, netY, netM, rate} */
function calcTakeHome(monthly, bonusM, age, noJumin){
  const G = monthly * 12 + monthly * bonusM;
  const socRate = (age === 'a40') ? 0.1545 : 0.1465;          // 健保+年金+雇用 (+介護)
  const SI = Math.round(G * socRate);
  let TI = Math.round(G - payKojo(G) - SI - 480000);          // 課税所得 (基礎控除48万)
  if (TI < 0) TI = 0;
  const TAX = Math.round(payTaxRate(TI) * 1.021);
  const J = noJumin ? 0 : Math.round(TI * 0.10 + 5000);
  const netY = G - SI - TAX - J;
  return { G, SI, TAX, J, netY, netM: netY / 12, rate: G > 0 ? netY / G : 0 };
}
const fmtY = (n)=> Math.round(n).toLocaleString('ja-JP');
/* --- 手取りシミュ 렌더 (막대 그래프 + 手取り率 배지) --- */
function renderPay(){
  const host = $('payResult'); if (!host) return;
  host.replaceChildren();
  const pyp = store.get().pay;
  if (!pyp.monthly){ host.append(h('p',{class:'hint',text:'月給を入力すると、手取りの目安が表示されます。'})); return; }
  const r = calcTakeHome(pyp.monthly, pyp.bonus, pyp.age, pyp.noJumin);
  const head = h('div',{class:'pay-result'},
    h('div',{class:'pay-big'},
      h('span',{class:'pay-label', text:'手取り月額の目安'}),
      h('span',{class:'pay-value', text: fmtY(r.netM) + '円'}),
      h('span',{class:'mq-tag gold', text:'手取り率 約' + Math.round(r.rate * 100) + '%'})),
    h('p',{class:'pay-sub', text:'年収（額面）約 ' + fmtY(r.G) + '円 → 手取り年額 約 ' + fmtY(r.netY) + '円'}));
  host.append(head);
  /* 공제 내역 막대 (額面 대비 폭) */
  const rows = [ ['社会保険', r.SI, 'soc'], ['所得税', r.TAX, 'tax'], ['住民税', r.J, 'jumin'] ];
  for (const [label, amt, cls] of rows){
    const w = r.G > 0 ? Math.max(1, Math.round(amt / r.G * 100)) : 1;
    host.append(h('div',{class:'pay-bar'},
      h('span',{class:'pay-k', text:label}),
      h('span',{class:'pay-track'}, h('span',{class:'pay-fill ' + cls, style:'width:' + w + '%'})),
      h('span',{class:'pay-v', text: fmtY(amt) + '円/年'})));
  }
}
/* --- 内定比較 --- */
function renderCmp(){
  const host = $('cmpResult'); if (!host) return;
  host.replaceChildren();
  const pyp = store.get().pay;
  const A = pyp.cmpA, B = pyp.cmpB;
  if (!A.monthly || !B.monthly){ host.append(h('p',{class:'hint',text:'A社・B社の月給を両方入力して「比較する」を押してください。'})); return; }
  const ra = calcTakeHome(A.monthly, A.bonus, pyp.age, pyp.noJumin);
  const rb = calcTakeHome(B.monthly, B.bonus, pyp.age, pyp.noJumin);
  const diff = Math.round(ra.netM - rb.netM);
  const diffY = Math.round(ra.netY - rb.netY);
  const win = diff === 0 ? 'ほぼ互角' : (diff > 0 ? 'A社の方が手取りは多い' : 'B社の方が手取りは多い');
  const grossDiff = A.monthly - B.monthly;
  host.append(h('div',{class:'mq-deep'}, 
    h('p',{class:'mq-deepq', text: win + ' — 手取り月額差 約 ' + fmtY(Math.abs(diff)) + '円'}),
    h('div',{class:'mq-deeprow'},
      h('span',{class:'mq-tag', text:'A 手取り ' + fmtY(ra.netM) + '円/月'}),
      h('span',{class:'mq-tag', text:'B 手取り ' + fmtY(rb.netM) + '円/月'}),
      h('span',{class:'mq-tag gold', text:'年額差 約 ' + fmtY(Math.abs(diffY)) + '円'}))));
  /* 額面의 차이 vs 手取り 차이 인사이트 */
  if (grossDiff !== 0){
    const shrink = Math.abs(grossDiff) - Math.abs(diff);
    if (shrink > 3000){
      host.append(h('p',{class:'hint pay-insight',
        text:'額面の月差 ' + fmtY(Math.abs(grossDiff)) + '円に対し、手取りの差は約 ' + fmtY(Math.abs(diff)) + '円。税金・社会保険で差が縮まる点に注意しましょう。'}));
    }
  }
}
/* --- 内定メール 템플릿 (장멳 5선) --- */
const MAIL_TPL = {
  accept: { label:'内定を承諾する', subject:'内定のご連絡につきまして（入社承諾のご返事）',
    body:'このたびは、内定のご連絡をいただき誠にありがとうございます。\n謹んで入社のご承諾をさせていただきます。\n入社当日までに必要な準備がございましたら、ご指示いただけますと幸いです。\n一日も早く貴社に貢献できるよう努めてまいります。今後ともよろしくお願いいたします。' },
  decline: { label:'内定を辞退する', subject:'内定辞退のお詫び',
    body:'このたびは、内定のご連絡をいただき誠にありがとうございます。\n慎重に検討いたしました結果、誠に恐縮ではございますが、今回は内定を辞退させていただきたく存じます。\n貴重なお時間を割いていただいたにもかかわらず、このようなご連絡となり大変申し訳ございません。\n何卒ご容赦くださいますようお願い申し上げます。' },
  schedule: { label:'面接の日程調整', subject:'面接日程の変更のお願い',
    body:'お世話になっております。面接のお日時をご調整いただき誠にありがとうございます。\n恐れ入りますが、やむを得ない事情により、〇月〇日の面接日程を変更いただけますでしょうか。\n下記の候補より、ご都合のよろしい日時をご教示いただけますと幸いです。\n・〇月〇日（〇）〇時以降\n・〇月〇日（〇）終日\nご迷惑をおかけして申し訳ございませんが、何卒よろしくお願いいたします。' },
  thanks: { label:'面接のお礼', subject:'面接のお礼',
    body:'本日は、お忙しい中面接のお時間をいただき誠にありがとうございました。\n直接お話を伺うことで、貴社の事業への理解が深まり、入社意欲がより一層強くなりました。\n選考結果を心よりお待ちしております。今後ともよろしくお願いいたします。' },
  postpone: { label:'回答期限の延長', subject:'内定のご連絡につきまして（回答期間のお願い）',
    body:'このたびは、内定のご連絡をいただき誠にありがとうございます。\n大変光栄に存じますが、慎重に検討させていただきたく、回答の期限を〇月〇日まで延長いただけますでしょうか。\n勝手なお願いで恐縮ではございますが、何卒ご理解いただけますと幸いです。' }
};
function buildMail(){
  const pu = store.get().payUi;
  const tp = MAIL_TPL[pu.scene];
  const co = pu.company || '（会社名）';
  const prof = store.get().profile;
  const name = prof.nameKanji || '（氏名）';
  let sig = name;
  if (prof.phone || prof.email) sig += '\n' + [prof.phone, prof.email].filter(Boolean).join(' / ');
  const head = co + ' 採用ご担当者様\n\nお世話になっております。' + name + 'と申します。\n\n';
  return '件名: ' + tp.subject + '\n\n' + head + tp.body + '\n\n' + sig;
}
function renderMail(){
  const host = $('mailView'); if (!host) return;
  host.replaceChildren();
  host.textContent = buildMail();               // pre-wrap 스타일로 줄바끊 유지 (textContent 전용)
}
/* --- 内定탭 바인딩 --- */
/* ================================================================
   13-F. 電話スクリプト + 入社前書類 (v2.15 — ラストマイル 완결)
================================================================ */
/* 電話台本: 래이
   内定辞退電話はメールと併用（先に電話→後でメール）がマナー */
const PHONE_TPL = {
  thanks: { label:'内定のお礼・承諾',
    lines: [
      '「恐れ入ります。{会社}の採用選考でお世話になりました、{氏名}と申します。採用ご担当者様はいらっしゃいますでしょうか」',
      '「先日は内定のご連絡をいただき、誠にありがとうございます。謹んで入社をお受けしたく、お電話いたしました」',
      '「今後のお手続きや、入社までに必要な書類につきまして、ご教示いただけますでしょうか」',
      '「ありがとうございます。ご指示に沿って準備を進めてまいります。今後ともよろしくお願いいたします」'
    ],
    tip:'コツ：30秒〜1分で要件を終える。メモを取りながら、ゆっくり話す。' },
  decline: { label:'内定辞退（電話）',
    lines: [
      '「恐れ入ります。{会社}の選考でお世話になりました、{氏名}と申します」',
      '「このたびは内定のご連絡をいただき、誠にありがとうございました」',
      '「大変恐縮ではございますが、熟考の末、今回は内定を辞退させていただきたく、お電話いたしました」',
      '（理由を聞かれたら）「他の業界とのご縁をいただきまして…」と一文で十分です。深く説明する義務はありません',
      '「貴重なお時間をいただきましたこと、心より感謝しております。大変申し訳ございませんでした」'
    ],
    tip:'マナー：先に電話で一言→後で同内容のメール（辞退メール生成と併用できます）。' },
  schedule: { label:'面接日時の確認・変更',
    lines: [
      '「恐れ入ります。{会社}の選考でお世話になっております、{氏名}と申します」',
      '「〇月〇日の面接のお日時につきまして、確認（変更のご相談）でお電話いたしました」',
      '「〇月〇日〇時に伺う予定でよろしかったでしょうか」／「恐れ入りますが、別のお日時に変更いただくことは可能でしょうか」',
      '「ありがとうございます。では、当日はどうぞよろしくお願いいたします」'
    ],
    tip:'相手が不在なら「改めてお電話します」と伝え、折り返しは自分から。' },
  postoffer: { label:'入社日・条件の確認',
    lines: [
      '「恐れ入ります。{会社}に入社予定の{氏名}と申します」',
      '「入社日と初日の持ち物につきまして、確認のお電話をいたしました」',
      '「初日は〇時に〇〇へ伺えばよろしいでしょうか。また、必要な書類は下記で合っていますでしょうか」（→ 下の書類リストを手元に）',
      '「ご丁寧にありがとうございます。当日はよろしくお願いいたします」'
    ],
    tip:'入社前の確認電話は「失礼」ではなく「準備の証拠」。評価はむしろ上がります。' }
};
const DOC_LIST = [
  '雇用契約書・労働条件通知書（内容を確認して署名）',
  '年金手帳（または基礎年金番号のわかるもの）',
  '前職の「雇用保険被保険者証」（転職の場合。紛失時は職安で再発行）',
  '源泉徴収票（同じ年内の転職なら年末調整に必要。前職から受け取る）',
  '給与振込先の銀行口座の情報（通帳の写しを求められる例あり）',
  'マイナンバー確認書類',
  '扶養控除等（異動）申告書（会社が用紙を用意）',
  '通勤手段・定期代の申請',
  '資格証・免許の写し（資格が採用条件の場合）',
  '健康診断書（指定病院・検査項目がある場合）'
];
function buildPhoneText(){
  const pu = store.get().payUi;
  const tp = PHONE_TPL[pu.phoneScene];
  const co = pu.company || '（会社名）';
  const name = store.get().profile.nameKanji || '（氏名）';
  const lines = tp.lines.map((ln, i)=> '【' + (i+1) + '】' + ln.replaceAll('{会社}', co).replaceAll('{氏名}', name));
  return '【' + tp.label + '】電話台本\n\n' + lines.join('\n\n') + '\n\n' + tp.tip;
}
function renderPhone(){
  const host = $('phoneView'); if (!host) return;
  host.textContent = buildPhoneText();
}
function bindPhoneDocs(){
  if (!$('phoneScenes')) return;
  const sc = $('phoneScenes');
  const cur = store.get().payUi.phoneScene;
  for (const k of Object.keys(PHONE_TPL)){
    const b = h('button', { type:'button', class:'chip' + (cur === k ? ' active' : ''), text: PHONE_TPL[k].label });
    b.addEventListener('click', ()=>{
      store.update(s2=>{ s2.payUi.phoneScene = k; }, { render:false });
      sc.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
      b.classList.add('active'); renderPhone();
    });
    sc.append(b);
  }
  $('btnPhoneCopy').addEventListener('click', ()=> copyText(buildPhoneText()));
  const dl = $('docList');
  for (const d of DOC_LIST) dl.append(h('li', { text: d }));
  $('btnDocCopy').addEventListener('click', ()=> copyText('入社前に求められる書類\n\n' + DOC_LIST.map((x,i)=>(i+1)+'. '+x).join('\n')));
  renderPhone();
}

function bindNaitei(){
  if (!$('payAges')) return;
  const st = ()=> store.get();
  /* ① 手取り 시뮬: 입력 즉시 계산 + store 영속 */
  const bindNum = (id, apply)=>{
    const el = $(id);
    el.addEventListener('input', ()=>{ store.update(s2=>{ apply(s2, el.value); }, { render:false }); renderPay(); });
  };
  bindNum('payMonthly', (s2,v)=>{ s2.pay.monthly = v === '' ? null : Number(v); });
  bindNum('payBonus',   (s2,v)=>{ s2.pay.bonus   = v === '' ? 0 : Number(v); });
  $('payNoJumin').addEventListener('change', e=>{ store.update(s2=>{ s2.pay.noJumin = e.target.checked; }, { render:false }); renderPay(); });
  /* 年齢 칩 */
  const ages = $('payAges');
  for (const a of PAY_AGES){
    const b = h('button', { type:'button', class:'chip' + (st().pay.age === a.k ? ' active' : ''), text: a.label });
    b.addEventListener('click', ()=>{
      store.update(s2=>{ s2.pay.age = a.k; }, { render:false });
      ages.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
      b.classList.add('active'); renderPay();
    });
    ages.append(b);
  }
  /* ② 비교: 입력 → store, 버튼 → renderCmp */
  const bindCmp = (id, key, field)=>{
    const el = $(id);
    el.addEventListener('input', ()=>{
      store.update(s2=>{ s2.pay[key][field] = (field === 'monthly') ? (el.value === '' ? null : Number(el.value)) : (el.value === '' ? 0 : Number(el.value)); }, { render:false });
    });
  };
  bindCmp('cmpMonthlyA','cmpA','monthly'); bindCmp('cmpBonusA','cmpA','bonus');
  bindCmp('cmpMonthlyB','cmpB','monthly'); bindCmp('cmpBonusB','cmpB','bonus');
  $('btnCmp').addEventListener('click', renderCmp);
  /* ③ 메일: 장면 칩 + 회사명, 자동 갱신 */
  const sc = $('mailScenes');
  for (const k of Object.keys(MAIL_TPL)){
    const b = h('button', { type:'button', class:'chip' + (st().payUi.scene === k ? ' active' : ''), text: MAIL_TPL[k].label });
    b.addEventListener('click', ()=>{
      store.update(s2=>{ s2.payUi.scene = k; }, { render:false });
      sc.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
      b.classList.add('active'); renderMail();
    });
    sc.append(b);
  }
  $('mailCo').addEventListener('input', e=>{ store.update(s2=>{ s2.payUi.company = e.target.value; }, { render:false }); renderMail(); renderPhone(); });
  $('btnMailCopy').addEventListener('click', ()=> copyText(buildMail()));
  /* ④ 초기값 폼 채움 + 초기 렌더 */
  const pyp = st().pay, pu = st().payUi;
  if (pyp.monthly != null) $('payMonthly').value = pyp.monthly;
  $('payBonus').value = pyp.bonus; $('payNoJumin').checked = pyp.noJumin;
  if (pyp.cmpA.monthly != null) $('cmpMonthlyA').value = pyp.cmpA.monthly;
  $('cmpBonusA').value = pyp.cmpA.bonus;
  if (pyp.cmpB.monthly != null) $('cmpMonthlyB').value = pyp.cmpB.monthly;
  $('cmpBonusB').value = pyp.cmpB.bonus;
  $('mailCo').value = pu.company;
  renderPay(); renderCmp(); renderMail();
}

function bindGyaku(){
  if (!$('gqStages')) return;
  /* 칩 빌드 공통 낶은 함수 — 클릭 시 store 영속 + 재생성 */
  const build = (host, items, key)=>{
    const cur = store.get().mensetsu[key];
    for (const c of items){
      const b = h('button', { type:'button', class:'chip' + (c === cur ? ' active' : ''), text: c });
      b.addEventListener('click', ()=>{
        store.update(st => { st.mensetsu[key] = c; }, { render:false });
        host.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        renderGyaku();
      });
      host.append(b);
    }
  };
  build($('gqStages'),  GQ_STAGES,  'gqStage');
  build($('gqTargets'), GQ_TARGETS, 'gqTarget');
  /* NG 리스트 (정적) */
  const nl = $('gqNgList');
  for (const x of GQ_NG) nl.append(h('li', { text: x }));
  $('btnGqGen').addEventListener('click', ()=>{ renderGyaku(); toast('逆質問を生成しました'); });
  $('btnGqCopyAll').addEventListener('click', ()=> copyText(gqCopyAllText()));
  renderGyaku();                                   // 초기 자동 생성
}

function bindMensetsu(){
  if (!$('mqCats')) return;
  /* 카테고리 칩 (선택값은 store에 영속 — 사용자 설정 규칙) */
  const cats = $('mqCats');
  const cur = store.get().mensetsu.cat;
  for (const c of MQ_CATS){
    const b = h('button', { type:'button', class:'chip' + (c === cur ? ' active' : ''), text: c });
    b.addEventListener('click', ()=>{
      store.update(st => { st.mensetsu.cat = c; }, { render:false });
      cats.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      renderMensetsu();
      renderGyaku();
    });
    cats.append(b);
  }
  /* 深掘り生成 + 「履歴書へ 이동」 버튼 */
  $('btnMqDeep').addEventListener('click', renderDeep);
  $('btnMqGotoRireki').addEventListener('click', ()=>{
    const tb = document.querySelector('.tab-btn[data-tab="rireki"]');
    if (tb) tb.click();
    setTimeout(()=>{ const t = $('ta_motivation'); if (t){ t.focus(); scrollTo({ top:0, behavior:'smooth' }); } }, 60);
  });
  /* 직전 체크리스트 */
  const tl = $('mqTips');
  for (const tip of MQ_TIPS) tl.append(h('li', { text: tip }));
  renderMensetsu();                                  // 초기 목록 렌더
}

function renderExamples(){
  const q = $('exSearch').value.trim();
  const list = $('exList'); list.replaceChildren();
  const filtered = EXAMPLES.filter(x =>
    (libCat === 'すべて' || x.cat === libCat) &&
    (!q || x.title.includes(q) || x.text.includes(q) || x.cat.includes(q)));
  if (!filtered.length){ list.append(h('div',{class:'empty-note',text:'条件に合う例文がありません。'})); return; }
  for (const x of filtered){
    const card = h('div',{class:'ex-card'},
      h('div',{class:'ex-head'},
        h('span',{class:'ex-cat', text:x.cat}),
        h('span',{class:'ex-tools'},
          h('button',{ type:'button', class:'btn small', attrs:{title:'志望動機欄にそのまま挿入'}, on:{ click:()=> insertExample(x.text) } }, ic('i-edit'), '挿入'),
          h('button',{ type:'button', class:'btn small', on:{ click:()=> copyText(x.text) } }, ic('i-copy'), 'コピー'))),
      h('p',{class:'ex-title', text:x.title}),
      h('p',{class:'ex-text', text:x.text}));
    list.append(card);
  }
}
/* 예문을 志望動機 란에 직접 삽입 (코 인기 사이트의 'テンプレ挿入' UX 벤치마크)
   - 기존 내용이 있으면 확인 후 교체, 카운터/미리보기 즉시 갱신 */
function insertExample(text){
  const cur = store.get().motivation.trim();
  if (cur && !confirm('現在入力中の志望動機を例文で置き換えますか？（元に戻すには再入力してください）')) return;
  store.update(st=>{ st.motivation = text; },{render:'light'});
  const ta = $('ta_motivation'); ta.value = text;
  updateCharCounter(text, 'motCount', 'motGauge');
  toast('志望動機に挿入しました。履歴書タブで自分の言葉に修正してください');
}

async function copyText(text){
  try{ await navigator.clipboard.writeText(text); toast('コピーしました'); }
  catch(e){                                            // 구형 브라우저 폐백
    const ta = h('textarea',{ style:'position:fixed;opacity:0' }); ta.value = text;
    document.body.append(ta); ta.select();
    try{ document.execCommand('copy'); toast('コピーしました'); }
    catch(_){ toast('コピーに失敗しました', 'error'); }
    ta.remove();
  }
}

/* ================================================================
   14. Export / Import / 전체삭제
================================================================ */
function exportJson(){
  try{
    store.save();                                      // 최신 상태 보장
    const blob = new Blob([JSON.stringify(store.get(), null, 2)], { type:'application/json' });
    downloadBlob(blob, 'rireki-backup-' + todayStr() + '.json');
    toast('バックアップを保存しました');
  }catch(e){ console.error(e); toast('書出しに失敗しました', 'error'); }
}
function bindImport(){
  const fi = $('impFile');
  fi.addEventListener('change', ()=>{
    const f = fi.files && fi.files[0]; fi.value='';
    if (!f) return;
    if (f.size > 8*1024*1024){ toast('ファイルが大きすぎます', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const raw = String(reader.result);
        let parsed;
        try{ parsed = JSON.parse(raw); }              // ① JSON 파스 자체 실패 → 파일 손상/비JSON
        catch(pe){ console.warn(pe); toast('ファイルが破損しているか、JSON形式ではありません', 'error'); return; }
        if (!parsed || typeof parsed !== 'object' || !('profile' in parsed)){   // ② 파스는 됐지만 우리 앱 백업 아님
          console.warn('schema mismatch'); toast('このアプリのバックアップファイルではありません', 'error'); return;
        }
        store.replace(sanitizeState(parsed));          // 스키마 정제 후 교체
        fillProfileForm();
        toast('バックアップを復元しました');
      }catch(e){ console.error(e); toast('読み込みに失敗しました', 'error'); }
    };
    reader.onerror = ()=> toast('読み込みに失敗しました', 'error');
    reader.readAsText(f);
  });
}
function bindDataButtons(){
  $('btnExport').addEventListener('click', exportJson);
  /* v2.22: 헤더 バックアップ 버튼 삭제 — 書き出し는 設定 다이얼로그(btnExport)로 일원화 */
  $('btnImport').addEventListener('click', ()=> $('impFile').click());
  $('btnResetAll').addEventListener('click', ()=>{
    if (!confirm('すべての入力データを削除しますか？この操作は元に戻せません。')) return;
    store.replace(defaultState());
    fillProfileForm();
    toast('全データを削除しました', 'warn');
  });
}

/* ================================================================
   15. 설정 / 테마 / 탭 전환
================================================================ */
function applyTheme(){
  document.documentElement.setAttribute('data-theme', store.get().settings.theme);
  /* 토글 아이콘(달/해)은 CSS가 data-theme 기반으로 자동 전환 → JS 조작 불필요 */
}
function effectiveDark(){
  const t = store.get().settings.theme;
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return matchMedia('(prefers-color-scheme: dark)').matches;
}
function bindSettings(){
  const dlg = $('dlgSettings');
  $('btnSettings').addEventListener('click', ()=>{
    const st = store.get().settings;                   // 현재 값 반영 후 표시
    $('set_theme').value = st.theme;
    $('set_era').value = st.eraNotation;
    $('set_template').value = st.template;
    $('set_bgcolor').value = st.bgColor;
    $('set_autosave').checked = st.autoSave;
    openDlg(dlg);
  });
  $('btnTheme').addEventListener('click', ()=>{
    store.update(st=>{ st.settings.theme = effectiveDark() ? 'light' : 'dark'; });
    applyTheme();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  $('set_theme').addEventListener('change', e=>{ store.update(st=>{st.settings.theme=e.target.value;}); applyTheme(); });
  $('set_era').addEventListener('change', e=>{
    store.update(st=>{st.settings.eraNotation=e.target.value;});
    renderEduList(); renderWorkList(); renderLicList();   // 연도 라벨(연호) 재구성
  });
  $('set_template').addEventListener('change', e=> store.update(st=>{st.settings.template=e.target.value;}));
  $('set_bgcolor').addEventListener('change', e=> store.update(st=>{st.settings.bgColor=e.target.value;}));
  $('set_autosave').addEventListener('change', e=>{
    store.update(st=>{st.settings.autoSave=e.target.checked;},{persist:false});
    if (e.target.checked){ store.save(); toast('自動保存をONにしました'); }
    else toast('自動保存をOFFにしました（書出しで保存してください）','warn');
  });
  /* 상표 클릭 = 상단으로 */
  $('brandTop').addEventListener('click', e=>{ e.preventDefault(); scrollTo({top:0, behavior:'smooth'}); });
}
function openDlg(d){ try{ d.showModal(); }catch(e){ d.setAttribute('open',''); } }
function closeDlg(d){ try{ d.close(); }catch(e){ d.removeAttribute('open'); } }
/* v2.40: 히어로 証明写真 노트 링크 → 写真탭 이동 (프로모 밴드 삭제에 따른 간소화) */
function bindPhotoPromo(){
  const go = $('hpPhotoGo');
  if (go) go.addEventListener('click', ()=>{
    const b = document.querySelector('.tab-btn[data-tab="photo"]');
    if (b) b.click();
  });
}
function bindTabs(){
  const btns = document.querySelectorAll('.tab-btn');
  btns.forEach(b => b.addEventListener('click', ()=>{
    btns.forEach(x=>{ x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
    b.classList.add('active'); b.setAttribute('aria-selected','true');
    document.querySelectorAll('.tab-panel').forEach(p=> p.classList.toggle('active', p.dataset.panel === b.dataset.tab));
    /* v2.28: 다른 탭에서 수정된 職歴 등을 전환 즉시 반영 (양쪽 탭이 같은 store를 편집하므로 재구성으로 동기화) */
    try{ renderDynamic(); }catch(e){ console.warn(e); }
    /* 숨김 상태에서 폭 0이었던 미리보기 재피팅 */
    fitA4($('a4Preview'),$('pvFit1')); fitA4($('a4Preview2'),$('pvFit2')); fitA4($('a4PreviewT'),$('pvFit3')); fitA4($('a4PreviewS'),$('pvFit4'));
    /* v2.20: 탭 전환 즉시 그 패널 맨 위로 스크롤 (모바일: 히어로가 패널을 화면 밖으로 밀어내는 문제 해소) */
    const panelEl = document.querySelector('.tab-panel.active');
    if (panelEl){
      const headEl = document.querySelector('.site-header');
      const tbEl = document.getElementById('tool');
      /* 데스크톱은 알약 탭바가 sticky로 따라오므로 그 높이까지 보정 */
      const stickyH = (headEl ? headEl.offsetHeight : 0)
        + (tbEl && getComputedStyle(tbEl).position === 'sticky' ? tbEl.offsetHeight : 0);
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const top = panelEl.getBoundingClientRect().top + window.scrollY - stickyH - 8;
      window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
    }
  }));
}

/* ================================================================
   16. 초기화 + 글로벌 에러 핸들러
================================================================ */
/* 동적 부분만 재렌더 (구조 변경 시 — 리스트까지 재구성) */
function renderDynamic(){
  renderEduList(); renderWorkList(); renderLicList(); renderWorkDetail();
  renderLight();
}
/* 경량 재렌더 (필드 입력 중 — 리스트는 그대로 두어 포커스 보존) */
function renderLight(){
  renderPreview(); renderPreview2(); renderPreview3(); renderPreview4();
  renderDashboard();
  /* メール生成文도 プロ필(氏名・連絡先)에 의존 — 입력 즉시 서명 갱신 */
  renderMail();
  renderPhone();
}

/* ================================================================
   10-B. 退職届 / 退職願 A4 빌더 (입사→퇴사→전직 라이프사이클 서류 도구)
   - 退職届: 会社の承認不要(届出) / 退職願: 承認制(願出) — 정통 서식 차이 반영
   - 氏名은 프로필에서 자동 계승, 提出日は本日自動
================================================================ */
const TQ_REASONS = { isshin:'一身上の都合', katei:'家庭の事情', keiyaku:'契約期間の満了', kaisha:'会社の事情' };
function buildTaishokuA4(){
  const s = store.get(); const t = s.taishoku; const p = s.profile;
  const tpl = s.settings.template === 'modern' ? 'a4 tall modern' : 'a4 tall';
  const a4 = h('div',{ class: tpl });
  const now = new Date();
  const dateStr = (y,m,d)=> (s.settings.eraNotation==='wareki' ? toWareki(y,m,d) : y+'年') + m + '月' + d + '日';
  const submit = dateStr(now.getFullYear(), now.getMonth()+1, now.getDate());
  let leaveTxt = '　　　　年　　月　　日';
  if (t.leaveDate){ const [y,m,d] = t.leaveDate.split('-').map(Number); leaveTxt = dateStr(y,m,d); }
  const reason = TQ_REASONS[t.reason] || TQ_REASONS.isshin;
  const isNegai = t.docType === 'negai';
  const core = 'このたび、' + reason + 'により、勝手ながら' + leaveTxt + 'をもって' +
    (isNegai ? '退職願いたくお願い申し上げます。' : '退職いたしたく届け出ます。');

  a4.append(h('div',{class:'tq-submit', text:submit}));
  a4.append(h('div',{class:'tq-addr'},
    h('p',{text:(t.company || '株式会社　　　　　')}),
    h('p',{text:'代表取締役社長　' + (t.president || '　　　　') + '　殿'})));
  a4.append(h('h1',{class:'tq-title', text: isNegai ? '退　職　願' : '退　職　届'}));
  a4.append(h('p',{class:'tq-hazime', text:'私事'}));
  a4.append(h('p',{class:'tq-body', text:core}));
  a4.append(h('p',{class:'tq-body', text:'平素よりご指導ご鞭撻を賜りましたことに、心より御礼申し上げます。'}));
  a4.append(h('p',{class:'tq-body', text:'なお、業務の引継ぎにつきましては、ご指示のもと責任をもって対応いたします。'}));
  a4.append(h('div',{class:'tq-sign'},
    h('p',{text:'　　　　　' + submit}),
    h('p',{text:(t.dept || '　　　　　部') + '　　　　　　課'}),
    h('p',{text:(p.nameKanji || '氏　　　　名') + '　　㊞'})
  ));
  return a4;
}
function renderPreview3(){
  const host = $('a4PreviewT');
  if (!host) return;
  const fresh = buildTaishokuA4();
  host.parentNode.replaceChild(fresh, host);
  fresh.id = 'a4PreviewT';
  fitA4(fresh, $('pvFit3'));
}
/* --- 탭5 폼 바인딩 --- */
const TQ_FIELDS = { company:'tq_company', president:'tq_president', dept:'tq_dept', leaveDate:'tq_leave', reason:'tq_reason' };
function fillTaishokuForm(){
  const t = store.get().taishoku;
  for (const [key, id] of Object.entries(TQ_FIELDS)){ const el = $(id); if (el) el.value = t[key] || ''; }
  const r = document.querySelector('input[name="tq_type"][value="' + t.docType + '"]');
  if (r) r.checked = true;
}
function bindTaishoku(){
  for (const [key, id] of Object.entries(TQ_FIELDS)){
    $(id).addEventListener('input', (e)=> store.update(st=>{ st.taishoku[key] = e.target.value; },{render:'light'}));
  }
  document.querySelectorAll('input[name="tq_type"]').forEach(r=>
    r.addEventListener('change', (e)=> store.update(st=>{ st.taishoku.docType = e.target.value; },{render:'light'})));
  $('btnPrint3').addEventListener('click', ()=> printDoc('taishoku'));
  $('btnPng3').addEventListener('click', ()=> downloadTaishokuPNG());
  /* 오프라인(file:) 실행 시 가이드 링크 안내 */
  $('lnkTaishokuGuide').addEventListener('click', (e)=>{
    if (location.protocol === 'file:'){ e.preventDefault(); toast('ガイドはWeb公開版でご覧いただけます', 'warn'); }
  });
}

/* ================================================================
   10-C. 送付状(添え状) A4 빌더 (기사 예문 → 생성 도구 격상)
   - 일본 비즈니스 문서 정통 레이아웃: 날짜(우) → 수신(좌) → 발신(우)
     → 표제(중앙 밑줄) → 頭語/本文/結語 → 記 + 동봉서류 목록 → 以上
   - 時候の挨拶는 접수 월 기준 자동 삽입 (문화적 디테일 차별화)
================================================================ */
const TOKI = { 1:'新春の候', 2:'余寒の候', 3:'早春の候', 4:'春暖の候', 5:'新緑の候', 6:'初夏の候',
               7:'盛夏の候', 8:'残暑の候', 9:'初秋の候', 10:'秋麗の候', 11:'晩秋の候', 12:'初冬の候' };
/* 동봉 서류 목록 (순서 고정: 履歴書 → 職務経歴書 → その他) */
function sofuDocList(){
  const f = store.get().sofu; const docs = [];
  if (f.docRireki)  docs.push('履歴書');
  if (f.docShokumu) docs.push('職務経歴書');
  if (f.otherDoc)   docs.push(f.otherDoc);
  return docs;
}
/* 送付状 본문 문장 — guide/soefu.html 의 定型文과 동일 문구 (일관성) */
function sofuBodyLines(){
  const f = store.get().sofu;
  const toki = TOKI[new Date().getMonth() + 1] || '';
  const job = f.job ? '貴社の' + f.job : '貴社の募集職種';
  const docs = sofuDocList();
  const docTxt = docs.length ? docs.join('ならびに') : '応募書類';
  const lines = [
    '拝啓　' + (toki ? toki + '、' : '') + '貴社ますますご清栄のこととお慶び申し上げます。',
    'このたびは' + job + 'に応募させていただきたく、' + docTxt + 'をお送りいたします。'
  ];
  if (f.note) lines.push('なお、' + f.note + (f.note.endsWith('。') ? '' : '。'));
  lines.push('つきましてはご多忙のところ恐縮ではございますが、ご検討のほど何卒よろしくお願い申し上げます。');
  return lines;
}
function buildSofuA4(){
  const s = store.get(); const f = s.sofu; const p = s.profile;
  const tpl = s.settings.template === 'modern' ? 'a4 tall modern' : 'a4 tall';
  const a4 = h('div',{ class: tpl });
  const now = new Date();
  const dateStr = (s.settings.eraNotation==='wareki' ? toWareki(now.getFullYear(), now.getMonth()+1, now.getDate()) : now.getFullYear()+'年') + (now.getMonth()+1) + '月' + now.getDate() + '日';

  a4.append(h('div',{class:'sf-date', text:dateStr}));
  a4.append(h('div',{class:'sf-addr'},
    h('p',{text:(f.company || '株式会社　　　　　')}),
    h('p',{text:(f.tantou ? f.tantou : 'ご担当者') + '様'})));
  const sender = h('div',{class:'sf-sender'});
  if (p.postal) sender.append(h('p',{text:'〒' + p.postal}));
  if (p.address) sender.append(h('p',{text:p.address}));
  sender.append(h('p',{text:(p.nameKanji || '氏　　　　名')}));
  const contact = [p.phone, p.email].filter(Boolean).join(' / ');
  if (contact) sender.append(h('p',{text:contact}));
  a4.append(sender);
  a4.append(h('p',{class:'sf-sbj', text:'応募書類送付の件'}));
  sofuBodyLines().forEach((ln, i)=> a4.append(h('p',{class:'sf-body' + (i===0 ? ' first' : ''), text:ln})));
  a4.append(h('p',{class:'sf-ktg', text:'敬具'}));
  const docs = sofuDocList();
  if (docs.length){
    const list = h('div',{class:'sf-list'}, h('p',{class:'ki', text:'記'}));
    docs.forEach(d => list.append(h('p',{text:'・' + d + '　　1部'})));
    list.append(h('p',{class:'ijo', text:'以上'}));
    a4.append(list);
  }
  return a4;
}
function renderPreview4(){
  const host = $('a4PreviewS');
  if (!host) return;
  const fresh = buildSofuA4();
  host.parentNode.replaceChild(fresh, host);
  fresh.id = 'a4PreviewS';
  fitA4(fresh, $('pvFit4'));
}
/* --- 탭6 폼 바인딩 --- */
const SF_FIELDS = { company:'sf_company', tantou:'sf_tantou', job:'sf_job', otherDoc:'sf_other', note:'sf_note' };
function fillSofuForm(){
  const f = store.get().sofu;
  for (const [key, id] of Object.entries(SF_FIELDS)){ const el = $(id); if (el) el.value = f[key] || ''; }
  $('sf_doc_rireki').checked  = f.docRireki;
  $('sf_doc_shokumu').checked = f.docShokumu;
}
function bindSofu(){
  for (const [key, id] of Object.entries(SF_FIELDS)){
    $(id).addEventListener('input', (e)=> store.update(st=>{ st.sofu[key] = e.target.value; },{render:'light'}));
  }
  $('sf_doc_rireki').addEventListener('change',  (e)=> store.update(st=>{ st.sofu.docRireki  = e.target.checked; },{render:'light'}));
  $('sf_doc_shokumu').addEventListener('change', (e)=> store.update(st=>{ st.sofu.docShokumu = e.target.checked; },{render:'light'}));
  $('btnPrint4').addEventListener('click', ()=> printDoc('sofu'));
  $('btnPng4').addEventListener('click', ()=> downloadSofuPNG());
  $('lnkSoefuGuide').addEventListener('click', (e)=>{
    if (location.protocol === 'file:'){ e.preventDefault(); toast('ガイドはWeb公開版でご覧いただけます', 'warn'); }
  });
}
/* ================================================================
   10-D. 텍스트 문서 PNG 공용 엔진 (退職届 / 送付状)
   - DOM 미리보기와 동일 store 데이터로 Canvas에 직접 래스터화
   - A4 @150dpi (1240×1754), 禁則 처리 개행, 밑줄 스트로크 지원
   - 라인 명세: {t, x, y(mm), mm(글자크기), align, bold, underline,
                 wrap(최대폭mm), lh(행간mm), indent(첫행 전각공백)}
================================================================ */
/* 禁則 처리(킨소쿠) 개행 — 컨텍스트 폰트 설정 후 호출할 것 */
function wrapKinsokuCanvas(ctx, str, maxWpx){
  const NO_START = '。、）』」!?！？・ー—─…‥ァィゥェォッャュョぁぃぅぇぉっゃゅょ％‰°′″℃';
  const NO_END   = '（「『【〔［｛〈《';
  const lines = []; let cur = '';
  for (const ch of String(str)){
    if (cur && ctx.measureText(cur + ch).width > maxWpx){
      if (NO_START.includes(ch)) cur += ch;                                            // 행두금지 → 이전 줄 끝에 매달기
      else if (NO_END.includes(cur.slice(-1))){ lines.push(cur.slice(0,-1)); cur = cur.slice(-1) + ch; } // 행말금지 → 다음 줄로
      else { lines.push(cur); cur = ch; }
    } else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}
function renderTextDocPNG(lines){
  const K = 1240 / 210;                    // mm → px (A4 @150dpi)
  const cv = document.createElement('canvas'); cv.width = 1240; cv.height = 1754;
  const ctx = cv.getContext('2d');
  const stack = store.get().settings.template === 'modern'
    ? '"Hiragino Sans","Noto Sans JP","Noto Sans CJK JP","Yu Gothic",Meiryo,sans-serif'
    : '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP","Noto Serif CJK JP","MS Mincho",serif';
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.textBaseline = 'middle';
  for (const L of lines){
    ctx.font = (L.bold ? '700 ' : '') + (L.mm * K) + 'px ' + stack;
    ctx.fillStyle = L.color || '#111111';
    ctx.textAlign = L.align || 'left';
    if (L.wrap){
      wrapKinsokuCanvas(ctx, L.t, L.wrap * K).forEach((sub, i)=>{
        ctx.textAlign = 'left';
        ctx.fillText((i === 0 && L.indent ? '　' : '') + sub, L.x * K, (L.y + i * (L.lh || L.mm * 2)) * K);
      });
    } else {
      ctx.fillText(L.t, L.x * K, L.y * K);
      if (L.underline){                                  // 수신인 밑줄 (정통 서식)
        const w = ctx.measureText(L.t).width;
        const x1 = (L.align === 'center') ? L.x * K - w/2 : (L.align === 'right') ? L.x * K - w : L.x * K;
        ctx.strokeStyle = '#111111'; ctx.lineWidth = .3 * K;
        ctx.beginPath(); ctx.moveTo(x1, (L.y + L.mm * .75) * K); ctx.lineTo(x1 + w, (L.y + L.mm * .75) * K); ctx.stroke();
      }
    }
  }
  return new Promise(res=> cv.toBlob(b=> res(b), 'image/png'));
}
/* 현재 월 → 提出日 문자열 (설정의 和暦/西暦 반영) */
function todayJpDate(){
  const n = new Date();
  return (store.get().settings.eraNotation === 'wareki'
    ? toWareki(n.getFullYear(), n.getMonth() + 1, n.getDate())
    : n.getFullYear() + '年') + (n.getMonth() + 1) + '月' + n.getDate() + '日';
}
/* 退職届/退職願 PNG — DOM 빌더와 동일 논리를 라인 명세로 변환 */
function buildTaishokuPngLines(){
  const s = store.get(); const t = s.taishoku; const p = s.profile;
  const submit = todayJpDate();
  let leaveTxt = '　　　　年　　月　　日';
  if (t.leaveDate){ const [y,m,d] = t.leaveDate.split('-').map(Number);
    leaveTxt = (s.settings.eraNotation==='wareki' ? toWareki(y,m,d) : y+'年') + m + '月' + d + '日'; }
  const reason = TQ_REASONS[t.reason] || TQ_REASONS.isshin;
  const isNegai = t.docType === 'negai';
  const core = 'このたび、' + reason + 'により、勝手ながら' + leaveTxt + 'をもって' +
    (isNegai ? '退職願いたくお願い申し上げます。' : '退職いたしたく届け出ます。');
  const B = [ '私事', core,
    '平素よりご指導ご鞭撻を賜りましたことに、心より御礼申し上げます。',
    'なお、業務の引継ぎにつきましては、ご指示のもと責任をもって対応いたします。' ];
  const L = [];
  L.push({ t:submit, x:195, y:22, mm:3.6, align:'right' });
  L.push({ t:(t.company || '株式会社　　　　　'), x:15, y:36, mm:4.2, underline:true });
  L.push({ t:'代表取締役社長　' + (t.president || '　　　　') + '　殿', x:15, y:43, mm:4.2, underline:true });
  L.push({ t:(isNegai ? '退　職　願' : '退　職　届'), x:105, y:56, mm:8.5, align:'center', bold:true });
  B.forEach((txt, i)=>{
    if (i === 0) L.push({ t:txt, x:15, y:70, mm:4 });
    else L.push({ t:txt, x:15, y:76 + (i-1) * 18, mm:4.2, wrap:180, lh:9, indent:true });
  });
  L.push({ t:submit, x:172, y:158, mm:3.8, align:'right' });
  L.push({ t:(t.dept || '　　　　　部') + '　　　　　　課', x:172, y:166, mm:3.8, align:'right' });
  L.push({ t:(p.nameKanji || '氏　　　　名') + '　　㊞', x:172, y:174, mm:3.8, align:'right' });
  return L;
}
async function downloadTaishokuPNG(){
  try{
    const test = document.createElement('canvas');
    if (!test.getContext || !test.getContext('2d')) throw new Error('canvas-unsupported');
    const blob = await renderTextDocPNG(buildTaishokuPngLines());
    if (!blob) throw new Error('blob-null');
    downloadBlob(blob, 'taishokutodoke-' + todayStr() + '.png');
    toast('退職届のPNG画像を保存しました（ダウンロードフォルダをご確認ください）');
  }catch(e){
    toast('画像の生成に失敗しました。「印刷 / PDF保存」をご利用ください', 'error');
  }
}
/* 送付状 PNG — 時候의 挨拶·동봉 목록 포함 정통 레이아웃 */
function buildSofuPngLines(){
  const f = store.get().sofu; const p = store.get().profile;
  const L = [];
  L.push({ t:todayJpDate(), x:195, y:22, mm:3.6, align:'right' });
  L.push({ t:(f.company || '株式会社　　　　　'), x:15, y:36, mm:4.2 });
  L.push({ t:(f.tantou ? f.tantou : 'ご担当者') + '様', x:15, y:42.5, mm:4.2 });
  let sy = 36;
  if (p.postal)  { L.push({ t:'〒' + p.postal, x:172, y:sy, mm:3.4, align:'right' }); sy += 7; }
  if (p.address) { L.push({ t:p.address, x:172, y:sy, mm:3.4, align:'right' }); sy += 7; }
  L.push({ t:(p.nameKanji || '氏　　　　名'), x:172, y:sy, mm:3.8, align:'right' }); sy += 7;
  const contact = [p.phone, p.email].filter(Boolean).join(' / ');
  if (contact)   { L.push({ t:contact, x:172, y:sy, mm:3.2, align:'right' }); }
  L.push({ t:'応募書類送付の件', x:105, y:68, mm:4.6, align:'center', bold:true, underline:true });
  /* 본문 행 높이는 실측 개행(禁則 적용)으로 정확히 누적 — 겹침/과잉 공백 방지 */
  const K = 1240 / 210;
  const mc = document.createElement('canvas').getContext('2d');
  mc.font = (4 * K) + 'px ' + (store.get().settings.template === 'modern'
    ? '"Hiragino Sans","Noto Sans JP","Noto Sans CJK JP","Yu Gothic",Meiryo,sans-serif'
    : '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP","Noto Serif CJK JP","MS Mincho",serif');
  let y = 80;
  sofuBodyLines().forEach((ln, i)=>{
    L.push({ t:ln, x:15, y:y, mm:4, wrap:180, lh:8.2, indent:i !== 0 });
    y += wrapKinsokuCanvas(mc, ln, 180 * K).length * 8.2 + 2.5;
  });
  L.push({ t:'敬具', x:188, y:y + 2, mm:4, align:'right' });
  const docs = sofuDocList();
  if (docs.length){
    let ly = y + 16;
    L.push({ t:'記', x:105, y:ly, mm:4.2, align:'center' }); ly += 9;
    docs.forEach(d => { L.push({ t:'・' + d + '　　1部', x:78, y:ly, mm:4 }); ly += 8; });
    L.push({ t:'以上', x:138, y:ly, mm:4, align:'right' });
  }
  return L;
}
async function downloadSofuPNG(){
  try{
    const test = document.createElement('canvas');
    if (!test.getContext || !test.getContext('2d')) throw new Error('canvas-unsupported');
    const blob = await renderTextDocPNG(buildSofuPngLines());
    if (!blob) throw new Error('blob-null');
    downloadBlob(blob, 'sofujo-' + todayStr() + '.png');
    toast('送付状のPNG画像を保存しました（ダウンロードフォルダをご確認ください）');
  }catch(e){
    toast('画像の生成に失敗しました。「印刷 / PDF保存」をご利用ください', 'error');
  }
}

/* 전체 재렌더 (Import/리셋 시 폼 값까지) — 사용: store.replace 남부 */
function renderAll(){ renderDynamic(); }
function init(){
  try{
    store.load();
    /* v2.18: 섹션별 독립 초기화 — 한 기능(구형 브라우저에서 사진 스튜디오 등) 실패가
       탭 전환 등 다른 기능까지 연쇄 사망시키지 않도록 개별 try-catch */
    const safe = (name, fn)=>{ try{ fn(); }catch(e){ console.error('[init:' + name + ']', e); } };
    /* 정적 폼 1회 바인딩 */
    safe('profile', bindProfileForm);
    safe('tabs', bindTabs);
    safe('preview-fit', bindPreviewFit);
    safe('settings', bindSettings);
    safe('photo-upload', bindPhotoUpload); safe('crop', bindCrop); safe('editor', bindEditor);
    safe('library', bindLibrary);
    safe('diag', bindDiag);
    safe('mensetsu', bindMensetsu);
    safe('gyaku', bindGyaku);
    safe('naitei', bindNaitei);
    safe('phone-docs', bindPhoneDocs);
    safe('import', bindImport); safe('data-buttons', bindDataButtons);
    /* 추가 버튼 */
    $('btnAddEdu').addEventListener('click', ()=>{
      store.update(st=>{ st.education.push({ id:uuid(), year:null, month:null, type:'entry', school:'' }); },{render:false});
      renderDynamic();
    });
    /* 生年月日 → 小・中・高の年次 자동 입력 (履歴書Maker 등 인기 서비스의 대표 편의기능)
       일본 학제: 4月1日 시점 満6歳 입학 → 早生まれ(1/1〜4/1생)는 입학年度 +6, 그 외 +7 */
    $('btnAutoEdu').addEventListener('click', ()=>{
      const bd = store.get().profile.birthDate;
      if (!bd){ toast('先に「基本情報」で生年月日を入力してください', 'warn'); $('p_birth').focus(); return; }
      const [by,bm,bday] = bd.split('-').map(Number);
      const hayami = (bm < 4) || (bm === 4 && bday === 1);
      const base = by + (hayami ? 6 : 7);                    // 小学校入学年度(4月)
      const mk = (y,m,type,school)=>({ id:uuid(), year:y, month:m, type:type, school:school });
      const rows = [
        mk(base,    4, 'entry', '○○小学校'),
        mk(base+6,  3, 'grad',  '○○小学校'),
        mk(base+6,  4, 'entry', '○○中学校'),
        mk(base+9,  3, 'grad',  '○○中学校'),
        mk(base+9,  4, 'entry', '○○高等学校'),
        mk(base+12, 3, 'grad',  '○○高等学校')
      ];
      if (store.get().education.length && !confirm('入力済みの学歴を、生年月日から自動計算した年次で置き換えますか？')) return;
      store.update(st=>{ st.education.splice(0, st.education.length, ...rows); },{render:false});
      renderDynamic();
      toast('小・中・高校の年次を自動入力しました。学校名をご自身のものに修正してください（大学などは「＋追加」から）');
    });
    $('btnAddWork').addEventListener('click', ()=>{
      store.update(st=>{ st.workHistory.push({ id:uuid(), startY:null, startM:null, endY:null, endM:null, company:'', role:'' }); },{render:false});
      renderDynamic();
    });
    $('btnAddWork2').addEventListener('click', ()=>{   /* 職務経歴書 탭의 追加 버튼 (v2.28) */
      store.update(st=>{ st.workHistory.push({ id:uuid(), startY:null, startM:null, endY:null, endM:null, company:'', role:'' }); },{render:false});
      renderDynamic();
      toast('職歴を追加しました。このまま入力できます');
    });
    $('btnAddLic').addEventListener('click', ()=>{
      store.update(st=>{ st.licenses.push({ id:uuid(), year:null, month:null, name:'' }); },{render:false});
      renderDynamic();
    });
    /* 인쇄 버튼 */
    $('btnPrint1').addEventListener('click', ()=> printDoc('rireki'));
    $('btnPrint2').addEventListener('click', ()=> printDoc('shokumu'));
    /* PNG 이미지 저장 (모바일 대응 핵심: 인쇄 없이 사진첩/메일/LINE 제출 가능) */
    $('btnPng1').addEventListener('click', ()=> downloadResumePNG());
    /* 가이드 링크: 로컬(파일) 실행 시 페이지 없음 안내 */
    $('btnGuide').addEventListener('click', (e)=>{
      if (location.protocol === 'file:'){ e.preventDefault(); toast('ガイドはWeb公開版でご覧いただけます', 'warn'); }
    });
    $('lnkOffline') && $('lnkOffline').addEventListener('click', (e)=>{
      if (location.protocol === 'file:'){ e.preventDefault(); toast('今お使いのファイルがオフライン版です', 'warn'); }
    });
    /* 초기 렌더 */
    safe('fill-profile', fillProfileForm);
    safe('taishoku', ()=>{ bindTaishoku(); fillTaishokuForm(); });
    safe('sofu', ()=>{ bindSofu(); fillSofuForm(); });
    safe('photo-promo', bindPhotoPromo);   /* v2.40: 히어로 写真 노트 링크 (→写真탭) */
    renderDynamic();
    applyTheme();
    setStep(1);
    /* URL 해시로 탭 직접 열기 (가이드 기사 CTA 딥링크용: #tab=photo 등) */
    const tabMatch = location.hash.match(/tab=(rireki|shokumu|photo|library|shorui|sofu|mensetsu|naitei)/);
    if (tabMatch){
      const btn = document.querySelector('.tab-btn[data-tab="' + tabMatch[1] + '"]');
      if (btn) btn.click();
    }
  }catch(e){
    console.error(e);
    toast('初期化に失敗しました。ブラウザを更新してください。', 'error');
  }
}
/* 예기치 못한 오류도 조용히 죽지 않고 토스트로 알림 */
window.addEventListener('error', (e)=>{
  console.error(e.error || e.message);
  try{ toast('予期せぬエラーが発生しました', 'error'); }catch(_){}
});
document.addEventListener('DOMContentLoaded', init);
