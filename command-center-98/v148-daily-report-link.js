(()=>{
  const DAILY_REPORT_URL='http://127.0.0.1:8765/';
  const menu=document.getElementById('menuBar');
  const helpButton=document.getElementById('menuHelp');
  if(!menu||!helpButton||document.getElementById('menuDaily'))return;

  const button=document.createElement('button');
  button.className='menu-item';
  button.type='button';
  button.id='menuDaily';
  button.setAttribute('aria-label','このPCで作業日報を開く');
  button.title='このPCで作業日報を開く';
  button.innerHTML='<u>作</u>業日報(R)';
  helpButton.before(button);

  const openDailyReport=()=>{
    if(typeof closeMenus==='function')closeMenus();
    window.open(DAILY_REPORT_URL,'_blank','noopener,noreferrer');
  };
  button.addEventListener('click',()=>{
    if(typeof bump==='function')bump(button);
    openDailyReport();
  });
  document.addEventListener('keydown',event=>{
    const typing=event.target.matches?.('input,textarea,select,[contenteditable="true"]');
    if(typing||event.repeat||!event.altKey||event.key.toLowerCase()!=='r')return;
    event.preventDefault();
    button.click();
  });

  const helpGrid=document.querySelector('#helpModal .help-grid');
  if(helpGrid){
    const readLabel=Array.from(helpGrid.querySelectorAll('dt')).find(item=>item.textContent==='既読');
    if(readLabel){
      const term=document.createElement('dt');
      const description=document.createElement('dd');
      term.textContent='作業日報';
      description.textContent='このPCの日報集計を新しいタブで開く';
      readLabel.before(term,description);
    }
    const keyLabel=Array.from(helpGrid.querySelectorAll('dt')).find(item=>item.textContent==='キー');
    if(keyLabel?.nextElementSibling){
      keyLabel.nextElementSibling.textContent='Alt+F / V / A / J / R、F1、F5';
    }
  }
})();
