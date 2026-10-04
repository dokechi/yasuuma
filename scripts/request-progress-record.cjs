// Validates an assistant work report and prints SQL for the existing private event store.
// No network, credentials, or user records are stored in this repository.
const fs=require('node:fs');
const M=require('../command-center-98/v230-request-progress.js');
function sqlForRecord(input){
  const {title,summary='',...payload}=input;
  if(typeof title!=='string'||!title.trim()||title.length>300)throw Error('A concise title is required');
  if(!payload.next_action||!M.time(payload.observed_at))throw Error('next_action and observed_at are required');
  if(payload.status==='needs_review'&&!payload.decision_needed)throw Error('decision_needed is required');
  if(payload.status==='blocked'&&!payload.blocker)throw Error('blocker is required');
  if(payload.last_progress_at!=null&&!M.time(payload.last_progress_at))throw Error('Invalid progress timestamp');
  const event={taskId:M.taskId,title,summary,payload:{...payload,kind:'request_progress',version:1}};
  const row=M.normalize(event,{now:Date.parse(payload.observed_at)});
  if(!row||!Object.hasOwn(M.labels,payload.status)||row.status!==payload.status)throw Error('Invalid status/evidence: '+(row?.reason||''));
  const q=s=>"'"+String(s).replaceAll("'","''")+"'";
  return 'insert into public.command_center_task_events (task_id,event_key,domain,priority,score,title,summary,payload,occurred_at) values ('+[M.taskId,row.id,'ai',row.priority===1?'S':row.priority===2?'A':'B',row.priority===1?95:row.priority===2?80:50,title,summary,JSON.stringify(event.payload),payload.observed_at].map(q).join(',')+')\non conflict (task_id,event_key) do update set title=excluded.title,summary=excluded.summary,priority=excluded.priority,score=excluded.score,payload=excluded.payload,occurred_at=excluded.occurred_at\nwhere command_center_task_events.occurred_at <= excluded.occurred_at\nreturning id,event_key,title,payload,occurred_at;';
}
module.exports={sqlForRecord};
if(require.main===module){const file=process.argv[2];if(!file)throw Error('Usage: node scripts/request-progress-record.cjs /private/work-report.json');process.stdout.write(sqlForRecord(JSON.parse(fs.readFileSync(file,'utf8')))+'\n')}
