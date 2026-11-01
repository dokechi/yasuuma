/* Read-only presentation of records already available to this browser.
   No requests, timers, writes, inferred inventory, or claims of remote posting. */
import {publishingAccounts,draftsForAccount} from './accounts.js?v=20261101.9-workbook';
import {groupDrafts,dayInJapan} from './notebook.js?v=20261031.1-lottery';
import {seenRevision,currentPosted} from './qol-model.js?v=20261031.1-lottery';
import {holdsActiveText} from './desk-model.js?v=20261101.9-workbook';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validTime = value => Number.isFinite(value) && value > 0 && Number.isFinite(new Date(value).getTime());
const own = (value,key) => record(value) && Object.hasOwn(value,key) ? value[key] : undefined;
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const validDraft = d => record(d) && typeof d.id === 'string' && !!d.id &&
  typeof d.title === 'string' && typeof d.body === 'string' &&
  record(d.source) && typeof d.source.id === 'string' &&
  !!d.source.id.trim() && !['undefined','null'].includes(d.source.id);

export function summarizeLivingRooms({notebook,loading=false,complete=false,connected=false,
  message='',active=null,place=null,pending=null,externalNotes=false,now=Date.now()}={}) {
  const available = typeof notebook?.all === 'function' ? notebook.all() : null;
  const rows = (Array.isArray(available) ? available : []).filter(validDraft);
  const busy = loading === true;
  // Complete means the existing reader completed its current source read, not
  // a promise about future server changes or the count of all historical work.
  const provisional = record(pending) && Array.isArray(pending.drafts);
  const confirmed = connected === true && complete === true && !busy && !provisional && Array.isArray(available);
  const status = busy ? 'loading' : confirmed ? 'ready' :
    /失敗|エラー|できません|再試行/.test(String(message || '')) ? 'attention' : 'unknown';
  const pref = (key,fallback) => typeof notebook?.pref === 'function' ? notebook.pref(key,fallback) : fallback;
  const seen = pref('seenRevisions',{});
  const today = validTime(now) ? dayInJapan(now) : '';
  const stale = externalNotes === true;
  const persistent = typeof notebook?.persistent === 'function' ? notebook.persistent() === true : null;
  const roomSummaries = publishingAccounts.filter(account => !account.pending).map(account => {
    const drafts = draftsForAccount(rows,account);
    const groups = groupDrafts(drafts);
    const completed = typeof notebook?.completed === 'function' ? notebook.completed(account.place) : [];
    const done = new Map((Array.isArray(completed) ? completed : []).filter(mark => record(mark) &&
      mark.place === account.place && typeof mark.id === 'string').map(mark => [mark.id,mark]));
    const marksFor = d => {
      const readMark = done.get(d.id);
      // A previous version's read marker is not a read of the current text.
      const read = !!readMark && readMark.title === d.title && readMark.body === d.body;
      const postedMark = pref('posted:'+d.id,null);
      const posted = record(postedMark) && validTime(postedMark.time) && currentPosted(d,postedMark);
      return {
        pinned: typeof notebook?.flag === 'function' && notebook.flag('pin',d.id) === true,
        unread: own(seen,d.id) !== seenRevision(d), read, posted,
        readToday: read && !!today && validTime(readMark.time) && dayInJapan(readMark.time) === today,
        postedToday: posted && !!today && dayInJapan(postedMark.time) === today
      };
    };
    const marks = new Map(drafts.map(d => [d.id,marksFor(d)]));
    const currentDraft = place === account.place && validDraft(active) &&
      active.place === account.place && active.source.account === account.key &&
      drafts.some(d => d.id === active.id && d.source.id === active.source.id) ? active : null;
    const metadata = d => ({id:d.id,title:d.title,kind:String(d.kind || '原稿'),
      source:{account:d.source.account,id:d.source.id},...(d === currentDraft ? marksFor(d) : marks.get(d.id))});
    const representative = (group,predicate=()=>true) => {
      const qualifying = group.filter(predicate);
      return qualifying.find(d => d.id === currentDraft?.id) || qualifying[0];
    };
    const list = predicate => groups.map(group => representative(group,predicate)).filter(Boolean).map(metadata);
    const allDrafts = list();
    const favoriteDrafts = list(d => marks.get(d.id).pinned);
    const unreadDrafts = list(d => marks.get(d.id).unread);
    const readDrafts = list(d => marks.get(d.id).read);
    const postedDrafts = list(d => marks.get(d.id).posted);
    const pendingUpdate = !!currentDraft && record(pending) && Array.isArray(pending.drafts) &&
      holdsActiveText(currentDraft,pending.drafts.filter(validDraft),pending.complete === true);
    const loadedCount = groups.length;
    const unreadCount = unreadDrafts.length;
    const favoriteCount = favoriteDrafts.length;
    const scopeNote = (confirmed ? '今回読み込んだ保存原稿と、この端末のメモです。' :
      'この端末で利用できる保存分です。保存先の全体は未確認です。') +
      (persistent === false ? ' 端末に保存できないため、メモはこの画面内だけで保持しています。' : '');
    const countText = confirmed ? '保存原稿 '+loadedCount+'本' : '利用できる保存原稿 '+loadedCount+'本';
    const notice = pendingUpdate ? '読んでいる原稿に更新が届いています。本文はまだ置き換えていません。' :
      stale ? '別の画面の読書メモが更新されています。入り直すと反映します。' :
      unreadCount ? '保存分に未読・更新 '+unreadCount+'本。既読とは本文を表示した端末メモです。' :
      busy ? '保存先を読み込み中です。手元の原稿はそのまま読めます。' :
      status === 'attention' ? '保存先の読取を確認できませんでした。手元の原稿は残しています。' :
      !confirmed ? '保存先の全体は未確認です。未読なし・作業完了とは判定しません。' :
      loadedCount ? '今回読み込んだ保存分に、未読・更新の原稿はありません。' : '今回の読取では、この持ち場の保存原稿はありません。';
    const briefing = pendingUpdate ? countText+'。読んでいる本文を保ったまま、更新を預かっています。' :
      confirmed ? '保存原稿 '+loadedCount+'本。未読・更新 '+unreadCount+'本。お気に入り '+favoriteCount+'本。' :
      '利用できる保存原稿 '+loadedCount+'本。保存分の未読・更新 '+unreadCount+'本。';
    return {key:account.key,place:account.place,name:account.name,handle:account.handle,
      state:status,loadedCount,totalCount:confirmed ? loadedCount : null,unreadCount,favoriteCount,
      readCount:readDrafts.length,postedCount:postedDrafts.length,
      todayReadCount:groups.filter(group => group.some(d => marks.get(d.id).readToday)).length,
      todayPostedCount:groups.filter(group => group.some(d => marks.get(d.id).postedToday)).length,
      pendingUpdate,current:currentDraft ? metadata(currentDraft) : null,
      light:pendingUpdate || unreadCount ? 'notice' : !confirmed ? 'waiting' : loadedCount ? 'ready' : 'quiet',
      briefing,scopeNote,notice,drafts:allDrafts,favoriteDrafts,unreadDrafts,
      labels:{desk:currentDraft ? '読んでいる原稿へ' : '原稿を読む',shelf:countText,
        favorites:'この端末のお気に入り '+favoriteCount+'本',
        notice:pendingUpdate ? '本文の更新を預かっています' : unreadCount ? '保存分の未読・更新 '+unreadCount+'本' :
          confirmed ? '保存分の未読・更新なし' : '保存先の全体は未確認',
        read:'この端末の読了メモ '+readDrafts.length+'本',posted:'この端末の投稿済みメモ '+postedDrafts.length+'本'}
    };
  });
  roomSummaries.push({key:'sourcing',place:'shiire',name:'仕入れ',handle:'',state:'unknown',
    loadedCount:null,totalCount:null,unreadCount:null,favoriteCount:null,readCount:null,postedCount:null,
    todayReadCount:null,todayPostedCount:null,pendingUpdate:false,current:null,light:'quiet',
    briefing:'購入・在庫・売却は、いつもの仕入れ帳で確認できます。',
    scopeNote:'仕入れ帳の在庫・比較状況は、この部屋では集計していません。',
    notice:'未比較・要確認の件数は未集計です。仕入れ帳で確認してください。',
    drafts:[],favoriteDrafts:[],unreadDrafts:[],
    labels:{desk:'購入・在庫・売却',shelf:'仕入れ帳へ',favorites:'仕入れ帳で確認',notice:'仕入れの状況は未集計',read:'未集計',posted:'未集計'}
  });
  return freeze({state:status,complete:confirmed,connected:connected === true,loading:busy,
    externalNotes:stale,persistent,provisional,rooms:roomSummaries});
}
