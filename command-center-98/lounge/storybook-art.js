/**
 * Original paper-theatre scenery for the command centre.
 * Art direction: broad saturated paper fields, sparse ink, no borrowed artwork.
 * All props stand on bottom-origin paper hinges. The enclosing HTML pages own
 * the broad floor colors; this module never draws a wallpaper or page slab.
 * This first integration proof implements insurance ONLY; no silent room alias.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';
const C = Object.freeze({
  ink: '#173A35', paper: '#F7F8F2', lime: '#AAF618', gold: '#FEB60A',
  coral: '#F15F50', orange: '#EE8B54', yellow: '#F5CF5D', jade: '#17B982',
  mint: '#63D9A5', forest: '#02672F', green: '#106762', sky: '#6DBDDD',
  cyan: '#0AA9E4', blue: '#70A8EC', royal: '#4D70E3', pink: '#F4A7CB',
  lilac: '#DFA4E1',
});

export const STORYBOOK_ART_ROOMS = Object.freeze(['insurance']);
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

// Positions are percentages of the stage, NOT non-uniform mesh scaling.
// Each SVG/image contains to its box; no circular window or body is stretched.
// The full-canvas foreground has intentional alpha space at left. These presets
// place its visible silhouette, rather than treating that alpha as a portrait.
const INSURANCE_LAYOUTS = Object.freeze({
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
      window: [67, 2, 29, 66], bookshelf: [7, 43, 31, 47],
      plant: [30, 8, 26, 78], 'dispatch-papers': [11, 84, 25, 13],
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

function positioned(definition, positions) {
  const [x, y, w, h] = positions[definition.name];
  return { ...definition, x, y, w, h };
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
  svg.innerHTML = definition.art;
  prop.append(svg);
  return prop;
}

/** Returns null for chapters not yet authored, never another room's identity. */
export function buildStorybookArt({ document, key, actorURL, layout = 'legacy' } = {}) {
  if (!document?.createElement || !document?.createElementNS) {
    throw new TypeError('buildStorybookArt needs the owner document');
  }
  if (!STORYBOOK_ART_ROOMS.includes(key)) return null;
  const preset = INSURANCE_LAYOUTS[layout];
  if (!preset) throw new RangeError(`Unknown storybook art layout: ${layout}`);
  const root = document.createElement('div');
  root.className = 'story-paper-art';
  root.dataset.storyRoom = key;
  root.dataset.storyLayout = layout;
  root.dataset.storyAspect = String(preset.aspect);
  root.setAttribute('aria-hidden', 'true');
  Object.assign(root.style, {
    position: 'relative', width: '100%', aspectRatio: String(preset.aspect),
    isolation: 'isolate', pointerEvents: 'none',
  });
  // The vivid two-page HTML surface replaces the small lime backdrop panel.
  for (const prop of insurance) {
    if (layout === 'legacy' || prop.name !== 'room-fold') {
      root.append(makeProp(document, positioned(prop, preset.positions)));
    }
  }
  if (actorURL) {
    const actor = makeProp(document, positioned({
      name: 'adviser-and-desk', x: 0, y: 10.8, w: 100, h: 88.8889,
      tilt: 0, depth: 5, box: '0 0 1536 1024', art: '',
    }, preset.positions));
    actor.replaceChildren();
    const img = document.createElement('img');
    img.className = 'story-actor-image';
    img.src = actorURL;
    img.alt = '';
    img.width = 1536;
    img.height = 1024;
    img.draggable = false;
    img.decoding = 'async';
    Object.assign(img.style, {
      display: 'block', width: '100%', height: '100%', objectFit: 'contain',
      userSelect: 'none', pointerEvents: 'none',
    });
    actor.append(img);
    root.append(actor);
  }
  return root;
}
