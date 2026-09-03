import { supabase, supabaseAnonKey, supabaseUrl } from '../lib/supabaseClient';

const encodeObjectPath = (path) =>
  String(path)
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

export function uploadWithProgress({
  supabaseUrl: url = supabaseUrl,
  anonKey = supabaseAnonKey,
  bucket,
  path,
  file,
  accessToken,
  upsert = false,
  cacheControl = '3600',
  onProgress,
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const objectPath = encodeObjectPath(path);
    xhr.open('POST', `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('apikey', anonKey);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', upsert ? 'true' : 'false');
    xhr.setRequestHeader('cache-control', `max-age=${cacheControl}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.min(99, (event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve({ path });
        return;
      }

      let message = `Upload failed with status ${xhr.status}`;
      try {
        const parsed = JSON.parse(xhr.responseText);
        message = parsed.message || parsed.error || message;
      } catch {
        if (xhr.responseText) message = xhr.responseText;
      }
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error('Upload failed: network error'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));
    xhr.send(file);
  });
}

export async function uploadStorageFile({
  bucket,
  path,
  file,
  upsert = false,
  onProgress,
}) {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error('You need to be signed in to upload files.');
  }

  await uploadWithProgress({
    bucket,
    path,
    file,
    accessToken,
    upsert,
    onProgress,
  });

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl };
}
