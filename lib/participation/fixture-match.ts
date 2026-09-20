/**
 * Head-to-head fixtures ("FK Inter vs FC Petržalka", "FC Petržalka - ViOn")
 * are watch-only (Sledovať). Lobby "Tím vs Tím" challenges stay joinable —
 * do not use this helper there.
 */

/** Explicit separators used on Slovak sports sites. */
const EXPLICIT_SEP = /\s+(?:vs\.?|versus|proti|v\.?s\.?)\s+/i;

/**
 * Club / team markers common in SK fixtures. Used to tell
 * "FC A - FC B" from "SIAM FIGHTERS - Zápasnícky tréning".
 */
const TEAM_MARKER =
  /\b(?:fc|fk|šk|sk|mfk|ofk|hc|tj|afc|ac|nk|mšk|msk|asc|škf|sfc|1\.?\s*fc|inter|slovan|petržalka|petrzalka|vion|spartak|dukla|dynamo|ban[ií]k|žilina|zilina|tren[cč][ií]n|trnava|nitra|senica|ruzomberok|ružomberok|podbrezov[aá]|zlat[eé]\s+moravce|samorin|šamor[ií]n|malženice|malzenice|vra[aá]ble)\b/i;

/** Right/left side is clearly a class, promo, or league note — not a club. */
const NON_TEAM_SIDE =
  /\b(?:tr[eé]ning|skupina|kurz|v[ií]kend|v[yý]ro[cč]ie|za[cč]iato[cč]|pokro[cč]il|deti|diev[cč]at|ženy|zeny|ladies|basic|beast|stronger|technika|kond[ií]cia|rann[yý]|spolo[cč]n[yý]|n[aá]hradn|hern[yý]|open\b|turnaj|liga\s+v\b|rozvrh|cenn[ií]k|vstupen|predpredaj|100\.|mami[cč]ky|junior|senior|mix\b|kids|teens|fighters)\b/i;

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sideLooksLikeTeam(side: string): boolean {
  const s = fold(side);
  if (s.length < 2 || s.length > 80) return false;
  if (NON_TEAM_SIDE.test(s)) return false;
  if (TEAM_MARKER.test(s)) return true;
  // "Bytča", "Vráble", "Malženice" — short place/club names without FC prefix,
  // but only when paired with an explicit team marker on the other side
  // (handled by caller requiring at least one TEAM_MARKER overall).
  return /^[\p{L}\d][\p{L}\d .'’-]{1,40}$/u.test(s) && !/\d{2,}/.test(s);
}

function bothSidesAreClubs(left: string, right: string): boolean {
  if (!sideLooksLikeTeam(left) || !sideLooksLikeTeam(right)) return false;
  // At least one side must carry a clear club marker so we don't treat
  // "Joga - Pilates" or "Basic - Beast" as fixtures.
  return TEAM_MARKER.test(fold(left)) || TEAM_MARKER.test(fold(right));
}

/**
 * True for scheduled club/league fixtures a fan watches — not open registration.
 *
 * Matches:
 * - `FK Inter Bratislava vs FC Petržalka`
 * - `FC Petržalka - MŠK Žilina B`
 * - `FC ViOn Zlaté Moravce - Vráble - FC Petržalka` (multi-dash; ends are clubs)
 * - `Slovan proti Spartak`
 *
 * Rejects:
 * - `SIAM FIGHTERS - Zápasnícky tréning`
 * - `I. liga v curlingu - náhradný herný víkend`
 * - `Thajský box - Skupina B`
 * - Lobby challenges titled only "Tím vs Tím" without club markers still match
 *   explicit `vs` — callers must not use this for lobby UI.
 */
export function titleLooksLikeHeadToHeadFixture(title: string): boolean {
  const t = fold(title);
  if (t.length < 5) return false;

  const explicit = EXPLICIT_SEP.exec(t);
  if (explicit && explicit.index != null) {
    const left = t.slice(0, explicit.index).trim();
    const right = t.slice(explicit.index + explicit[0].length).trim();
    // Strip trailing score / round noise: "FC A vs FC B (2. liga)"
    const rightCore = right.replace(/\s*[\(\[|].*$/, '').trim();
    if (left.length >= 2 && rightCore.length >= 2) {
      // Lobby challenges ("Tím vs Tím") stay joinable — not scraped fixtures.
      const lobbySide = /^(t[ií]m|team|my|s[uú]peri|hr[aá][cč]i)$/i;
      if (lobbySide.test(left) && lobbySide.test(rightCore)) return false;
      // Explicit vs/proti is enough unless a side is clearly a class label.
      if (!NON_TEAM_SIDE.test(left) && !NON_TEAM_SIDE.test(rightCore)) return true;
    }
  }

  // En/em/hyphen dash between club names (Petržalka fixtures on club sites).
  const dashParts = t.split(/\s+[-–—]\s+/).map((p) => p.trim()).filter(Boolean);
  if (dashParts.length >= 2) {
    const left = dashParts[0]!;
    const right = dashParts[dashParts.length - 1]!;
    if (bothSidesAreClubs(left, right)) return true;
    if (dashParts.length === 2 && bothSidesAreClubs(left, dashParts[1]!)) return true;
  }

  // "Team x Team" (rare on SK sites, common in brackets).
  const xSep = /\s+x\s+/i.exec(t);
  if (xSep && xSep.index != null) {
    const left = t.slice(0, xSep.index).trim();
    const right = t.slice(xSep.index + xSep[0].length).trim();
    if (bothSidesAreClubs(left, right)) return true;
  }

  return false;
}

export function listingParticipationMode(
  title: string,
  stored: string | null | undefined,
): 'spectator' | 'participate' {
  if (titleLooksLikeHeadToHeadFixture(title)) return 'spectator';
  return stored === 'spectator' ? 'spectator' : 'participate';
}

/** Keep cards whose resolved mode matches the feed tab (Hrať / Sledovať). */
export function matchesParticipationModeFilter(
  title: string,
  stored: string | null | undefined,
  mode: 'spectator' | 'participate' | 'all' | null | undefined,
): boolean {
  if (!mode || mode === 'all') return true;
  return listingParticipationMode(title, stored) === mode;
}
