import { z } from 'zod';
import { FIELD_LIMITS } from '../formFields';

const fileFields = {
  bannerFile: z.any().optional(),
  eventKitsFile: z.any().optional(),
  eventProgrammeFile: z.any().optional(),
  certificatesFile: z.any().optional(),
  sponsorImages: z.any().optional(),
  speakerImages: z.any().optional(),
};

const dateOrderRefine = (schema) =>
  schema.refine((data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  });

export function getEventFormSchema(mode = 'create') {
  if (mode === 'edit') {
    return dateOrderRefine(z.object({
      title: z.string().optional(),
      rationale: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      venue: z.string().optional(),
      maxParticipants: z.string().optional(),
      sponsors: z.string().optional(),
      guestSpeakers: z.string().optional(),
      checkInBeforeMinutes: z.coerce.number().min(0).max(480).optional(),
      checkInDuringMinutes: z.coerce.number().min(0).max(240).optional(),
      eventKitsLink: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
      eventProgrammeLink: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
      ...fileFields,
    }));
  }

  return dateOrderRefine(z.object({
    title: z.string().min(1, 'Event title is required').max(FIELD_LIMITS.eventTitle, `Title must be ${FIELD_LIMITS.eventTitle} characters or less`),
    rationale: z.string().optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    venue: z.string().min(1, 'Venue is required'),
    maxParticipants: z.string().optional(),
    sponsors: z.string().optional(),
    guestSpeakers: z.string().optional(),
    checkInBeforeMinutes: z.coerce.number().min(0).max(480).optional(),
    checkInDuringMinutes: z.coerce.number().min(0).max(240).optional(),
    eventKitsLink: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
    eventProgrammeLink: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
    ...fileFields,
  }));
}

export const createEventSchema = getEventFormSchema('create');
export const editEventSchema = getEventFormSchema('edit');
