import type { GalleryItem } from "./accordion-gallery";

/** Resolution-independent, topic-specific artwork sized to the accordion header. */
export function AccordionArtwork({ item }: { item: GalleryItem }) {
  const id = `art-${item.id}`;
  return <svg className={`accordion-artwork accordion-artwork-${item.id}`} viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-sky`} x2="1" y2="1"><stop stopColor="#132a46"/><stop offset=".56" stopColor="#1d4161"/><stop offset="1" stopColor="#0a172a"/></linearGradient>
      <linearGradient id={`${id}-panel`} x2="1" y2="1"><stop stopColor="#4c9fca"/><stop offset=".5" stopColor="#173e65"/><stop offset="1" stopColor="#102944"/></linearGradient>
      <radialGradient id={`${id}-glow`}><stop stopColor="#7dc7e8" stopOpacity=".5"/><stop offset="1" stopColor="#7dc7e8" stopOpacity="0"/></radialGradient>
      <pattern id={`${id}-cells`} width="46" height="24" patternUnits="userSpaceOnUse"><path d="M0 0H46M0 12H46M23 0V12M11 12V24M35 12V24" fill="none" stroke="#c7eaff" strokeOpacity=".34" strokeWidth="1.2"/></pattern>
    </defs>
    <rect width="1200" height="300" fill={`url(#${id}-sky)`}/>
    <circle cx="920" cy="78" r="190" fill={`url(#${id}-glow)`}/>
    <path d="M0 238Q250 184 470 226T910 214T1200 205V300H0Z" fill="#09172a" opacity=".65"/>
    {item.id === "system-overview" && <g transform="translate(640 18)"><path d="M35 125 265 16l256 111v128H35Z" fill="#13263b" stroke="#8cb4d5" strokeWidth="5"/><path d="m25 128 239-117 270 117" fill="none" stroke="#c6deef" strokeWidth="10"/><path d="m127 94 139-67 152 70v90H127Z" fill={`url(#${id}-panel)`} stroke="#91c7e7" strokeWidth="3"/><path d="m127 94 139-67 152 70v90H127Z" fill={`url(#${id}-cells)`}/><rect x="203" y="161" width="55" height="82" rx="3" fill="#203e5b"/><path d="M0 260H590" stroke="#7aa7c9" strokeOpacity=".38" strokeWidth="3"/></g>}
    {item.id === "energy-production" && <g transform="translate(510 25)"><path d="M90 198 360 54l282 144-270 78Z" fill={`url(#${id}-panel)`} stroke="#a4d9f4" strokeWidth="4"/><path d="m90 198 270-144 282 144-270 78Z" fill={`url(#${id}-cells)`}/><path d="M360 54v222M225 126l282 144M495 126 225 270" fill="none" stroke="#c4e7fa" strokeOpacity=".66" strokeWidth="3"/><path d="m671 42 20-29m35 62 35-16m-43 52 39-3" stroke="#d5e9f9" strokeWidth="5" strokeLinecap="round" opacity=".82"/></g>}
    {item.id === "consumption-savings" && <g transform="translate(590 20)"><path d="m44 135 150-91 150 91v139H44Z" fill="#18324b" stroke="#8eb4d3" strokeWidth="5"/><path d="m30 138 164-106 166 106" fill="none" stroke="#c2d9ea" strokeWidth="9"/><path d="m115 109 79-50 90 54v62H115Z" fill={`url(#${id}-panel)`} stroke="#9ac9e5" strokeWidth="3"/><rect x="397" y="100" width="125" height="162" rx="16" fill="#142a43" stroke="#86c5e5" strokeWidth="5"/><rect x="438" y="83" width="44" height="17" rx="5" fill="#86c5e5"/><path d="M459 126 438 177h24l-10 47 37-65h-26l15-33Z" fill="#9cdbef"/><path d="M565 92v155m0-155 20 17m-20-17-20 17m20 138 20-17m-20 17-20-17" fill="none" stroke="#7fbbe0" strokeWidth="4"/></g>}
    {item.id === "scenario-comparison" && <g transform="translate(645 35)"><path d="M30 230H530M68 230V166h78v64m44 0V115h78v115m44 0V72h78v158m44 0V132h78v98" fill="none" stroke="#9fc8e6" strokeWidth="8" strokeLinejoin="round"/><path d="m68 154 122-49 122-44 122 38 96-57" fill="none" stroke="#83d2e4" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/><g fill="#d9eff8"><circle cx="68" cy="154" r="8"/><circle cx="190" cy="105" r="8"/><circle cx="312" cy="61" r="8"/><circle cx="434" cy="99" r="8"/><circle cx="530" cy="42" r="8"/></g><path d="M30 40V230" stroke="#6688a7" strokeWidth="3"/></g>}
    {item.id === "project-assumptions" && <g transform="translate(620 22)"><path d="M55 54H490V250H55Z" fill="#122740" stroke="#8db4d4" strokeWidth="4"/><path d="M55 54H490V250H55Z" fill={`url(#${id}-cells)`} opacity=".8"/><path d="M273 54v196M55 152h435" stroke="#c1dfef" strokeOpacity=".6" strokeDasharray="8 8" strokeWidth="3"/><circle cx="650" cy="143" r="66" fill="#132942" stroke="#8db4d4" strokeWidth="4"/><path d="m650 83 17 61-17-9-17 9 17-61Zm0 120-15-52 15 8 15-8-15 52Z" fill="#c4e5f4"/><text x="650" y="61" textAnchor="middle" fill="#e4f3fb" fontSize="15" fontFamily="system-ui">N</text><path d="M751 108h168M751 151h223M751 194h134" stroke="#9ebbd4" strokeOpacity=".72" strokeWidth="7" strokeLinecap="round"/></g>}
    <path d="M0 285H1200" stroke="#d9efff" strokeOpacity=".24" strokeWidth="2"/>
    <title>{item.alt}</title>
  </svg>;
}
