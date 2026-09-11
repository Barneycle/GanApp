import { supabase } from '../lib/supabaseClient';
import { createEmptySpeaker, createEmptySponsor, moveAtIndex, removeAtIndex } from '../utils/eventForm/helpers';

export function useSpeakerSponsorCrud({
  speakers,
  setSpeakers,
  sponsors,
  setSponsors,
  setUploadedFiles,
  setShowAddSpeaker,
  setShowAddSponsor,
}) {
  const addSpeaker = () => {
    setSpeakers([...speakers, createEmptySpeaker(speakers.length)]);
    setShowAddSpeaker?.(false);
  };

  const updateSpeaker = (index, field, value) => {
    setSpeakers(speakers.map((speaker, i) => (
      i === index ? { ...speaker, [field]: value } : speaker
    )));
  };

  const removeSpeaker = (index) => {
    setUploadedFiles((prev) => {
      const removedPhoto = prev.speakerPhotos?.[index];
      if (removedPhoto?.path && removedPhoto?.uploaded && removedPhoto?.bucket) {
        supabase.storage.from(removedPhoto.bucket).remove([removedPhoto.path]);
      }
      return {
        ...prev,
        speakerPhotos: removeAtIndex(prev.speakerPhotos, index),
      };
    });
    setSpeakers(speakers
      .filter((_, i) => i !== index)
      .map((speaker, i) => ({ ...speaker, speaker_order: i })));
  };

  const moveSpeaker = (fromIndex, toIndex) => {
    const updatedSpeakers = [...speakers];
    const [movedSpeaker] = updatedSpeakers.splice(fromIndex, 1);
    updatedSpeakers.splice(toIndex, 0, movedSpeaker);
    setUploadedFiles((prev) => ({
      ...prev,
      speakerPhotos: moveAtIndex(prev.speakerPhotos, fromIndex, toIndex),
    }));
    setSpeakers(updatedSpeakers.map((speaker, i) => ({ ...speaker, speaker_order: i })));
  };

  const addSponsor = () => {
    setSponsors([...sponsors, createEmptySponsor(sponsors.length)]);
    setShowAddSponsor?.(false);
  };

  const updateSponsor = (index, field, value) => {
    setSponsors(sponsors.map((sponsor, i) => (
      i === index ? { ...sponsor, [field]: value } : sponsor
    )));
  };

  const removeSponsor = (index) => {
    setUploadedFiles((prev) => {
      const removedLogo = prev.sponsorLogos?.[index];
      if (removedLogo?.path && removedLogo?.uploaded && removedLogo?.bucket) {
        supabase.storage.from(removedLogo.bucket).remove([removedLogo.path]);
      }
      return {
        ...prev,
        sponsorLogos: removeAtIndex(prev.sponsorLogos, index),
      };
    });
    setSponsors(sponsors
      .filter((_, i) => i !== index)
      .map((sponsor, i) => ({ ...sponsor, sponsor_order: i })));
  };

  const moveSponsor = (fromIndex, toIndex) => {
    const updatedSponsors = [...sponsors];
    const [movedSponsor] = updatedSponsors.splice(fromIndex, 1);
    updatedSponsors.splice(toIndex, 0, movedSponsor);
    setUploadedFiles((prev) => ({
      ...prev,
      sponsorLogos: moveAtIndex(prev.sponsorLogos, fromIndex, toIndex),
    }));
    setSponsors(updatedSponsors.map((sponsor, i) => ({ ...sponsor, sponsor_order: i })));
  };

  return {
    addSpeaker,
    updateSpeaker,
    removeSpeaker,
    moveSpeaker,
    addSponsor,
    updateSponsor,
    removeSponsor,
    moveSponsor,
  };
}
