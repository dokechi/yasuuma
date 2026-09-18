(()=>{
  if(window.CCHomeMenuFixV224)return;
  const H=window.CCHome;
  if(!H)return;

  function close(){
    try{
      if(typeof closeMenus==='function'){
        closeMenus();
        return;
      }
      document.querySelectorAll('.retro-menu.open').forEach(menu=>menu.classList.remove('open'));
      document.querySelectorAll('.menu-item[aria-expanded="true"]').forEach(button=>button.setAttribute('aria-expanded','false'));
    }catch(error){
      console.warn('HOME menu close failed',error);
    }
  }

  const previousShow=H.show;
  if(typeof previousShow==='function'){
    H.show=function(){
      close();
      const out=previousShow.apply(this,arguments);
      close();
      requestAnimationFrame(close);
      return out;
    };
  }

  // HOME上の操作へ移った時点で、デスクトップメニューは必ず閉じる。
  document.addEventListener('click',event=>{
    if(!H.active)return;
    if(event.target.closest('#menuBar .menu-wrap'))return;
    if(event.target.closest('#commandHome,#ccPrimaryNav,#ccDestination,#ccMore,.home-mobile-nav')){
      close();
    }
  },true);

  // HOMEが表示されたまま再描画されても、開きっぱなしを残さない。
  const home=document.getElementById('commandHome');
  if(home){
    const observer=new MutationObserver(()=>{
      if(H.active)close();
    });
    observer.observe(home,{childList:true,subtree:true});
  }

  if(H.active)close();

  window.CCHomeMenuFixV224={version:'224.1',close};
})();