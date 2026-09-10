/* Keep the main caption honest when the browser window loses focus. */
(()=>{
  const syncApplicationFocus=()=>{
    const inactive=document.visibilityState==='hidden'||!document.hasFocus();
    document.body.classList.toggle('cc-app-inactive',inactive);
  };

  window.addEventListener('focus',syncApplicationFocus);
  window.addEventListener('blur',syncApplicationFocus);
  document.addEventListener('visibilitychange',syncApplicationFocus);
  syncApplicationFocus();
})();
