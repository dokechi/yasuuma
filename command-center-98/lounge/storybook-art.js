/**
 * Original paper-theatre scenery for the command centre.
 * Art direction: broad saturated paper fields, sparse ink, no borrowed artwork.
 * All props stand on bottom-origin paper hinges. The enclosing HTML pages own
 * the broad floor colors; this module never draws a wallpaper or page slab.
 * Five original chapter constructions retain their own character identity.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';
const C = Object.freeze({
  ink: '#173A35', paper: '#F7F8F2', lime: '#AAF618', gold: '#FEB60A',
  coral: '#F15F50', orange: '#EE8B54', yellow: '#F5CF5D', jade: '#17B982',
  mint: '#63D9A5', forest: '#02672F', green: '#106762', sky: '#6DBDDD',
  cyan: '#0AA9E4', blue: '#70A8EC', royal: '#4D70E3', pink: '#F4A7CB',
  lilac: '#DFA4E1',
});

export const STORYBOOK_ART_ROOMS = Object.freeze(['insurance', 'otoku', 'rakuten', 'lottery', 'sourcing']);
export const STORYBOOK_ART_PALETTE = C;

// These shapes are newly authored, not traced from any reference-site asset.
const insurance = [
  {
    name: 'room-fold', x: 8, y: 21, w: 91, h: 63, tilt: 0, depth: 0,
    box: '0 0 910 472',
    art: `<path d="M8 463V218C24 104 153 20 282 9C400-2 449 102 548 96C646 89 708 98 795 117C870 132 901 201 901 274V463Z" fill="${C.lime}" stroke="${C.ink}" stroke-width="2"/>
      <path d="M8 463H901L888 472H20Z" fill="${C.gold}"/>
      <path d="M52 455L74 455L81 472H47Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.4"/>
      <path d="M842 455L864 455L871 472H837Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="1.4"/>`,
  },
  {
    name: 'window', x: 62, y: 1, w: 33, h: 51, tilt: 0, depth: 1,
    box: '0 0 330 382',
    art: `<path d="M7 375V164C7 76 77 7 165 7S323 76 323 164V375Z" fill="${C.royal}" stroke="${C.ink}" stroke-width="2.5"/>
      <path d="M31 171C31 99 82 44 151 34V177H31Z" fill="${C.sky}" stroke="${C.ink}" stroke-width="1.5"/>
      <path d="M177 34C247 42 299 98 299 171V177H177Z" fill="${C.sky}" stroke="${C.ink}" stroke-width="1.5"/>
      <path d="M31 198H151V351H31Z" fill="${C.sky}" stroke="${C.ink}" stroke-width="1.5"/>
      <path d="M177 198H299V351H177Z" fill="${C.sky}" stroke="${C.ink}" stroke-width="1.5"/>
      <path d="M222 177C220 157 234 144 250 147C252 124 285 119 299 143V177Z" fill="${C.paper}"/>
      <path d="M31 266C45 249 64 253 70 266C87 261 108 276 106 295H31Z" fill="${C.paper}"/>
      <path d="M18 375H312L303 382H27Z" fill="${C.blue}"/>`,
  },
  {
    name: 'bookshelf', x: 10, y: 45, w: 28, h: 43, tilt: 0, depth: 2,
    box: '0 0 280 323',
    art: `<path d="M9 314V209H67V110H128V8H273V314Z" fill="${C.green}" stroke="${C.ink}" stroke-width="2"/>
      <path d="M145 24H255V98H145Z M84 127H255V195H84Z M26 226H255V297H26Z" fill="${C.gold}"/>
      <path d="M149 37H171V94H149Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="1.2"/>
      <path d="M174 43H199V94H174Z" fill="${C.pink}" stroke="${C.ink}" stroke-width="1.2"/>
      <path d="M206 45L227 40L241 90L220 96Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="1.2"/>
      <path d="M91 140H116V191H91Z M121 132H145V191H121Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.2"/>
      <path d="M159 142L187 134L205 184L176 191Z" fill="${C.mint}" stroke="${C.ink}" stroke-width="1.2"/>
      <path d="M211 143H248V191H211Z" fill="${C.lilac}" stroke="${C.ink}" stroke-width="1.2"/>
      <path d="M38 276H129V294H38Z" fill="${C.pink}" stroke="${C.ink}" stroke-width="1.2"/>
      <path d="M43 258H122V276H43Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="1.2"/>
      <path d="M148 240H181V294H148Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="1.2"/>
      <path d="M191 237L220 230L238 287L208 295Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="1.2"/>
      <path d="M9 314H273L265 323H17Z" fill="${C.forest}"/>`,
  },
  {
    name: 'plant', x: 29, y: 20, w: 29, h: 66, tilt: 0, depth: 3,
    box: '0 0 290 495',
    art: `<path d="M121 465C130 378 146 277 151 175C155 114 162 73 171 29" fill="none" stroke="${C.ink}" stroke-width="8" stroke-linecap="round"/>
      <path d="M145 261C118 217 84 183 49 152M151 189C187 153 217 119 244 85M132 356C178 315 215 293 261 283" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>
      <path d="M166 118C135 106 129 52 142 8C193 24 212 79 166 118Z" fill="${C.jade}" stroke="${C.ink}" stroke-width="1.5"/>
      <path d="M145 217C87 218 65 166 73 116C128 120 161 170 145 217Z" fill="${C.jade}" stroke="${C.ink}" stroke-width="1.5"/>
      <path d="M170 176C155 131 194 93 248 84C252 130 215 176 170 176Z" fill="${C.forest}" stroke="${C.ink}" stroke-width="1.5"/>
      <path d="M124 311C75 309 43 273 36 228C88 222 132 262 124 311Z" fill="${C.forest}" stroke="${C.ink}" stroke-width="1.5"/>
      <path d="M149 300C143 250 181 220 232 218C231 263 202 300 149 300Z" fill="${C.jade}" stroke="${C.ink}" stroke-width="1.5"/>
      <path d="M162 355C177 304 217 286 276 288C257 337 213 367 162 355Z" fill="${C.mint}" stroke="${C.ink}" stroke-width="1.5"/>
      <path d="M120 389C72 384 47 343 51 306C97 308 131 345 120 389Z" fill="${C.jade}" stroke="${C.ink}" stroke-width="1.5"/>
      <path d="M90 423H155L168 488H78Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>
      <path d="M78 488H168L159 495H87Z" fill="${C.sky}"/>`,
  },
  {
    name: 'dispatch-papers', x: 7, y: 82, w: 27, h: 14, tilt: -2, depth: 4,
    box: '0 0 270 105',
    art: `<path d="M4 77L220 77L262 94L42 94Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="1.6"/>
      <path d="M42 94H262V102H42Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.3"/>
      <path d="M20 44L206 44L247 66L61 66Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="1.6"/>
      <path d="M61 66H247V77H61Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.3"/>
      <path d="M44 20L201 20L228 40L71 40Z" fill="${C.pink}" stroke="${C.ink}" stroke-width="1.6"/>
      <path d="M71 40H228V44H71Z" fill="${C.paper}"/>
      <path d="M130 9L200 3L221 19L153 26Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.2"/>
      <path d="M130 9L177 17L200 3" fill="none" stroke="${C.ink}" stroke-width="1.2"/>`,
  },
];

function scenery(name, box, spread, page, art, depth = 1, tilt = 0) {
  return { name, box, spread, page, art, depth, tilt, paperContact: true };
}

// No chapter is a recoloured version of another room. These are independent
// original fold constructions: greenhouse, wrapping table, chart editor, ledger.
const extraInsurance = scenery('letter-rack', '0 0 340 180', [3, 11, 35, 30], [2, 15, 32, 28],
  `<path d="M15 153L42 24H298L325 153Z" fill="${C.cyan}" stroke="${C.ink}" stroke-width="2"/>
   <path d="M42 24L63 11H315L298 24Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.5"/>
   <path d="M54 48H139V112H54Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.4"/>
   <path d="M54 48L97 79L139 48" fill="none" stroke="${C.ink}" stroke-width="1.3"/>
   <path d="M153 45H274V123H153Z" fill="${C.pink}" stroke="${C.ink}" stroke-width="1.4"/>
   <path d="M153 45L214 88L274 45" fill="none" stroke="${C.ink}" stroke-width="1.3"/>
   <path d="M28 116H311V156H28Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="1.6"/>`, 2, -2);

const roomScenery = {
  otoku: [
    scenery('greenhouse-fold', '0 0 350 440', [3, 8, 39, 79], [0, 2, 43, 72],
      `<path d="M16 416V117L175 14L334 117V416Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>
       <path d="M30 119L166 31V119Z M184 31L320 119H184Z" fill="${C.gold}"/>
       <path d="M31 139H160V256H31Z M185 139H319V256H185Z" fill="${C.sky}"/>
       <path d="M31 273H160V401H31Z M185 273H319V401H185Z" fill="${C.mint}"/>
       <path d="M175 21V415M20 128H330M20 265H330" fill="none" stroke="${C.green}" stroke-width="12"/>
       <path d="M45 383C52 335 78 310 111 301C116 342 97 378 45 383Z M222 386C222 336 250 311 291 306C293 350 266 382 222 386Z" fill="${C.forest}"/>
       <path d="M15 416H335V423H15Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="1.5"/>`),
    scenery('catalogue-wing', '0 0 400 230', [2, 58, 42, 35], [1, 56, 37, 30],
      `<path d="M18 192L48 40L197 68L349 25L382 187L198 218Z" fill="${C.royal}" stroke="${C.ink}" stroke-width="2"/>
       <path d="M47 49L193 77V204L30 181Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.5"/>
       <path d="M204 77L340 36L369 178L204 204Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.5"/>
       <path d="M67 82L119 91L113 132L58 124Z" fill="${C.coral}"/>
       <path d="M132 94L174 101V139L127 133Z" fill="${C.gold}"/>
       <path d="M223 93L316 65L329 118L223 145Z" fill="${C.jade}"/>
       <path d="M56 149L173 168M221 165L338 137" fill="none" stroke="${C.ink}" stroke-width="3"/>
       <path d="M197 75V212" fill="none" stroke="${C.ink}" stroke-width="2"/>`, 3, -3),
    scenery('leaf-ladder', '0 0 230 360', [31, 27, 23, 61], [23, 17, 29, 68],
      `<path d="M84 337L103 31M151 337L141 31M98 93H144M94 173H146M89 253H149" fill="none" stroke="${C.gold}" stroke-width="12"/>
       <path d="M117 322C123 251 121 184 132 88" fill="none" stroke="${C.ink}" stroke-width="5"/>
       <path d="M127 153C83 148 53 115 58 74C108 73 136 105 127 153Z M132 122C127 77 154 40 202 36C202 82 176 114 132 122Z M118 246C73 246 41 214 42 176C90 169 124 200 118 246Z M125 227C132 181 164 164 214 176C202 216 169 237 125 227Z" fill="${C.jade}" stroke="${C.ink}" stroke-width="1.6"/>
       <path d="M85 310H157L173 340H71Z" fill="${C.pink}" stroke="${C.ink}" stroke-width="2"/>`, 2),
    scenery('offer-fan', '0 0 310 125', [12, 83, 30, 15], [1, 84, 31, 12],
      `<path d="M21 104L39 27L121 40L103 113Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="1.6"/>
       <path d="M104 111L116 12L207 25L198 113Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="1.6"/>
       <path d="M195 113L213 32L294 43L281 113Z" fill="${C.lilac}" stroke="${C.ink}" stroke-width="1.6"/>
       <path d="M52 53L89 59M132 43L176 50M226 62L263 68" stroke="${C.paper}" stroke-width="9"/>`, 4),
  ],
  rakuten: [
    scenery('pantry-screen', '0 0 380 400', [2, 12, 39, 74], [0, 3, 41, 73],
      `<path d="M20 373V46L190 20L358 55V373Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>
       <path d="M190 20V373L358 373V55Z" fill="${C.gold}"/>
       <path d="M33 127H348M33 239H348M33 351H348" stroke="${C.green}" stroke-width="13"/>
       <path d="M58 113V64H103V113Z M119 113V56H156V113Z" fill="${C.mint}" stroke="${C.ink}" stroke-width="1.5"/>
       <circle cx="240" cy="92" r="28" fill="${C.coral}" stroke="${C.ink}" stroke-width="1.5"/>
       <circle cx="296" cy="98" r="22" fill="${C.orange}" stroke="${C.ink}" stroke-width="1.5"/>
       <path d="M230 65L246 49L255 62 M285 75L300 61L305 76" fill="${C.forest}"/>
       <path d="M60 225L74 158H145L158 225Z" fill="${C.royal}" stroke="${C.ink}" stroke-width="1.5"/>
       <path d="M211 216C211 157 308 157 308 216Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>
       <path d="M60 336H153V273H60Z" fill="${C.jade}" stroke="${C.ink}" stroke-width="1.5"/>
       <path d="M219 336L235 266H287L309 336Z" fill="${C.pink}" stroke="${C.ink}" stroke-width="1.5"/>
       <path d="M20 373H358V384H20Z" fill="${C.cyan}" stroke="${C.ink}" stroke-width="1.6"/>`),
    scenery('wrapping-rolls', '0 0 260 340', [30, 24, 25, 64], [19, 20, 31, 61],
      `<path d="M25 312L43 69L104 74L96 312Z" fill="${C.lilac}" stroke="${C.ink}" stroke-width="2"/>
       <ellipse cx="73" cy="71" rx="31" ry="11" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.5"/>
       <path d="M101 312L114 20L174 25L166 312Z" fill="${C.cyan}" stroke="${C.ink}" stroke-width="2"/>
       <ellipse cx="144" cy="23" rx="30" ry="10" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.5"/>
       <path d="M163 312L187 100L245 112L232 312Z" fill="${C.jade}" stroke="${C.ink}" stroke-width="2"/>
       <ellipse cx="216" cy="106" rx="30" ry="10" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.5"/>
       <path d="M15 269H242V320H15Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`, 2),
    scenery('parcel-stack', '0 0 370 210', [4, 65, 39, 30], [0, 64, 38, 28],
      `<path d="M13 131L160 107L327 139L181 169Z" fill="${C.sky}" stroke="${C.ink}" stroke-width="1.8"/>
       <path d="M13 131V186L181 202V169Z" fill="${C.royal}" stroke="${C.ink}" stroke-width="1.8"/>
       <path d="M181 169L327 139V190L181 202Z" fill="${C.cyan}" stroke="${C.ink}" stroke-width="1.8"/>
       <path d="M92 49L225 26L349 56L217 84Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.8"/>
       <path d="M92 49V126L217 153V84Z" fill="${C.lime}" stroke="${C.ink}" stroke-width="1.8"/>
       <path d="M217 84L349 56V128L217 153Z" fill="${C.jade}" stroke="${C.ink}" stroke-width="1.8"/>
       <path d="M155 38L281 70L281 140M151 62L151 139" fill="none" stroke="${C.coral}" stroke-width="12"/>`, 3, -2),
    scenery('ribbon-bridge', '0 0 370 170', [7, 7, 34, 30], [2, 7, 38, 28],
      `<path d="M22 147C57 20 126 7 183 75C219 123 284 109 348 33L359 57C289 151 211 157 163 96C117 43 75 45 47 151Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>
       <path d="M184 78L163 97L171 115L196 104Z" fill="${C.coral}"/>
       <path d="M21 146L49 148L63 164H10Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.5"/>`, 2),
  ],
  lottery: [
    scenery('chart-wheel', '0 0 390 430', [3, 7, 40, 81], [0, 2, 43, 74],
      `<circle cx="194" cy="178" r="161" fill="${C.paper}" stroke="${C.ink}" stroke-width="2.5"/>
       <circle cx="194" cy="178" r="136" fill="${C.sky}" stroke="${C.royal}" stroke-width="10"/>
       <path d="M194 52V304M68 178H320M104 88L284 268M104 268L284 88" stroke="${C.paper}" stroke-width="3"/>
       <path d="M194 73L214 155L298 178L214 199L194 283L173 199L89 178L173 155Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="1.5"/>
       <circle cx="194" cy="178" r="14" fill="${C.coral}" stroke="${C.ink}" stroke-width="1.5"/>
       <path d="M163 334H224L249 405H139Z" fill="${C.jade}" stroke="${C.ink}" stroke-width="2"/>
       <path d="M103 405H285V416H103Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.5"/>`),
    scenery('folded-atlas', '0 0 420 230', [1, 60, 45, 35], [0, 61, 39, 31],
      `<path d="M12 80L114 35L217 75L318 30L407 69V188L307 216L211 182L110 218L12 190Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>
       <path d="M114 35L217 75V182L110 218Z" fill="${C.mint}"/>
       <path d="M318 30L407 69V188L307 216Z" fill="${C.sky}"/>
       <path d="M114 39L110 214M217 77L211 179M318 33L307 212" stroke="${C.ink}" stroke-width="1.4"/>
       <path d="M36 147L80 111L151 141L235 121L281 166L364 111" fill="none" stroke="${C.royal}" stroke-width="5" stroke-linejoin="round"/>
       <circle cx="36" cy="147" r="9" fill="${C.coral}"/><circle cx="235" cy="121" r="10" fill="${C.gold}"/><circle cx="364" cy="111" r="10" fill="${C.coral}"/>`, 3, -2),
    scenery('observatory-flap', '0 0 310 390', [69, 2, 29, 72], [64, 0, 34, 59],
      `<path d="M21 366V78L155 14L289 78V366Z" fill="${C.royal}" stroke="${C.ink}" stroke-width="2"/>
       <path d="M155 14V366H289V78Z" fill="${C.blue}"/>
       <path d="M82 72L90 97L116 104L90 113L82 138L73 113L48 104L73 97Z M211 152L221 180L250 190L221 200L211 227L201 200L173 190L201 180Z M104 244L112 269L139 279L112 288L104 314L95 288L69 279L95 269Z" fill="${C.gold}"/>
       <circle cx="225" cy="91" r="9" fill="${C.paper}"/><circle cx="57" cy="197" r="6" fill="${C.paper}"/><circle cx="236" cy="305" r="8" fill="${C.paper}"/>
       <path d="M21 366H289V375H21Z" fill="${C.pink}" stroke="${C.ink}" stroke-width="1.4"/>`, 0),
    scenery('paper-comet', '0 0 250 300', [32, 23, 24, 62], [23, 18, 28, 61],
      `<path d="M48 277C54 170 94 150 172 94L187 111C121 165 84 184 79 279Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="2"/>
       <path d="M177 14L189 54L231 68L189 80L177 122L163 80L122 68L163 54Z" fill="${C.lime}" stroke="${C.ink}" stroke-width="1.8"/>
       <path d="M38 278H89L100 291H28Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.5"/>`, 2),
  ],
  sourcing: [
    scenery('inventory-bay', '0 0 390 420', [2, 9, 40, 79], [0, 3, 41, 72],
      `<path d="M17 394V83L195 20L373 83V394Z" fill="${C.green}" stroke="${C.ink}" stroke-width="2"/>
       <path d="M35 94L193 39L354 94Z" fill="${C.lime}" stroke="${C.ink}" stroke-width="1.5"/>
       <path d="M40 118H175V237H40Z M211 118H348V237H211Z M40 263H175V375H40Z M211 263H348V375H211Z" fill="${C.paper}"/>
       <path d="M51 165H164V227H51Z M225 139H335V227H225Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="1.4"/>
       <path d="M67 282H149V366H67Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="1.4"/>
       <path d="M225 304H334V366H225Z" fill="${C.sky}" stroke="${C.ink}" stroke-width="1.4"/>
       <path d="M105 165V225M280 139V227M108 282V366M280 304V366" stroke="${C.paper}" stroke-width="10"/>
       <path d="M17 394H373V404H17Z" fill="${C.cyan}" stroke="${C.ink}" stroke-width="1.5"/>`),
    scenery('ledger-bridge', '0 0 390 260', [1, 56, 43, 39], [0, 56, 40, 35],
      `<path d="M20 206L104 124L190 153L277 77L368 107V221L277 242L185 211L98 244Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>
       <path d="M104 124L190 153L185 211L98 244Z" fill="${C.mint}"/>
       <path d="M277 77L368 107V221L277 242Z" fill="${C.blue}"/>
       <path d="M55 173L93 141M120 161L164 174M218 149L267 107M301 117L345 132" stroke="${C.green}" stroke-width="7"/>
       <path d="M51 195L88 165M120 188L162 198M214 175L264 137M299 145L345 161" stroke="${C.green}" stroke-width="4"/>
       <path d="M49 82H113V125H49Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="1.6"/>
       <path d="M239 30H304V83H239Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="1.6"/>`, 3, -2),
    scenery('index-signals', '0 0 250 390', [32, 12, 23, 77], [21, 9, 28, 72],
      `<path d="M51 364V83M123 364V28M197 364V126" stroke="${C.ink}" stroke-width="7"/>
       <path d="M18 54H88V163L52 138L18 163Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="1.6"/>
       <path d="M89 14H159V122L123 97L89 122Z" fill="${C.royal}" stroke="${C.ink}" stroke-width="1.6"/>
       <path d="M163 106H232V213L197 188L163 213Z" fill="${C.lime}" stroke="${C.ink}" stroke-width="1.6"/>
       <path d="M21 364H225V376H21Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.5"/>`, 2),
    scenery('parcel-tray', '0 0 310 170', [7, 77, 33, 20], [0, 79, 34, 17],
      `<path d="M15 125L127 107L291 128L175 153Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="1.7"/>
       <path d="M15 125V152L175 165V153Z M175 153L291 128V151L175 165Z" fill="${C.jade}" stroke="${C.ink}" stroke-width="1.7"/>
       <path d="M42 52L111 36L183 52L114 70Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.7"/>
       <path d="M42 52V118L114 133V70Z" fill="${C.pink}" stroke="${C.ink}" stroke-width="1.7"/>
       <path d="M114 70L183 52V116L114 133Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="1.7"/>
       <path d="M196 71H270V126H196Z" fill="${C.sky}" stroke="${C.ink}" stroke-width="1.7"/>`, 4),
  ],
};

// Positions are percentages of the stage, NOT non-uniform mesh scaling.
// Each SVG/image contains to its box; no circular window or body is stretched.
// The full-canvas foreground has intentional alpha space at left. These presets
// place its visible silhouette, rather than treating that alpha as a portrait.
const ART_LAYOUTS = Object.freeze({
  legacy: {
    aspect: 4 / 3,
    positions: {
      'room-fold': [8, 21, 91, 63], window: [62, 1, 33, 51],
      bookshelf: [10, 45, 28, 43], plant: [29, 20, 29, 66],
      'dispatch-papers': [7, 82, 27, 14],
      'adviser-and-desk': [0, 10.8, 100, 88.8889],
    },
  },
  spread: {
    aspect: 2,
    positions: {
      window: [67, 2, 29, 66], bookshelf: [3, 34, 40, 58],
      plant: [33, 12, 24, 76], 'dispatch-papers': [7, 83, 32, 15],
      'adviser-and-desk': [7, 0, 100, 96],
    },
  },
  page: {
    aspect: 1 / 1.05,
    positions: {
      window: [60, 0, 35, 50], bookshelf: [0, 42, 35, 43],
      plant: [17, 18, 33, 65], 'dispatch-papers': [1, 85, 31, 10],
      'adviser-and-desk': [-40, 1, 140, 97],
    },
  },
});

export const STORYBOOK_ACTOR_BOUNDS = Object.freeze({
  insurance: Object.freeze([611, 49, 1529, 1001]),
  otoku: Object.freeze([498, 10, 1523, 1024]),
  rakuten: Object.freeze([458, 23, 1528, 1012]),
  lottery: Object.freeze([408, 19, 1514, 1024]),
  sourcing: Object.freeze([229, 10, 1523, 1001]),
});

const ACTOR_PAGE_POSITIONS = Object.freeze({
  insurance: [-40, 1, 140, 97], otoku: [-40, 1, 140, 97],
  rakuten: [-40, 1, 140, 97], lottery: [-36, 1, 136, 97],
  sourcing: [-17, 1, 116, 97],
});

// Small hard-edged contact marks, not atmospheric halos. Coordinates belong to
// the original foreground canvas and move with the exact same contain mapping.
const ACTOR_CONTACTS = Object.freeze({
  insurance: [[624, 818, 24, 6], [792, 875, 22, 6], [939, 826, 23, 6], [1128, 832, 19, 5], [1348, 890, 21, 6], [1449, 858, 19, 5], [1244, 908, 67, 8], [1180, 991, 76, 8]],
  otoku: [[528, 946, 32, 7], [1488, 946, 32, 7], [1258, 1014, 53, 7]],
  rakuten: [[520, 944, 31, 7], [735, 1008, 38, 7], [1462, 955, 35, 7]],
  lottery: [[476, 984, 43, 7], [1455, 965, 35, 7], [1339, 1015, 49, 6]],
  sourcing: [[810, 996, 41, 7], [1413, 870, 31, 6]],
});

function positioned(definition, positions) {
  const [x, y, w, h] = positions[definition.name];
  return { ...definition, x, y, w, h };
}

function paperContact(definition) {
  if (!definition.paperContact) return { before: '', after: '' };
  const [, , width, height] = definition.box.split(/\s+/).map(Number);
  const foot = Math.max(13, Math.min(28, width * .07));
  const footY = height - Math.max(12, height * .035);
  const feet = [width * .22, width * .79].map(x =>
    `<path d="M${x - foot / 2} ${footY}h${foot}l${foot * .3} ${height - footY - 1}h-${foot * 1.6}Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.2"/>
     <path d="M${x - foot / 2} ${footY}l${foot * .15} ${height - footY - 1}" fill="none" stroke="${C.ink}" stroke-width=".8"/>`).join('');
  return {
    before: `<ellipse cx="${width * .51}" cy="${height - 6}" rx="${width * .43}" ry="${Math.max(3, height * .012)}" fill="${C.ink}" opacity=".10"/>`,
    after: feet,
  };
}

function makeProp(document, definition) {
  const prop = document.createElement('span');
  prop.className = 'story-prop';
  prop.dataset.prop = definition.name;
  for (const [property, value] of Object.entries({
    '--x': `${definition.x}%`, '--y': `${definition.y}%`,
    '--w': `${definition.w}%`, '--h': `${definition.h}%`,
    '--tilt': `${definition.tilt}deg`, '--depth': definition.depth,
  })) prop.style.setProperty(property, String(value));
  Object.assign(prop.style, {
    position: 'absolute', left: 'var(--x)', top: 'var(--y)',
    width: 'var(--w)', height: 'var(--h)',
    transformOrigin: 'center bottom', transform: 'rotate(var(--tilt))',
    pointerEvents: 'none', zIndex: String(definition.depth),
  });
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', definition.box);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.display = 'block';
  // Trusted original constant SVG only; never concatenate user or content data.
  const contact = paperContact(definition);
  svg.innerHTML = contact.before + definition.art + contact.after;
  prop.append(svg);
  return prop;
}

/** Returns null for unknown chapters, never another room's identity. */
export function buildStorybookArt({ document, key, actorURL, layout = 'legacy' } = {}) {
  if (!document?.createElement || !document?.createElementNS) {
    throw new TypeError('buildStorybookArt needs the owner document');
  }
  if (!STORYBOOK_ART_ROOMS.includes(key)) return null;
  const preset = ART_LAYOUTS[layout];
  if (!preset) throw new RangeError(`Unknown storybook art layout: ${layout}`);
  const root = document.createElement('div');
  root.className = 'story-paper-art';
  root.dataset.storyRoom = key;
  root.dataset.storyLayout = layout;
  root.dataset.storyAspect = String(preset.aspect);
  const actorPosition = layout === 'page'
    ? ACTOR_PAGE_POSITIONS[key]
    : preset.positions['adviser-and-desk'];
  ['X', 'Y', 'W', 'H'].forEach((axis, i) => {
    root.dataset[`storyActor${axis}`] = String(actorPosition[i]);
  });
  root.setAttribute('aria-hidden', 'true');
  Object.assign(root.style, {
    position: 'relative', width: '100%', aspectRatio: String(preset.aspect),
    isolation: 'isolate', pointerEvents: 'none',
  });
  // The vivid two-page HTML surface replaces the small lime backdrop panel.
  if (key === 'insurance') {
    for (const prop of insurance) {
      if (layout === 'legacy' || prop.name !== 'room-fold') {
        root.append(makeProp(document, {
          ...positioned(prop, preset.positions), paperContact: layout !== 'legacy',
        }));
      }
    }
    if (layout !== 'legacy') {
      const [x, y, w, h] = layout === 'spread' ? extraInsurance.spread : extraInsurance.page;
      root.append(makeProp(document, { ...extraInsurance, x, y, w, h }));
    }
  } else {
    for (const prop of roomScenery[key]) {
      const [x, y, w, h] = layout === 'spread' ? prop.spread : prop.page;
      root.append(makeProp(document, { ...prop, x, y, w, h }));
    }
  }
  if (actorURL) {
    const [x, y, w, h] = actorPosition;
    const actor = makeProp(document, {
      name: 'adviser-and-desk',
      tilt: 0, depth: 5, box: '0 0 1536 1024', art: '',
      x, y, w, h,
    });
    actor.replaceChildren();
    const shadow = document.createElementNS(SVG_NS, 'svg');
    shadow.setAttribute('viewBox', '0 0 1536 1024');
    shadow.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    shadow.setAttribute('aria-hidden', 'true');
    shadow.setAttribute('focusable', 'false');
    shadow.classList.add('story-actor-contact');
    Object.assign(shadow.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
    shadow.innerHTML = ACTOR_CONTACTS[key].map(([cx, cy, rx, ry]) =>
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.ink}" opacity=".12"/>`).join('');
    actor.append(shadow);
    const img = document.createElement('img');
    img.className = 'story-actor-image';
    img.src = actorURL;
    img.alt = '';
    img.width = 1536;
    img.height = 1024;
    img.draggable = false;
    img.decoding = 'async';
    img.dataset.storyActor = key;
    img.addEventListener('error', () => {
      img.hidden = true;
      actor.hidden = true;
      root.dataset.artState = 'fallback';
    }, { once: true });
    Object.assign(img.style, {
      display: 'block', width: '100%', height: '100%', objectFit: 'contain',
      userSelect: 'none', pointerEvents: 'none',
    });
    actor.append(img);
    root.append(actor);
  }
  return root;
}
