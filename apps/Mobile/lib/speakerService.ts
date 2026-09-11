import { supabase } from './supabase';
import { createSpeakerService } from '../../../packages/shared/createSpeakerService';

export type { EventSpeaker, GuestSpeaker } from '../../../packages/shared/createSpeakerService';

export const SpeakerService = createSpeakerService(supabase);
