(()=>{
  if(!window.CCSourcingLastCheck||typeof renderStats!=='function')return;
  const baseStats=renderStats;
  renderStats=function(){
    baseStats();
    window.CCSourcingLastCheck.paintCounts();
  };
})();
