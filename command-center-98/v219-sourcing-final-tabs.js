(()=>{
  if(typeof renderSourcing!=='function'||typeof sourcingApp!=='object')return;

  const tabs=document.getElementById('sourcingTabs');
  if(!tabs)return;

  let auditCategory='sourcing';
  const h=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function tab(sub){return tabs.querySelector('button[data-sourcing-sub="'+sub+'"]')}
  function relabelTab(button,label){
    if(!button)return;
    const count=button.querySelector('.sourcing-tab-count');
    button.replaceChildren(document.createTextNode(label+' '));
    if(count)button.appendChild(count);
  }

  function finalizeTabs(){
    const queue=tab('queue'),hold=tab('hold'),purchases=tab('purchases'),miss=tab('miss');
    const discoveries=tab('discoveries'),suppliers=tab('suppliers'),storeAudit=tab('store-audit');

    relabelTab(queue,'仕入れ候補');
    relabelTab(hold,'保留');
    relabelTab(purchases,'実仕入れ');
    relabelTab(miss,'追跡終了');
    relabelTab(discoveries,'仕入れ先候補');
    relabelTab(suppliers,'仕入れ先台帳');

    if(storeAudit)storeAudit.remove();

    const productGroup=tabs.querySelector('.sourcing-tab-group.product');
    const storeGroup=tabs.querySelector('.sourcing-tab-group.store');
    const productLabel=productGroup?.querySelector('.sourcing-tab-group-label');
    const storeLabel=storeGroup?.querySelector('.sourcing-tab-group-label');
    if(productLabel)productLabel.textContent='商品';
    if(storeLabel)storeLabel.textContent='仕入れ先';

    if(productGroup){
      [queue,hold,purchases,miss].filter(Boolean).forEach(b=>productGroup.appendChild(b));
    }
    if(storeGroup){
      [discoveries,suppliers].filter(Boolean).forEach(b=>storeGroup.appendChild(b));
    }

    document.querySelectorAll('#sourcingTabs>.separator,.sourcing-tab-group .separator').forEach(x=>x.remove());
  }

  function storeSnapshot(){
    return window.CCStoreAudit?.snapshot||null;
  }

  function auditRows(kind){
    const s=storeSnapshot();
    if(!s||!Array.isArray(s[kind]))return '';
    const labels={sourcing:'仕入れ対象',tcg:'TCG別枠',excluded:'対象外'};
    const cls={sourcing:'accepted',tcg:'separate',excluded:'excluded'};
    return s[kind].map((x,i)=>
      '<tr class="'+cls[kind]+'">'+
      '<td class="store-no">'+String(i+1).padStart(2,'0')+'</td>'+
      '<td><b>'+h(x.name)+'</b></td>'+
      '<td>'+h(x.month)+'</td>'+
      '<td class="store-products">'+h(x.products||'—')+'</td>'+
      '<td><span class="store-status '+cls[kind]+'">'+h(labels[kind])+'</span></td>'+
      '<td>'+h(x.reason||'')+'</td>'+
      '</tr>'
    ).join('');
  }

  function auditPanel(){
    const s=storeSnapshot();
    if(!s)return '';
    const counts={
      sourcing:Array.isArray(s.sourcing)?s.sourcing.length:0,
      tcg:Array.isArray(s.tcg)?s.tcg.length:0,
      excluded:Array.isArray(s.excluded)?s.excluded.length:0
    };
    const total=counts.sourcing+counts.tcg+counts.excluded;
    return '<details class="supplier-candidate-audit">'+
      '<summary><b>既存店の分類</b> <span>'+total+'店</span><small>以前の「店舗判定」はここへ統合</small></summary>'+
      '<div class="supplier-candidate-audit-body">'+
        '<div class="store-audit-summary">'+
          '<button class="push-button small '+(auditCategory==='sourcing'?'selected':'')+'" data-final-store-kind="sourcing">仕入れ対象 <b>'+counts.sourcing+'</b></button>'+
          '<button class="push-button small '+(auditCategory==='tcg'?'selected':'')+'" data-final-store-kind="tcg">TCG別枠 <b>'+counts.tcg+'</b></button>'+
          '<button class="push-button small '+(auditCategory==='excluded'?'selected':'')+'" data-final-store-kind="excluded">対象外 <b>'+counts.excluded+'</b></button>'+
        '</div>'+
        '<div class="supplier-table-wrap"><table class="supplier-table store-audit-table">'+
          '<thead><tr><th>No.</th><th>店舗</th><th>購入月</th><th>購入商品</th><th>分類</th><th>理由</th></tr></thead>'+
          '<tbody>'+auditRows(auditCategory)+'</tbody>'+
        '</table></div>'+
        '<p class="store-audit-foot">分類履歴は消していません。トップから独立した「店舗判定」だけをなくしています。</p>'+
      '</div>'+
    '</details>';
  }

  function bindAudit(host){
    host.querySelectorAll('[data-final-store-kind]').forEach(button=>{
      button.onclick=()=>{
        if(typeof bump==='function')bump(button);
        auditCategory=button.dataset.finalStoreKind;
        const old=host.querySelector('.supplier-candidate-audit');
        if(!old)return;
        const wrap=document.createElement('div');
        wrap.innerHTML=auditPanel();
        const fresh=wrap.firstElementChild;
        old.replaceWith(fresh);
        bindAudit(host);
      };
    });
  }

  function enhanceSupplierCandidates(host){
    if(sourcingApp.sub!=='discoveries')return;
    const caption=host.querySelector('.sourcing-caption b');
    if(caption&&(caption.textContent||'').trim()==='店の発見')caption.textContent='新しい仕入れ先候補';
    const note=host.querySelector('.purchase-note');
    if(note&&/安い店を見つけた記録/.test(note.textContent||'')){
      note.textContent='まだ仕入れ先台帳に定着していない候補店です。商品が決まった時点で仕入れ候補として判断します。';
    }
    if(!host.querySelector('.supplier-candidate-audit')){
      host.insertAdjacentHTML('beforeend',auditPanel());
    }
    bindAudit(host);
  }

  function relabelTracking(host){
    host.querySelectorAll('.sourcing-miss').forEach(el=>el.textContent='追跡終了');
    host.querySelectorAll('.sourcing-verdict,.state-tag').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(t==='見送り'||t.includes('見当違い'))el.textContent='追跡終了';
    });
    const caption=host.querySelector('.sourcing-caption b');
    if(caption&&(caption.textContent||'').trim()==='見送り')caption.textContent='追跡終了';
    host.querySelectorAll('.supplier-table th').forEach(th=>{
      if((th.textContent||'').trim()==='見送り')th.textContent='追跡終了';
    });
  }

  function updateIntro(){
    const intro=document.querySelector('#sourcingHub .sourcing-intro');
    if(intro)intro.innerHTML='<b>仕入れ専用。</b> 商品は「仕入れ候補 → 保留 / 実仕入れ / 追跡終了」で管理。<b>実仕入れはGmailの購入履歴を正本</b>として表示します。仕入れ先は「候補」と「台帳」の2段階だけに整理しています。';
  }

  function polish(){
    finalizeTabs();
    updateIntro();
    const host=document.getElementById('sourcingBody');
    if(!host)return;
    relabelTracking(host);
    enhanceSupplierCandidates(host);
  }

  const baseRender=renderSourcing;
  renderSourcing=function(){
    if(sourcingApp.sub==='store-audit')sourcingApp.sub='discoveries';
    baseRender();
    polish();
  };

  const baseJudge=sourcingJudge;
  sourcingJudge=async function(id,verdict,btn){
    if(verdict!=='miss')return baseJudge(id,verdict,btn);
    if(!id||app.busy)return;
    if(typeof bump==='function')bump(btn);
    if(typeof setStatus==='function')setStatus('追跡終了として記録中...',true);
    try{
      const r=await fetch(API,{
        method:'PATCH',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+AUTH},
        body:JSON.stringify({action:'sourcing_verdict',id,verdict:'miss',note:null})
      });
      const d=await r.json();
      if(!r.ok||!d?.ok)throw new Error(d?.error||'保存失敗');
      if(typeof toast==='function')toast('追跡終了として記録しました。','good');
      await load('sourcing');
    }catch(e){
      if(typeof setStatus==='function')setStatus('保存エラー');
      if(typeof toast==='function')toast('追跡終了を保存できませんでした','bad');
    }
  };

  const style=document.createElement('style');
  style.textContent=`
    .supplier-candidate-audit{margin-top:12px;background:#d8d8d8;border:1px solid #808080}
    .supplier-candidate-audit>summary{cursor:pointer;padding:7px 9px;background:#e7e7e7;font-size:12px}
    .supplier-candidate-audit>summary span{display:inline-block;margin-left:5px;padding:0 5px;background:#fff;border:1px solid #777;font-weight:700}
    .supplier-candidate-audit>summary small{margin-left:10px;color:#555;font-weight:400}
    .supplier-candidate-audit-body{padding:8px}
    .supplier-candidate-audit .store-audit-summary{margin-bottom:8px}
    .supplier-candidate-audit .store-audit-table{min-width:1040px}
    .supplier-candidate-audit .store-products{min-width:310px;line-height:1.45}
    .supplier-candidate-audit .store-no{width:48px;color:#555;text-align:right}
    @media(max-width:700px){.supplier-candidate-audit>summary small{display:block;margin:4px 0 0}.supplier-candidate-audit .store-audit-summary .push-button{min-height:38px}}
  `;
  document.head.appendChild(style);

  polish();
  window.CCSourcingFinalTabs={version:'219.1',polish};
})();