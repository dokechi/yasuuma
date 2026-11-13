// Display labels are separate from saved account/place identities.
export const glassSlots = Object.freeze([
  {key:'insurance',label:'保険',sheet:'left',center:308},
  {key:'otoku',label:'お得',sheet:'left',center:574},
  {key:'rakuten',label:'楽天',sheet:'left',center:835},
  {key:'lottery',label:'抽選',sheet:'left',center:1094},
  {key:'tanaka',label:'固定費',sheet:'left',center:1358},
  {key:'kensho',label:'懸賞',sheet:'right',center:332},
  {key:'manga',label:'漫画',sheet:'right',center:606},
  {key:'sourcing',label:'仕入',sheet:'right',center:876},
  {key:'everyday',label:'日常の言葉',art:'assets/stained/everyday-words-v1.png'},
  {key:'skun',label:'Sくん',sheet:'right',center:1430,glassTint:'#aa607b',
   sprite:{sheet:'left',center:574,key:'otoku',filter:'hue-rotate(305deg) saturate(.78)'}},
  {key:'girls-channel',label:'ガルちゃん',sheet:'right',center:1154,glassTint:'#78699c',motif:'conversation',
   sprite:{sheet:'right',center:606,key:'manga',filter:'hue-rotate(44deg) saturate(.84)'}}
].map(Object.freeze));
export function glassFor(key){return glassSlots.find(slot=>slot.key===key);}
export function adjacentSlot(index,step){return Math.max(0,Math.min(glassSlots.length-1,index+step));}
