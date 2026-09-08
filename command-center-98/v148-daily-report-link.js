(()=>{
  const DAILY_REPORT_URL='http://127.0.0.1:8765/';
  const COONEY_URL='https://cooney-os.vercel.app/';
  const menu=document.getElementById('menuBar');
  const helpButton=document.getElementById('menuHelp');
  if(!menu||!helpButton)return;

  let dailyButton=document.getElementById('menuDaily');
  const createdDaily=!dailyButton;
  if(!dailyButton){
    dailyButton=document.createElement('button');
    dailyButton.className='menu-item';
    dailyButton.type='button';
    dailyButton.id='menuDaily';
    dailyButton.setAttribute('aria-label','このPCで作業日報を開く');
    dailyButton.title='このPCで作業日報を開く';
    dailyButton.innerHTML='<u>作</u>業日報(R)';
    helpButton.before(dailyButton);
  }

  let cooneyButton=document.getElementById('menuCooney');
  const createdCooney=!cooneyButton;
  if(!cooneyButton){
    cooneyButton=document.createElement('button');
    cooneyButton.className='menu-item';
    cooneyButton.type='button';
    cooneyButton.id='menuCooney';
    cooneyButton.setAttribute('aria-label','クーニーOSを開く');
    cooneyButton.title='クーニーOSを開く';
    cooneyButton.textContent='92';
    dailyButton.after(cooneyButton);
  }

  const openUrl=url=>{
    if(typeof closeMenus==='function')closeMenus();
    window.open(url,'_blank','noopener,noreferrer');
  };

  if(createdDaily){
    dailyButton.addEventListener('click',()=>{
      if(typeof bump==='function')bump(dailyButton);
      openUrl(DAILY_REPORT_URL);
    });
  }
  if(createdCooney){
    cooneyButton.addEventListener('click',()=>{
      if(typeof bump==='function')bump(cooneyButton);
      openUrl(COONEY_URL);
    });
  }

  if(!window.__ccDailyCooneyKeysBound){
    window.__ccDailyCooneyKeysBound=true;
    document.addEventListener('keydown',event=>{
      const typing=event.target.matches?.('input,textarea,select,[contenteditable="true"]');
      if(typing||event.repeat||!event.altKey)return;
      const key=event.key.toLowerCase();
      if(key==='r'){
        event.preventDefault();
        document.getElementById('menuDaily')?.click();
      }else if(key==='c'){
        event.preventDefault();
        document.getElementById('menuCooney')?.click();
      }
    });
  }

  const helpGrid=document.querySelector('#helpModal .help-grid');
  if(helpGrid&&!helpGrid.querySelector('[data-help-cooney]')){
    const readLabel=Array.from(helpGrid.querySelectorAll('dt')).find(item=>item.textContent==='既読');
    if(readLabel){
      if(!Array.from(helpGrid.querySelectorAll('dt')).some(item=>item.textContent==='作業日報')){
        const dailyTerm=document.createElement('dt');
        const dailyDescription=document.createElement('dd');
        dailyTerm.textContent='作業日報';
        dailyDescription.textContent='このPCの日報集計を新しいタブで開く';
        readLabel.before(dailyTerm,dailyDescription);
      }
      const cooneyTerm=document.createElement('dt');
      const cooneyDescription=document.createElement('dd');
      cooneyTerm.textContent='92';
      cooneyTerm.dataset.helpCooney='1';
      cooneyDescription.textContent='クーニーOSを新しいタブで開く';
      readLabel.before(cooneyTerm,cooneyDescription);
    }
    const keyLabel=Array.from(helpGrid.querySelectorAll('dt')).find(item=>item.textContent==='キー');
    if(keyLabel?.nextElementSibling){
      keyLabel.nextElementSibling.textContent='Alt+F / V / A / J / R / C、F1、F5';
    }
  }
})();
