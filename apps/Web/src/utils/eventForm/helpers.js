export const setAtIndex = (list, index, value) => {
  const next = Array.isArray(list) ? [...list] : [];
  while (next.length <= index) next.push(null);
  next[index] = value;
  return next;
};

export const removeAtIndex = (list, index) => {
  const next = Array.isArray(list) ? [...list] : [];
  next.splice(index, 1);
  return next;
};

export const moveAtIndex = (list, fromIndex, toIndex) => {
  const next = Array.isArray(list) ? [...list] : [];
  const size = Math.max(next.length, fromIndex + 1, toIndex + 1);
  while (next.length < size) next.push(null);
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
};

export const entryImageFiles = (uploaded, url, path, id, filename, bucket) => {
  if (uploaded) return [uploaded];
  if (url) {
    return [{
      id,
      filename,
      url,
      path: path || null,
      type: 'image/jpeg',
      uploaded: true,
      bucket,
    }];
  }
  return [];
};

export const stripHtml = (html) =>
  String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export const CORE_STEPS = [
  { id: 'basics', label: 'Basics' },
  { id: 'schedule', label: 'Schedule & Venue' },
  { id: 'description', label: 'Description' },
  { id: 'review', label: 'Review' },
];

export const EMPTY_UPLOADED_FILES = {
  banner: null,
  materials: [],
  logo: null,
  photo: null,
  sponsorLogos: [],
  speakerPhotos: [],
  eventKits: [],
  eventProgrammes: [],
};

export function createEmptySpeaker(order = 0) {
  return {
    id: Date.now().toString(),
    prefix: '',
    first_name: '',
    last_name: '',
    middle_initial: '',
    affix: '',
    designation: '',
    organization: '',
    bio: '',
    email: '',
    phone: '',
    photo_url: '',
    photo_path: '',
    is_keynote: false,
    speaker_order: order,
  };
}

export function createEmptySponsor(order = 0) {
  return {
    id: Date.now().toString(),
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    logo_url: '',
    logo_path: '',
    contribution: '',
    sponsor_order: order,
  };
}

export function extractFilePath(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function extractBucketName(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\//);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
