let serial=0;
// Glass, silver architecture, plinth and character are independent layers.
// All ten stations share one frame and one plinth from the user-supplied reference.
const silhouettes={
 insurance:{feet:757,path:'M-14 662 L10 662 L19 669 L22 689 L31 701 L30 721 L39 746 L29 751 L18 751 L17 757 L5 757 L0 750 L-4 758 L-19 758 L-21 751 L-32 752 L-33 737 L-28 710 L-20 699 L-20 677 Z'},
 otoku:{feet:758,path:'M-10 662 L9 663 L18 675 L17 694 L25 700 L27 713 L39 737 L34 748 L22 750 L20 758 L5 758 L1 751 L-5 758 L-20 758 L-23 748 L-31 748 L-34 726 L-32 710 L-22 704 L-19 688 L-19 673 Z'},
 rakuten:{feet:757,path:'M-13 662 L8 661 L15 666 L26 670 L25 683 L15 688 L20 700 L29 707 L31 725 L36 741 L25 747 L22 756 L5 757 L0 750 L-7 758 L-19 758 L-21 747 L-28 744 L-31 734 L-32 726 L-35 725 L-35 706 L-20 704 L-15 693 L-17 680 L-22 677 L-21 670 Z'},
 lottery:{feet:757,path:'M-12 665 L10 665 L19 673 L21 691 L18 699 L26 705 L27 723 L34 731 L32 745 L21 748 L19 757 L6 757 L0 749 L-6 758 L-17 758 L-19 744 L-26 739 L-26 715 L-36 712 L-40 696 L-25 692 L-21 696 L-20 680 Z'},
 tanaka:{feet:757,path:'M-10 663 L8 663 L20 675 L20 690 L27 698 L35 723 L37 741 L28 747 L18 748 L17 757 L3 758 L-2 751 L-6 758 L-18 758 L-20 748 L-29 742 L-29 722 L-33 716 L-37 698 L-20 701 L-16 691 L-20 678 Z'},
 kensho:{feet:750,path:'M-9 659 L10 660 L20 669 L20 678 L29 686 L29 692 L15 695 L19 704 L29 714 L32 731 L30 743 L20 746 L18 751 L4 751 L-1 747 L-9 752 L-20 751 L-21 744 L-27 741 L-27 725 L-31 721 L-29 706 L-19 701 L-17 689 L-22 686 L-25 678 L-17 673 Z'},
 manga:{feet:751,path:'M-11 661 L9 661 L19 669 L25 683 L24 699 L17 703 L26 712 L27 728 L33 742 L21 746 L18 752 L4 752 L-2 746 L-7 752 L-21 751 L-22 743 L-29 738 L-28 719 L-39 718 L-42 702 L-29 699 L-24 703 L-23 685 L-19 671 Z'},
 sourcing:{feet:750,path:'M-19 660 L6 659 L17 665 L23 677 L23 681 L15 686 L18 699 L30 700 L39 710 L40 733 L33 740 L21 741 L20 750 L7 751 L0 744 L-6 750 L-20 750 L-21 742 L-40 742 L-40 719 L-26 717 L-20 704 L-17 694 L-20 682 L-29 680 L-29 673 Z'}
};
export function createGlassArt(slot,assetBase=""){
 const wrapper=document.createElement('span');wrapper.className='sg-art';wrapper.setAttribute('aria-hidden','true');
 const id='sg-layer-'+(++serial),ref='assets/stained/journey-reference.webp';
 const outer='M85 0 Q145 44 145 100 L145 151 L160 164 L145 179 L145 584 L85 614 L25 584 L25 179 L10 164 L25 151 L25 100 Q25 44 85 0Z';
 const inner='M85 119 Q119 130 135 158 L135 578 L85 601 L35 578 L35 158 Q51 130 85 119Z';
 const source=slot.art||`assets/stained/gallery-${slot.sheet}.png`;
 const glass=slot.art?`<svg x="35" y="119" width="100" height="482" viewBox="210 425 305 1290" preserveAspectRatio="none"><image href="${source}" width="724" height="2172"/></svg>`:`<svg x="35" y="119" width="100" height="482" viewBox="${slot.center-50} 250 100 410" preserveAspectRatio="none"><image href="${source}" width="1670" height="941"/></svg>`;
 let sprite='';
 if(!slot.pending){
  if(slot.art){
   // Only the existing girl; exclude her old gold plinth and the glass behind her.
   sprite=`<svg class="sg-character" x="45" y="534" width="80" height="116" viewBox="254 1718 200 325" overflow="visible"><defs><clipPath id="${id}-person"><path d="M320 1718 L381 1718 L412 1733 L427 1758 L430 1790 L452 1786 L455 1813 L447 1834 L452 1860 L445 1895 L433 1911 L438 1960 L444 1990 L404 1999 L397 2043 L346 2043 L341 2034 L306 2039 L305 2000 L270 1992 L263 1970 L270 1935 L281 1907 L263 1895 L254 1840 L276 1835 L292 1842 L300 1827 L288 1820 L286 1771 L300 1740 Z"/></clipPath></defs><image href="${source}" width="724" height="2172" clip-path="url(#${id}-person)"/></svg>`;
  }else{
   const person=silhouettes[slot.sprite?.key||slot.key];
   const spriteSource=slot.sprite?`assets/stained/gallery-${slot.sprite.sheet}.png`:source;
   const spriteCenter=slot.sprite?.center??slot.center;
   const spriteFilter=slot.sprite?.filter?` style="filter:${slot.sprite.filter}"`:'';
   sprite=`<g class="sg-character" transform="translate(85 ${650-person.feet})"><defs><clipPath id="${id}-person"><path d="${person.path}"/></clipPath></defs><image href="${spriteSource}" x="${-spriteCenter}" y="0" width="1670" height="941" clip-path="url(#${id}-person)"${spriteFilter}/></g>`;
  }
 }
 wrapper.innerHTML=`<svg viewBox="0 0 170 700" xmlns="http://www.w3.org/2000/svg" focusable="false">
 <defs>
 <clipPath id="${id}-outer"><path d="${outer}"/></clipPath>
 <clipPath id="${id}-glass"><path d="${inner}"/></clipPath>
 <mask id="${id}-frame" maskUnits="userSpaceOnUse" x="0" y="0" width="170" height="620"><path d="${outer}" fill="white"/><path d="${inner}" fill="black"/></mask>
 <filter id="${id}-silver" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/></filter>
 <clipPath id="${id}-base"><path d="M40 647 C38 634 55 627 85 627 C115 627 132 634 130 647 L122 682 Q85 701 48 682 Z"/></clipPath>
 </defs>
 <g class="sg-glass" clip-path="url(#${id}-glass)">${glass}${slot.glassTint?`<rect x="35" y="119" width="100" height="482" fill="${slot.glassTint}" style="mix-blend-mode:color"/>`:''}</g>
 <g class="sg-frame" mask="url(#${id}-frame)" filter="url(#${id}-silver)"><image href="${ref}" x="-140.25" y="-149.6" width="1740.8" height="979.2"/></g>
 <g class="sg-foot-tracery" fill="none" stroke="#161719" stroke-width="7"><path d="M35 575 Q47 542 85 528 Q123 542 135 575 M35 573 Q62 581 85 601 Q108 581 135 573"/><path d="M85 514 L99 528 L85 542 L71 528Z"/></g>
 <g class="sg-foot-tracery" fill="none" stroke="#b1b2b3" stroke-width="2"><path d="M35 575 Q47 542 85 528 Q123 542 135 575 M35 573 Q62 581 85 601 Q108 581 135 573"/><path d="M85 514 L99 528 L85 542 L71 528Z"/></g>
 <g class="sg-plinth" data-foot-plane="650" clip-path="url(#${id}-base)"><image href="${ref}" x="-140.25" y="-139.65" width="1740.8" height="979.2"/></g>
 <ellipse class="sg-contact-shadow" cx="85" cy="650" rx="26" ry="5" fill="#13120f" opacity=".65"/>
 ${sprite}</svg>`;
 if(assetBase)for(const img of wrapper.querySelectorAll("image"))img.setAttribute("href",assetBase+img.getAttribute("href"));
 return wrapper;
}
