// Private image attachments. Originals are immutable and fetched only on demand.
// Reuse the existing excluded asset store and the guarded Threads payload update.
import {readEvent as readLegacyEvent, threadsAccount as legacyAccount} from './threads-manual-api.mjs';
function threadsAccount(row) {
 if(row?.task_id==='insurance-threads-v1' && row?.domain==='sns' && row?.payload?.account==='保険' && row?.payload?.handle==='@sucker0508') return 'insurance';
 return legacyAccount(row);
}
async function readEvent(d,id) {
 if(/^[1-9]\d{0,14}$/.test(String(id))){
  const {data,error}=await d.admin.from('command_center_task_events').select('*').eq('task_id','insurance-threads-v1').eq('id',Number(id)).maybeSingle();
  if(error)throw error;
  if(data){threadsAccount(data);return data;}
 }
 return readLegacyEvent(d,id);
}
export const IMAGE_CONTRACT = 'threads-post-images-v1';
export const ASSET_TASK = 'affiliate-assets-v1';
const TABLE = 'command_center_task_events';
const LIMIT = 20, FILE_LIMIT = 6 * 1024 * 1024, TOTAL_LIMIT = 24 * 1024 * 1024;
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const stable = v => JSON.stringify(v, (_k, x) => object(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
export function imageUrl(value) {
  if (typeof value !== 'string' || value.length > 3000 || /[\s\\]/.test(value)) return '';
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; } catch { return ''; }
}
export function imageBytes(value) {
  if (typeof value !== 'string' || value.length > Math.ceil(FILE_LIMIT / 3) * 4 + 64) fail('threads_image_too_large');
  const match = value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length % 4) fail('threads_invalid_image');
  let bytes; try { bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0)); } catch { fail('threads_invalid_image'); }
  if (bytes.length > FILE_LIMIT) fail('threads_image_too_large');
  const isPng = bytes.length >= 33 && [137,80,78,71,13,10,26,10].every((x,i) => bytes[i] === x);
  const isJpeg = bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
  const ascii = (start,end) => String.fromCharCode(...bytes.slice(start,end));
  const isWebp = bytes.length >= 20 && ascii(0,4) === 'RIFF' && ascii(8,12) === 'WEBP' && ['VP8 ','VP8L','VP8X'].includes(ascii(12,16));
  if (!({png:isPng,jpeg:isJpeg,webp:isWebp})[match[1]]) fail('threads_invalid_image');
  return {dataUrl:value, mime:'image/' + match[1], size:bytes.length};
}
function manifest(row) {
  const value = row.payload.threads_images_v1;
  if (value == null) return {contract:IMAGE_CONTRACT, revision:0, images:[]};
  if (!object(value) || value.contract !== IMAGE_CONTRACT || !Number.isSafeInteger(value.revision) || value.revision < 1 || !Array.isArray(value.images) || value.images.length > LIMIT) fail('threads_images_invalid_reload',409);
  return value;
}
async function asset(d, key, row, account) {
  if (typeof key !== 'string' || !new RegExp('^threads:' + row.id + ':[a-f0-9]{64}$').test(key)) fail('threads_image_not_found',404);
  const {data,error} = await d.admin.from(TABLE).select('id,payload').eq('task_id',ASSET_TASK).eq('event_key',key).maybeSingle();
  if (error) throw error;
  if (!data || data.payload?.result_kind !== 'threads_post_image' || data.payload.owner_event_id !== row.id || data.payload.account_key !== account) fail('threads_image_not_found',404);
  return data;
}
function visible(value) { const {receipts,history,...result} = value; return result; }
function legacy(row) {
  const p = row.payload, raw = Array.isArray(p.post_images) ? p.post_images : Array.isArray(p.image_urls) ? p.image_urls : Array.isArray(p.finished_images?.pages) ? p.finished_images.pages : [];
  return raw.slice(0,LIMIT).map((x,i) => ({url:imageUrl(typeof x === 'string' ? x : x?.url || x?.image_url || x?.src),label:String(x?.label || (i+1)+'枚目').slice(0,100)})).filter(x => x.url);
}
async function project(d,row,account) {
  const saved = manifest(row), images = row.payload.threads_images_v1 ? saved.images : legacy(row), assets = [];
  for (const image of images) {
    if (image.assetKey) {
      const record = await asset(d,image.assetKey,row,account);
      assets.push({...image,dataUrl:record.payload.data_url,size:record.payload.size,mime:record.payload.mime_type});
    } else if (imageUrl(image.url)) assets.push({...image,url:imageUrl(image.url)});
    else fail('threads_image_not_found',404);
  }
  return {ok:true,id:row.id,accountKey:account,manifest:{...visible(saved),images},assets};
}
function failure(req,d,error) { return d.json(req,{ok:false,error:error.status ? error.message : 'threads_images_save_failed'},error.status || 500); }
export async function threadsImagesGet(req,d) {
  const u = new URL(req.url); if (u.searchParams.get('resource') !== 'threads-images') return null;
  try {
    const row = await readEvent(d,u.searchParams.get('id')), account = threadsAccount(row);
    if (u.searchParams.get('accountKey') !== account) fail('threads_account_mismatch',409);
    return d.json(req,await project(d,row,account));
  } catch (error) { return failure(req,d,error); }
}
export async function threadsImagesPatch(req,body,d) {
  if (body?.action !== 'threads_images_save') return null;
  try {
    if (!object(body) || Object.keys(body).some(k => !['action','id','accountKey','expectedRevision','mutationId','images'].includes(k)) || !Array.isArray(body.images) || body.images.length > LIMIT) fail('threads_images_invalid_request');
    if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) fail('threads_expected_revision_required',428);
    if (typeof body.mutationId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(body.mutationId)) fail('threads_mutation_id_required');
    const row = await readEvent(d,body.id), account = threadsAccount(row);
    if (body.accountKey !== account) fail('threads_account_mismatch',409);
    const previous = manifest(row), fingerprint = await d.sha256(stable({images:body.images,revision:body.expectedRevision}));
    const receipt = value => (value.receipts || []).find(r => r.id === body.mutationId);
    const old = receipt(previous);
    if (old) { if (old.fingerprint !== fingerprint) fail('threads_mutation_id_conflict',409); return d.json(req,await project(d,row,account)); }
    if (previous.revision !== body.expectedRevision) fail('threads_content_changed_reload',409);
    let total = 0; const inputs = [];
    // Validate the complete batch before creating any asset record.
    for (const input of body.images) {
      if (!object(input) || Object.keys(input).some(k => !['assetKey','url','dataUrl','label','name'].includes(k)) || ['assetKey','url','dataUrl'].filter(k => typeof input[k] === 'string' && input[k]).length !== 1) fail('threads_invalid_image');
      if ((input.label != null && typeof input.label !== 'string') || (input.name != null && typeof input.name !== 'string')) fail('threads_invalid_image');
      const label = String(input.label || input.name || '投稿画像').slice(0,100), name = String(input.name || '').replace(/[^\p{L}\p{N}._ -]/gu,'_').slice(0,150);
      if (input.dataUrl) { const parsed = imageBytes(input.dataUrl); total += parsed.size; inputs.push({label,name,...parsed,assetKey:'threads:' + row.id + ':' + await d.sha256(parsed.dataUrl)}); }
      else if (input.assetKey) { const saved = await asset(d,input.assetKey,row,account); total += saved.payload.size || 0; inputs.push({assetKey:input.assetKey,label,name}); }
      else { const url = imageUrl(input.url); if (!url) fail('threads_invalid_image_url'); inputs.push({url,label,name}); }
    }
    if (total > TOTAL_LIMIT) fail('threads_images_total_too_large');
    if (new Set(inputs.map(x => x.assetKey || x.url)).size !== inputs.length) fail('threads_duplicate_images');
    const images = [];
    for (const input of inputs) {
      const {dataUrl,mime,size,...entry} = input; images.push(entry);
      if (!dataUrl) continue;
      const payload = {result_kind:'threads_post_image',owner_event_id:row.id,account_key:account,data_url:dataUrl,mime_type:mime,size};
      const {error} = await d.admin.from(TABLE).upsert({task_id:ASSET_TASK,event_key:input.assetKey,domain:'sns',priority:'A',score:80,title:row.title + '｜投稿画像',summary:'Threads下書きの添付画像',payload},{onConflict:'task_id,event_key',ignoreDuplicates:true});
      if (error) throw error;
      const stored = await asset(d,input.assetKey,row,account); if (stored.payload.data_url !== dataUrl) fail('threads_image_conflict',409);
    }
    const next = {contract:IMAGE_CONTRACT,revision:previous.revision+1,images,updated_at:d.now ? d.now() : new Date().toISOString(),
      history:[...(previous.history || []),...(previous.revision ? [visible(previous)] : [])].slice(-20),
      receipts:[...(previous.receipts || []),{id:body.mutationId,fingerprint}].slice(-20)};
    let saved = await d.saveThreadsPayload(row,{...row.payload,threads_images_v1:next});
    if (!saved) {
      saved = await readEvent(d,row.id);
      if (receipt(manifest(saved))?.fingerprint !== fingerprint) fail('threads_content_changed_reload',409);
    }
    return d.json(req,await project(d,saved,account));
  } catch (error) { return failure(req,d,error); }
}
