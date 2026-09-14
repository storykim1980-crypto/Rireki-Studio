/* 開発用スモークテスト（製品ファイルではない）: node smoke-test.js */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('./index.html', 'utf8');
const appJs = fs.readFileSync('./app.js', 'utf8');

const dom = new JSDOM(html, { url: 'https://localhost/', runScripts: 'dangerously', pretendToBeVisual: true });
const { window } = dom;

// jsdom にないブラウザAPIスタブを app より先に script で注入
const stub = window.document.createElement('script');
stub.textContent = `
  window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){} });
  window.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
`;
window.document.head.appendChild(stub);

// app.js を通常 script としてロード（グローバルバインド生成）
const app = window.document.createElement('script');
app.textContent = appJs;
window.document.body.appendChild(app);

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('✅', name); } else { fail++; console.log('❌', name); } };

// 自然な DOMContentLoaded 待機後にアサート実行
setTimeout(() => {
  const d = window.document;
  const ev = (code) => window.eval(code);

  /* ① init/レンダリング */
  t('初期化後に例文カード27件描画', d.querySelectorAll('#exList .ex-card').length === 27);
  t('学歴の空状態案内を表示', d.querySelector('#eduList .empty-note') !== null);
  t('ダッシュボード完成度0%で開始', d.getElementById('dcText').textContent === '0%');

  /* ② 和暦エンジン（plan §13 検査項目） */
  t('1989-01-08 → 平成元年', ev("toWareki(1989,1,8)") === '平成元年');
  t('1989-01-07 → 昭和64年', ev("toWareki(1989,1,7)") === '昭和64年');
  t('2019-05-01 → 令和元年', ev("toWareki(2019,5,1)") === '令和元年');
  t('2019-04-30 → 平成31年', ev("toWareki(2019,4,30)") === '平成31年');
  t('2026-08-07 → 令和8年',  ev("toWareki(2026,8,7)") === '令和8年');

  /* ③ CRUD: 学歴追加 → 値入力 → store 反映 */
  d.getElementById('btnAddEdu').click();
  t('学歴項目追加でカード生成', d.querySelectorAll('#eduList .crud-item').length === 1);
  const schoolInput = d.querySelector('#eduList .crud-item input[type="text"]');
  schoolInput.value = '○○大学 経済学部';
  schoolInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  t('入力値がstoreに反映', ev("store.get().education[0].school") === '○○大学 経済学部');
  ev("store.update(st=>{ st.education[0].year = 2019; st.education[0].month = 4; },{render:'light'})");
  t('プレビューに学校名が反映', d.getElementById('a4Preview').textContent.includes('○○大学'));

  /* ④ フィールド検証 */
  ev("showFieldError('phone', validateField('phone','abc'))");
  t('電話番号形式エラーメッセージ', d.getElementById('e_phone').textContent.includes('090-1234-5678'));
  ev("showFieldError('phone', validateField('phone','090-1234-5678'))");
  t('正常な電話番号はエラー解除', d.getElementById('e_phone').textContent === '');
  t('ふりがな に漢字入力は拒否', ev("validateField('nameKana','山田')") === 'ひらがなで入力してください');

  /* ⑤ 空白期間の警告 */
  ev(`store.update(s=>{ s.workHistory=[
    {id:'a',startY:2020,startM:4,endY:2021,endM:3,company:'A社',role:''},
    {id:'b',startY:2022,startM:10,endY:null,endM:null,company:'B社',role:''} ]; },{render:false})`);
  t('空白期間の自動検出（約18か月）', ev("computeWarnings()").some(w => w.includes('空白期間')));

  /* ⑥ バックアップ Export/Import ラウンドトリップ + 悪性JSON遮断 */
  const restored = ev("sanitizeState(JSON.parse(JSON.stringify(store.get())))");
  t('Export→整備ラウンドトリップ一致（学校名）', restored.education[0].school === '○○大学 経済学部');
  t('悪性 photoDataUrl を遮断', ev("sanitizeState({profile:{photoDataUrl:'javascript:alert(1)'}}).profile.photoDataUrl") === '');

  /* ⑦ 自動保存 */
  ev("store.save()");
  t('localStorage保存が存在', !!window.localStorage.getItem('rirekiStudio.v1'));

  /* ⑧-B 面接タブ (v2.12) */
  t('面接タブボタン存在', d.querySelector('.tab-btn[data-tab="mensetsu"]') !== null);
  t('想定質問データ72件(18+9×6)', ev('MQ.length') === 72);
  t('面接カテゴリチップ10個', d.querySelectorAll('#mqCats .chip').length === 10);
  t('面接直前チェック6件描画', d.querySelectorAll('#mqTips li').length === 6);
  t('初期リスト 共通18問描画', d.querySelectorAll('#mqList .mq-item').length === 18);
  ev("store.update(st=>{ st.mensetsu.cat='営業'; },{render:false})");
  ev("renderMensetsu()");
  t('営業選択時 24問（共通18+職種6）', d.querySelectorAll('#mqList .mq-item').length === 24);
  ev("store.update(st=>{ st.motivation='飲食店アルバイトで団体予約を月5件獲得しました。貴社の新規開拓営業に行動力を貢献します。'; },{render:'light'})");
  d.getElementById('btnMqDeep').click();
  const deepN = d.querySelectorAll('#mqDeepResult .mq-deep').length;
  t('深掘り質問5件以上生成（実際:'+deepN+')', deepN >= 5);
  t('数字再現性の質問を含む', d.getElementById('mqDeepResult').textContent.includes('5件'));
  t('面接設定 store 整備ラウンドトリップ', ev("sanitizeState({mensetsu:{cat:'営業'}}).mensetsu.cat") === '営業');

  /* ⑧-C 逆質問ジェネレーター (v2.13) */
  t('段階チップ3個', d.querySelectorAll('#gqStages .chip').length === 3);
  t('相手チップ3個', d.querySelectorAll('#gqTargets .chip').length === 3);
  t('逆質問NG 6件描画', d.querySelectorAll('#gqNgList li').length === 6);
  t('初期自動生成5問', d.querySelectorAll('#gqResult .mq-deep').length === 6); // 5問+締め
  ev("store.update(st=>{ st.mensetsu.cat='営業'; st.mensetsu.gqStage='最終面接'; },{render:false})");
  ev("renderGyaku()");
  const gqTxt = d.getElementById('gqResult').textContent;
  t('職種 連動(営業→トップセールス)', gqTxt.includes('トップセールス'));
  t('段階反映（最終面接→3年後）', gqTxt.includes('3年後に目指している姿'));
  t('締めの一言を表示', gqTxt.includes('締めの一言'));
  t('設定整備（有効値を維持）', ev("sanitizeState({mensetsu:{gqStage:'最終面接',gqTarget:'役員・社長'}}).mensetsu.gqStage") === '最終面接');
  t('設定整備（悪性値を遮断）', ev("sanitizeState({mensetsu:{gqStage:'<script>'}}).mensetsu.gqStage") === '一次面接');

  /* ⑧-D 内定タブ (v2.14) */
  t('内定タブボタン存在', d.querySelector('.tab-btn[data-tab="naitei"]') !== null);
  const th = ev("calcTakeHome(220000, 2, 'u39', false)");
  t('手取り < 額面', th.netM < 220000);
  t('手取り率 70〜90% 範囲', th.rate > 0.7 && th.rate < 0.9);
  t('住民税 初年度免除オプション', ev("calcTakeHome(220000, 2, 'u39', true).J") === 0);
  t('40代は社保がより多い（介護）', ev("calcTakeHome(220000, 2, 'a40', false).SI") > th.SI);
  t('年齢チップ3個描画', d.querySelectorAll('#payAges .chip').length === 3);
  t('メール場面チップ5個描画', d.querySelectorAll('#mailScenes .chip').length === 5);
  ev("store.update(s2=>{ s2.pay.monthly=220000; s2.pay.bonus=2; },{render:false})");
  ev("renderPay()");
  t('手取り結果の金額表示', d.getElementById('payResult').textContent.includes('手取り月額'));
  ev("store.update(s2=>{ s2.pay.cmpA.monthly=220000; s2.pay.cmpB.monthly=260000; s2.profile.nameKanji='山田 太郎'; s2.payUi.company='株式会社テスト'; s2.payUi.scene='decline'; },{render:false})");
  ev("renderCmp()");
  t('比較の勝敗表示（B社）', d.getElementById('cmpResult').textContent.includes('B社の方が手取りは多い'));
  ev("renderMail()");
  const mailTxt = d.getElementById('mailView').textContent;
  t('メール会社名の自動挿入', mailTxt.includes('株式会社テスト'));
  t('メール署名がプロフィール連動', mailTxt.includes('山田 太郎'));
  t('メール場面反映（辞退）', mailTxt.includes('辞退させていただきたく'));
  t('手取り入力整備（範囲外を遮断）', ev("sanitizeState({pay:{monthly:999999999}}).pay.monthly") === null);

  /* ⑧-E 電話台本+書類 (v2.15) */
  t('電話場面チップ4個', d.querySelectorAll('#phoneScenes .chip').length === 4);
  t('書類10件描画', d.querySelectorAll('#docList li').length === 10);
  ev("store.update(s2=>{ s2.profile.nameKanji='佐藤 一郎'; s2.payUi.company='株式会社ABC'; s2.payUi.phoneScene='decline'; },{render:'light'})");
  const phTxt = d.getElementById('phoneView').textContent;
  t('台本の場面反映（辞退電話）', phTxt.includes('辞退させていただきたく'));
  t('台本に氏名自動挿入（renderLight連動）', phTxt.includes('佐藤 一郎'));
  t('台本に会社名自動挿入', phTxt.includes('株式会社ABC'));
  t('コツ表示（台本内）', phTxt.includes('メール'));
  t('台本設定整備（悪性値を遮断）', ev("sanitizeState({payUi:{phoneScene:'<img>'}}).payUi.phoneScene") === 'thanks');

  /* ⑧ XSSポリシー: 描画結果に script ノードなし */
  t('プレビューに script 非含有', d.getElementById('a4Preview').querySelectorAll('script').length === 0);

  console.log(`\n=== 結果: ${pass} PASS / ${fail} FAIL ===`);
  process.exit(fail ? 1 : 0);
}, 80);
