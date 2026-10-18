/* Read-model exclusion only. Originals remain in the authenticated event store. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CCThreadsArchive=api;})(typeof window==='undefined'?null:window,function(){
 const eventIds=Object.freeze([1072,1073,1074,1075,1076,1085,1086,1105]);
 const taskId='threads-library-import-v1',url='https://docs.google.com/spreadsheets/d/1jLsJqgZrWi6e4s6Wt6eesfx0A0PomKNQlAHNAuA2gWU/edit';
 return Object.freeze({enabled:true,eventIds,taskId,url,
  isArchivedRecord(row){const task=row?.taskId||row?.task_id,id=String(row?.eventRecordId??row?.recordId??row?.id??'');return task===taskId&&eventIds.some(n=>String(n)===id);},
  acceptsSource(draft){const s=draft?.source;if(!s||!['kyun','choi'].includes(s.account)||!String(draft.id||'').startsWith('live-'))return true;return s.readContract==='threads-active-v1'&&!this.isArchivedRecord(s);},
  isRemoteThreadsCacheKey(key){return /^source:live-(?:kyun|choi)-/.test(String(key));}
 });
});
