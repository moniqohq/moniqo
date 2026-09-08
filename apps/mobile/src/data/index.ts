import { mockHomeRepository } from './mockHomeRepository';
import type { HomeRepository } from './homeRepository';

// TODO: swap for an @moniqo/sdk-backed implementation once mobile auth and
// the API base URL are wired up. Hooks depend only on the HomeRepository
// interface, so this is the single line that needs to change.
export const homeRepository: HomeRepository = mockHomeRepository;

export type { HomeRepository } from './homeRepository';
