/* Command Center 98 v1.57
 * Adds keyboard-equivalent behavior without changing feature data or navigation.
 */
(()=>{
  const modalSelector='.modal-backdrop';
  const dialogSelector='[role="dialog"]';
  const focusableSelector=[
    'button:not(:disabled)',
    'a[href]',
    'input:not(:disabled)',
    'select:not(:disabled)',
    'textarea:not(:disabled)',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  const modalState=new WeakMap();

  const isOpen=modal=>modal.classList.contains('open')&&modal.getAttribute('aria-hidden')!=='true';
  const openModals=()=>Array.from(document.querySelectorAll(modalSelector)).filter(isOpen);
  const activeModal=()=>openModals().at(-1)||null;
  const dialogFor=modal=>modal?.querySelector(dialogSelector)||null;
  const focusables=dialog=>Array.from(dialog?.querySelectorAll(focusableSelector)||[]).filter(el=>{
    const style=getComputedStyle(el);
    return !el.hidden&&style.display!=='none'&&style.visibility!=='hidden';
  });
  const firstFocusTarget=dialog=>dialog?.querySelector('[data-dialog-initial-focus="true"]')||focusables(dialog)[0]||dialog;

  const enterModal=modal=>{
    const previous=modalState.get(modal)||{};
    if(previous.open)return;
    const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
    modalState.set(modal,{open:true,opener});
    const dialog=dialogFor(modal);
    if(!dialog)return;
    if(!dialog.hasAttribute('tabindex'))dialog.setAttribute('tabindex','-1');
    requestAnimationFrame(()=>firstFocusTarget(dialog)?.focus({preventScroll:true}));
  };

  const leaveModal=modal=>{
    const previous=modalState.get(modal);
    if(!previous?.open)return;
    modalState.set(modal,{open:false,opener:previous.opener});
    requestAnimationFrame(()=>{
      if(previous.opener?.isConnected)previous.opener.focus({preventScroll:true});
    });
  };

  document.querySelectorAll(modalSelector).forEach(modal=>{
    modalState.set(modal,{open:false,opener:null});
    const sync=()=>isOpen(modal)?enterModal(modal):leaveModal(modal);
    new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['class','aria-hidden']});
    sync();
  });

  document.addEventListener('focusin',event=>{
    const modal=activeModal();
    const dialog=dialogFor(modal);
    if(dialog&&!dialog.contains(event.target))firstFocusTarget(dialog)?.focus({preventScroll:true});
  },true);

  document.addEventListener('keydown',event=>{
    const modal=activeModal();
    const dialog=dialogFor(modal);
    if(!dialog)return;

    if(event.key==='Tab'){
      const items=focusables(dialog);
      if(!items.length){
        event.preventDefault();
        dialog.focus({preventScroll:true});
        return;
      }
      const first=items[0],last=items.at(-1);
      if(event.shiftKey&&document.activeElement===first){
        event.preventDefault();
        last.focus();
      }else if(!event.shiftKey&&document.activeElement===last){
        event.preventDefault();
        first.focus();
      }
    }

    if(event.key==='Enter'&&!event.defaultPrevented){
      const target=event.target;
      if(target instanceof Element&&target.matches('button,a[href],textarea,select,[contenteditable="true"],input:not([type="checkbox"]):not([type="radio"])'))return;
      const action=dialog.querySelector('[data-default-action="true"]:not(:disabled)');
      if(action){
        event.preventDefault();
        action.click();
      }
    }
  },true);

  const enhanceTaskRows=()=>{
    document.querySelectorAll('.task-row').forEach(row=>{
      row.tabIndex=0;
      row.setAttribute('role','button');
      row.setAttribute('aria-selected',String(row.classList.contains('selected')));
      const title=row.querySelector('td:nth-child(2)')?.textContent?.trim();
      if(title)row.setAttribute('aria-label','タスクを表示: '+title);
      if(row.dataset.keyboardReady==='true')return;
      row.dataset.keyboardReady='true';
      row.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){
          event.preventDefault();
          row.click();
          return;
        }
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){
          const rows=Array.from(document.querySelectorAll('.task-row'));
          const offset=event.key==='ArrowDown'?1:-1;
          const next=rows[rows.indexOf(row)+offset];
          if(next){
            event.preventDefault();
            next.focus();
          }
        }
      });
    });
  };

  const taskRows=document.getElementById('taskRows');
  if(taskRows){
    new MutationObserver(enhanceTaskRows).observe(taskRows,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    enhanceTaskRows();
  }

  const helpDefault=document.getElementById('helpCloseBottom');
  if(helpDefault)helpDefault.setAttribute('data-default-action','true');
})();
