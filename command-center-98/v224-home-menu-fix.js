(()=>{
  if(window.CCHomeMenuFixV224)return;

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

  // HOMEや主要画面へ切り替える「その瞬間」だけ閉じる。
  // メニューを開いた後は監視・自動クローズしない。
  document.addEventListener('click',event=>{
    const nav=event.target.closest(
      '#ccPrimaryNav button, .home-mobile-nav button, #homeViewBtn, [data-home-action="home"]'
    );
    if(nav)close();
  },true);

  // 初期表示時に前回の開きっぱなしだけ掃除する。
  close();

  window.CCHomeMenuFixV224={version:'224.2',close};
})();