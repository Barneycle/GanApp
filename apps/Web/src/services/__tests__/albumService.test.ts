import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlbumService } from '../albumService';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

const albumEvent = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Album Event',
  venue: 'Hall',
  start_date: '2024-12-01',
  end_date: '2024-12-02',
  start_time: '10:00:00',
  end_time: '18:00:00',
  banner_url: 'https://example.com/banner.jpg',
  status: 'published',
};

function thenableChain(resolved: { data: any; error: any }) {
  const chain: any = {
    then: (resolve: any, reject: any) => Promise.resolve(resolved).then(resolve, reject),
  };
  ['select', 'eq', 'order', 'limit', 'in'].forEach((method) => {
    chain[method] = vi.fn().mockReturnValue(chain);
  });
  return chain;
}

describe('AlbumService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads albums from a single embedded events query', async () => {
    const chain = thenableChain({
      data: [{
        ...albumEvent,
        event_photos: [
          {
            id: 'photo-1',
            event_id: 'event-123',
            photo_url: 'https://example.com/a.jpg',
            user_id: 'user-1',
            created_at: '2024-12-02T00:00:00Z',
            uploaded_at: '2024-12-02T00:00:00Z',
          },
        ],
      }],
      error: null,
    });
    (supabase.from as any).mockReturnValue(chain);

    const result = await AlbumService.getEventsWithPhotos();

    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.storage.from).not.toHaveBeenCalled();
    expect(result.events).toHaveLength(1);
    expect(result.events[0].photo_count).toBe(1);
    expect(result.events[0].photos[0].photo_url).toBe('https://example.com/a.jpg');
    expect(result.error).toBeUndefined();
  });

  it('limits highlight fetches instead of loading the full catalog', async () => {
    const chain = thenableChain({
      data: [{
        ...albumEvent,
        event_photos: [{
          id: 'photo-1',
          event_id: 'event-123',
          photo_url: 'https://example.com/a.jpg',
          user_id: 'user-1',
          created_at: '2024-12-02T00:00:00Z',
        }],
      }],
      error: null,
    });
    (supabase.from as any).mockReturnValue(chain);

    const result = await AlbumService.getAlbumHighlights(3);

    expect(chain.limit).toHaveBeenCalledWith(3);
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(result.events).toHaveLength(1);
  });

  it('falls back to storage folders when the tracking table is empty', async () => {
    const tableChain = thenableChain({ data: [], error: null });
    const eventChain = thenableChain({ data: [albumEvent], error: null });
    (supabase.from as any)
      .mockReturnValueOnce(tableChain)
      .mockReturnValueOnce(eventChain);

    const list = vi.fn()
      .mockResolvedValueOnce({
        data: [{ name: albumEvent.id, id: null, metadata: null }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ name: 'shot.jpg', id: 'file-1', created_at: '2024-12-02T00:00:00Z' }],
        error: null,
      });
    (supabase.storage.from as any).mockReturnValue({
      list,
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example/shot.jpg' } }),
    });

    const result = await AlbumService.getEventsWithPhotos();

    expect(result.events).toHaveLength(1);
    expect(result.events[0].photo_count).toBe(1);
    expect(list).toHaveBeenCalled();
  });
});
