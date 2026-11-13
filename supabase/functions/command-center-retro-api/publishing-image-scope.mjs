// Existing owner-authenticated publishing records only. No new table or grant.
export const publishingImageTasks=Object.freeze({
 'insurance-threads-v1':'insurance',
 'otoku-threads-v1':'otoku',
 'rakuten-threads-v1':'rakuten',
 'lottery-threads-v1':'lottery',
 'tanaka-threads-v1':'tanaka',
 'skun-threads-v1':'skun',
 'kensho-threads-v1':'kensho',
 'manga-threads-v1':'manga'
});
export function publishingImageAccount(row){
 if(row?.domain!=='sns'||!row.payload||typeof row.payload!=='object'||Array.isArray(row.payload))return null;
 if(!Object.hasOwn(publishingImageTasks,row.task_id))return null;
 const key=publishingImageTasks[row.task_id];
 if(!key)return null;
 // Preserve the already deployed insurance identity checks.
 if(key==='insurance'&&(row.payload.account!=='\u4fdd\u967a'||row.payload.handle!=='@sucker0508'))return null;
 if(key==='skun'&&(row.payload.account!=='S\u304f\u3093'||row.payload.handle!=='@skun.koi'))return null;
 if(key==='kensho'&&(row.payload.account!=='\u61f8\u8cde\u5c0f\u30ca\u30b9'||row.payload.handle!=='@nasbi.777'))return null;
 if(key==='manga'&&(row.payload.account!=='\u6f2b\u753b'||row.payload.handle!=='@kousaka_san_'))return null;
 return key;
}
