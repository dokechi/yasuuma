// Existing owner-authenticated publishing records only. No new table or grant.
export const publishingImageTasks=Object.freeze({
 'insurance-threads-v1':'insurance',
 'otoku-threads-v1':'otoku',
 'rakuten-threads-v1':'rakuten',
 'lottery-threads-v1':'lottery',
 'tanaka-threads-v1':'tanaka'
});
export function publishingImageAccount(row){
 if(row?.domain!=='sns'||!row.payload||typeof row.payload!=='object'||Array.isArray(row.payload))return null;
 const key=publishingImageTasks[row.task_id];
 if(!key)return null;
 // Preserve the already deployed insurance identity checks.
 if(key==='insurance'&&(row.payload.account!=='保険'||row.payload.handle!=='@sucker0508'))return null;
 return key;
}
