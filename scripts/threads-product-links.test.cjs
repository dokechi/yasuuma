const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const H=require('../command-center-98/manual-operation-hub.js');
test('product destinations use only saved typed evidence and stay separate from affiliate URLs',()=>{
 const p={ordinary_url:'https://store.shopping.yahoo.co.jp/fixture/item.html',purchase_url:'https://official.example/item',affiliate_url:'https://affiliate.example/tracking',sources:[{type:'official_product',url:'https://official.example/item'},{type:'successful_structure_reference',url:'https://reference.example/post'}]},before=JSON.stringify(p);
 assert.deepEqual(H.savedProductLinks(p).map(r=>r.url),[p.ordinary_url,p.purchase_url,p.affiliate_url]);assert.equal(JSON.stringify(p),before);
 assert.deepEqual(H.savedProductLinks({purchase_url:p.purchase_url}).map(r=>r.url),['','','']);
 for(const bad of ['javascript:alert(1)','http://official.example/item','https://u:p@official.example/item'])assert.ok(H.savedProductLinks({ordinary_url:bad,affiliate_url:bad,sources:[{type:'official_product',url:bad}]}).every(r=>!r.url));
 assert.equal(H.savedProductLinks({ordinary_url:'https://store.shopping.yahoo.co.jp.evil/fixture/item.html'})[0].url,'');
 assert.equal(H.savedProductLinks({ordinary_url:p.ordinary_url,affiliate_url:p.ordinary_url})[0].url,'');
});
test('new link metadata survives reading normalization, export and copy history without changing manuscripts',()=>{
 const ctx=vm.createContext({URL,Intl});vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../command-center-98/castle/notebook.js'),'utf8').replaceAll('export ',''),ctx);
 const map=new Map(),storage={get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const book=vm.runInContext('createNotebook',ctx)({seeds:{kyun:[]},storage});
 const links=H.savedProductLinks({sources:[{type:'official_product',url:'https://official.example/item'}]});const draft=book.save({place:'kyun',title:'Fixture',body:'Unchanged manuscript',productLinks:links}).draft;
 assert.equal(draft.productLinks[1].url,links[1].url);book.copied(draft,'official-link',links[1].url);assert.equal(book.copies()[0].text,links[1].url);assert.equal(book.get(draft.id).body,'Unchanged manuscript');assert.equal(JSON.parse(book.export()).drafts[0].productLinks[1].url,links[1].url);
});
