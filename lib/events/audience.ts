import { detectExplicitKidsAudience, type KidsAudienceInput } from '@/lib/events/for-kids';
import {
  detectExplicitWomenAudience,
  type WomenAudienceInput,
} from '@/lib/events/for-women';

export type ListingAudienceInput = KidsAudienceInput & WomenAudienceInput;

export function classifyListingAudience(input: ListingAudienceInput): {
  forKids: boolean;
  forWomen: boolean;
} {
  return {
    forKids: detectExplicitKidsAudience(input),
    forWomen: detectExplicitWomenAudience(input),
  };
}

export function tagScrapedListingAudience<T extends ListingAudienceInput>(
  event: T,
): T & { forKids: boolean; forWomen: boolean } {
  return {
    ...event,
    ...classifyListingAudience(event),
  };
}

/** Open mixed listing — not exclusively kids and not exclusively women. */
export function isOpenMixedAudience(input: ListingAudienceInput): boolean {
  const { forKids, forWomen } = classifyListingAudience(input);
  return !forKids && !forWomen;
}
