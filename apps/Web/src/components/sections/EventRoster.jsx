import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  CircleCheck,
  Clock,
  Download,
  Mail,
  Search,
  Users,
} from 'lucide-react';
import { EventService } from '../../services/eventService';
import { useAuth } from '../../contexts/AuthContext';
import { PageSkeleton } from '../loading/Skeleton';
import { ErrorState } from '../ErrorState';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';

const parseParticipants = (raw) => {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
};

const participantName = (row) => {
  const user = row.users || row.user || {};
  const full = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return full || user.email || 'Unknown participant';
};

const participantEmail = (row) => (row.users || row.user || {}).email || '';

const participantOrg = (row) => {
  const user = row.users || row.user || {};
  return user.organization || user.affiliated_organization || '';
};

const checkInLabel = (checkIn) => {
  if (!checkIn) return { label: 'Not checked in', className: 'bg-slate-100 text-slate-600' };
  if (checkIn.is_validated) return { label: 'Checked in', className: 'bg-emerald-50 text-emerald-800' };
  return { label: 'Pending validation', className: 'bg-amber-50 text-amber-800' };
};

const formatWhen = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const EventRoster = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [rows, setRows] = useState([]);
  const [checkInsByUser, setCheckInsByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  const canManage = user?.role === 'admin' || user?.role === 'organizer';

  const loadRoster = async () => {
    try {
      setLoading(true);
      setError(null);

      const eventResult = await EventService.getEventById(eventId);
      if (eventResult.error || !eventResult.event) {
        setError(eventResult.error || 'Event not found.');
        setEvent(null);
        setRows([]);
        return;
      }

      const loadedEvent = eventResult.event;
      const ownsEvent = user?.role === 'admin' || loadedEvent.created_by === user?.id;
      if (!ownsEvent) {
        setError('You can only view the roster for events you created.');
        setEvent(null);
        setRows([]);
        return;
      }

      setEvent(loadedEvent);

      const [participantsResult, checkInsResult] = await Promise.all([
        EventService.getEventParticipants(eventId),
        EventService.getEventCheckIns(eventId),
      ]);

      if (participantsResult.error) {
        setError(participantsResult.error);
        setRows([]);
        return;
      }

      setRows(parseParticipants(participantsResult.participants));

      const checkMap = {};
      (checkInsResult.checkIns || []).forEach((entry) => {
        if (!entry.user_id) return;
        const previous = checkMap[entry.user_id];
        if (!previous || new Date(entry.check_in_time) > new Date(previous.check_in_time)) {
          checkMap[entry.user_id] = entry;
        }
      });
      setCheckInsByUser(checkMap);
    } catch {
      setError('Failed to load the participant roster.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!canManage) {
      navigate('/');
      return;
    }
    loadRoster();
  }, [authLoading, canManage, eventId, isAuthenticated, navigate, user?.id]);

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => {
      const haystack = [
        participantName(row),
        participantEmail(row),
        participantOrg(row),
        row.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, rows]);

  const checkedInCount = rows.filter((row) => checkInsByUser[row.user_id]).length;

  const exportRows = visibleRows.map((row) => {
    const checkIn = checkInsByUser[row.user_id];
    return {
      ...row,
      check_in_status: checkInLabel(checkIn).label,
      check_in_time: checkIn?.check_in_time || '',
    };
  });

  const fileBase = `${String(event?.title || 'event').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_roster`;

  if (authLoading || loading) {
    return <PageSkeleton variant="table" />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={loadRoster}
        retryLabel="Try again"
      />
    );
  }

  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">
        <Link
          to="/events"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-blue-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to events
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Participant roster</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {event?.title || 'Event'}
            </h1>
            <p className="mt-1 text-[15px] text-slate-600">
              Names, emails, and check-in status for people registered for this event.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportToCSV(exportRows, fileBase)}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => exportToExcel(exportRows, fileBase, 'Roster')}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-900 px-3 text-sm font-medium text-white hover:bg-blue-800"
            >
              <Download className="h-4 w-4" />
              Excel
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Registered</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{rows.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Checked in</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{checkedInCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Not checked in</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{Math.max(rows.length - checkedInCount, 0)}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or email"
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-900 focus:outline-none"
            />
          </label>
          <p className="text-sm text-slate-500">{visibleRows.length} shown</p>
        </div>

        {visibleRows.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-3 text-lg font-semibold text-slate-900">
              {rows.length === 0 ? 'No registrations yet' : 'No matches'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {rows.length === 0
                ? 'When people register for this event, they will appear here.'
                : 'Try a different name or email.'}
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="hidden px-4 py-3 md:table-cell">Organization</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Registered</th>
                    <th className="px-4 py-3">Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const name = participantName(row);
                    const email = participantEmail(row);
                    const checkIn = checkInsByUser[row.user_id];
                    const status = checkInLabel(checkIn);
                    return (
                      <tr key={row.id || row.user_id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-900 text-xs font-semibold text-white">
                              {name.charAt(0).toUpperCase()}
                            </span>
                            <span className="font-medium text-slate-900">{name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {email ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-slate-400" />
                              {email}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                          {participantOrg(row) || '—'}
                        </td>
                        <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {formatWhen(row.registration_date || row.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                            {checkIn?.is_validated ? <CircleCheck className="h-3.5 w-3.5" /> : null}
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default EventRoster;
