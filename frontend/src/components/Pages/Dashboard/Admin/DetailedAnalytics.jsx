import React, { useState, useEffect, useRef, useContext } from 'react';
import { Card, Button, Spinner, Alert, Select, Table, Modal } from 'flowbite-react';
import { Play, RefreshCw, BarChart3, Activity, UserRound, Download, Trash2, Video as VideoIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import VideoService from '../../../../utils/VideoService';
import { AuthContext } from '../../../../contexts/AuthProvider/AuthProvider';

const EMOTIONS = [
  { key: 'happy', label: 'Happy', color: '#22c55e' },
  { key: 'neutral', label: 'Neutral', color: '#64748b' },
  { key: 'sad', label: 'Sad', color: '#3b82f6' },
  { key: 'angry', label: 'Angry', color: '#ef4444' },
  { key: 'fear', label: 'Fear', color: '#a855f7' },
  { key: 'surprise', label: 'Surprise', color: '#f59e0b' },
  { key: 'disgust', label: 'Disgust', color: '#8b5cf6' },
];

const EMOTION_COLOR = Object.fromEntries(EMOTIONS.map(e => [e.key, e.color]));

const WINDOW_SECONDS = 10;

const DetailedAnalytics = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  const [videos, setVideos] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [runStatus, setRunStatus] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteRecording = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await VideoService.adminDeleteWebcamRecording(deleteTarget.recording_id);
      setRecordings(prev => prev.filter(r => r.recording_id !== deleteTarget.recording_id));
      setDeleteTarget(null);
      if (selectedVideoId) loadAnalytics(selectedVideoId);
    } catch (err) {
      console.error('Error deleting recording:', err);
    } finally {
      setDeleting(false);
    }
  };

  const pollTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadVideos();
    if (isAdmin) loadRunStatus();
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  const loadVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = isAdmin
        ? await VideoService.adminGetAllVideos()
        : await VideoService.getVideoFeed();
      const list = Array.isArray(data) ? data : [];
      if (!mountedRef.current) return;
      setVideos(list);
      if (list.length > 0 && !selectedVideoId) {
        setSelectedVideoId(list[0].id);
        loadAnalytics(list[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading videos for analytics:', err);
      if (!mountedRef.current) return;
      setError(err.message || 'Failed to load videos');
      setLoading(false);
    }
  };

  const loadAnalytics = async (videoId) => {
    if (!videoId) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryData, recordingsData] = await Promise.all([
        VideoService.getVideoEmotionSummary(videoId),
        VideoService.getVideoEmotionRecordings(videoId),
      ]);
      if (!mountedRef.current) return;
      setSummary(summaryData);
      setRecordings(recordingsData);
    } catch (err) {
      console.error('Error loading emotion analytics:', err);
      if (!mountedRef.current) return;
      setError(err.message || 'Failed to load emotion analytics');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const loadRunStatus = async () => {
    try {
      const statusData = await VideoService.getEmotionAnalysisStatus();
      if (mountedRef.current) setRunStatus(statusData);
    } catch {
      if (mountedRef.current) setRunStatus(null);
    }
  };

  const handleSelectVideo = (e) => {
    const id = parseInt(e.target.value, 10);
    setSelectedVideoId(id);
    setExpanded(null);
    loadAnalytics(id);
  };

  const handleRunAnalysis = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setError(null);
    try {
      await VideoService.runEmotionAnalysis(selectedVideoId);
      loadRunStatus();
      const timer = setInterval(async () => {
        try {
          const statusData = await VideoService.getEmotionAnalysisStatus();
          if (!mountedRef.current) { clearInterval(timer); return; }
          setRunStatus(statusData);
          if (statusData?.status !== 'running') {
            clearInterval(timer);
            pollTimerRef.current = null;
            setIsRunning(false);
            if (selectedVideoId) loadAnalytics(selectedVideoId);
          }
        } catch (err) {
          console.error('Error polling analysis status:', err);
          clearInterval(timer);
          pollTimerRef.current = null;
          setIsRunning(false);
        }
      }, 3000);
      pollTimerRef.current = timer;
    } catch (err) {
      console.error('Error starting emotion analysis:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to start analysis');
        setIsRunning(false);
      }
    }
  };

  const distributionData = summary
    ? EMOTIONS.map(e => ({
        name: e.label,
        key: e.key,
        value: summary.distribution?.[e.key] || 0,
      }))
    : [];

  const timeline = summary?.timeline || [];

  const segments = computeSegments(timeline);

  const progressText =
    runStatus && runStatus.status === 'running'
      ? `${runStatus.processed || 0} / ${runStatus.total || 0} processed`
      : runStatus && runStatus.status === 'failed'
      ? `Last run: FAILED — ${runStatus.error || 'Unknown error'}`
      : runStatus
      ? `Last run: ${runStatus.status} (${runStatus.processed || 0}/${runStatus.total || 0})`
      : 'No runs yet';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <BarChart3 className="mr-2" /> Emotion Analytics
        </h1>
        {isAdmin && (
          <div className="flex items-center gap-3">
            {runStatus && (
              <span className={`text-sm max-w-[300px] truncate ${runStatus.status === 'failed' ? 'text-red-400' : 'text-gray-400'}`}>{progressText}</span>
            )}
            <Button
              color="blue"
              onClick={handleRunAnalysis}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Running…
                </>
              ) : (
                <>
                  <Play size={16} className="mr-2" /> Run analysis now
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <Alert color="failure" className="mb-4">{error}</Alert>
      )}

      <Card className="bg-elevated border-elevated-border mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {selectedVideoId && videos.find(v => v.id === selectedVideoId)?.thumbnail_url && (
            <img
              src={videos.find(v => v.id === selectedVideoId).thumbnail_url}
              alt=""
              className="w-20 h-12 object-cover rounded-lg border border-elevated-border shrink-0"
            />
          )}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <label className="text-white text-sm font-medium shrink-0">Video:</label>
            {videos.length === 0 ? (
              <span className="text-gray-400 text-sm">No videos available</span>
            ) : (
              <Select
                value={selectedVideoId || ''}
                onChange={handleSelectVideo}
                className="bg-surface-600 text-white border-elevated-border flex-1 min-w-0"
              >
                {videos.map(v => (
                  <option key={v.id} value={v.id}>{v.title}</option>
                ))}
              </Select>
            )}
            <Button color="light" onClick={() => selectedVideoId && loadAnalytics(selectedVideoId)}>
              <RefreshCw size={16} className="mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="xl" />
        </div>
      ) : !summary || summary.total_frames === 0 ? (
        <Card className="bg-elevated border-elevated-border shadow-md">
          <div className="text-gray-300 space-y-3">
            <p className="font-medium text-white">No emotion data yet for this video.</p>
            {(summary?.total_recordings > 0 || summary?.completed_recordings > 0) && (
              <div className="text-sm space-y-1 ml-1">
                {summary.total_recordings > 0 && (
                  <p>Total webcam recordings: <span className="text-white font-medium">{summary.total_recordings}</span></p>
                )}
                {summary.completed_recordings > 0 && (
                  <p>Recordings ready for analysis: <span className="text-green-400 font-medium">{summary.completed_recordings}</span></p>
                )}
                {summary.failed_recordings > 0 && (
                  <p className="text-red-400">Failed analyses: <span className="font-medium">{summary.failed_recordings}</span> — check the table below for error details</p>
                )}
                {summary.no_faces_recordings > 0 && (
                  <p className="text-yellow-400">No faces detected: <span className="font-medium">{summary.no_faces_recordings}</span> — analysis ran but found no face in webcam. Ensure proper lighting and face visibility.</p>
                )}
                {summary.total_recordings > 0 && summary.completed_recordings === 0 && (
                  <p className="text-yellow-400">No recordings are fully uploaded yet. Ensure the green checkmark appears after recording.</p>
                )}
              </div>
            )}
            <ul className="list-disc list-inside text-sm space-y-1 ml-1">
              <li>Recordings are analyzed daily at 12:00 PM (BD time).</li>
              {(!summary || summary.completed_recordings === 0) && (
                <li>Ensure webcam recordings are fully uploaded (must show green checkmark after recording).</li>
              )}
              <li>If recordings are ready, {isAdmin ? <>click <span className="font-medium">Run analysis now</span></> : 'an admin must run'} to process them.</li>
              <li>Analysis requires a detectable face in the webcam frames.</li>
            </ul>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-elevated border-elevated-border shadow-md">
              <h3 className="text-lg font-medium text-white mb-4">Overall Reaction Mix</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    label={(d) => `${d.name} ${(d.value * 100).toFixed(0)}%`}
                  >
                    {distributionData.map((d) => (
                      <Cell key={d.key} fill={EMOTION_COLOR[d.key]} />
                    ))}
                  </Pie>
                  <RTooltip formatter={(v) => `${(v * 100).toFixed(1)}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="bg-elevated border-elevated-border shadow-md">
              <h3 className="text-lg font-medium text-white mb-4">Engagement Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="t" stroke="#9ca3af" tickFormatter={(t) => `${t}s`} />
                  <YAxis stroke="#9ca3af" domain={[0, 1]} />
                  <RTooltip formatter={(v) => `${(v * 100).toFixed(0)}%`} labelFormatter={(t) => `${t}s`} />
                  <Legend />
                  {EMOTIONS.map(e => (
                    <Line
                      key={e.key}
                      type="monotone"
                      dataKey={e.key}
                      name={e.label}
                      stroke={e.color}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {segments && (
            <Card className="bg-elevated border-elevated-border shadow-md">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <Activity size={18} className="mr-2" /> Best / Worst {WINDOW_SECONDS}s Segments
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-green-900/30 border border-green-700">
                  <p className="text-green-300 font-medium">Most positive</p>
                  <p className="text-white text-sm mt-1">{segments.best.label} — {(segments.best.happy * 100).toFixed(0)}% happy</p>
                </div>
                <div className="p-4 rounded-lg bg-red-900/30 border border-red-700">
                  <p className="text-red-300 font-medium">Least positive</p>
                  <p className="text-white text-sm mt-1">{segments.worst.label} — {(segments.worst.happy * 100).toFixed(0)}% happy
                    {segments.worst.negative !== undefined && (
                      <span className="text-red-400"> / {(segments.worst.negative * 100).toFixed(0)}% negative</span>
                    )}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card className="bg-elevated border-elevated-border shadow-md">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <UserRound size={18} className="mr-2" /> Per-Person Breakdown
              <span className="ml-2 text-sm text-gray-400 font-normal">
                ({recordings.length} recordings)
              </span>
            </h3>
            {recordings.length === 0 ? (
              <p className="text-gray-400">No recordings found for this video.</p>
            ) : (
              <Table hoverable>
                <Table.Head>
                  <Table.HeadCell>Recording</Table.HeadCell>
                  <Table.HeadCell>Preview</Table.HeadCell>
                  <Table.HeadCell>Status</Table.HeadCell>
                  <Table.HeadCell>Duration</Table.HeadCell>
                  <Table.HeadCell>Top emotion</Table.HeadCell>
                  <Table.HeadCell>Happy</Table.HeadCell>
                  <Table.HeadCell></Table.HeadCell>
                </Table.Head>
                <Table.Body>
                  {recordings.map((r) => {
                    const top = Object.entries(r.distribution || {})
                      .sort((a, b) => b[1] - a[1])[0];
                    const topLabel = EMOTIONS.find(e => e.key === top?.[0])?.label || top?.[0];
                    const isAnalyzed = r.analysis_status === 'completed' && (r.timeline || []).length > 0;
                    const isNoFaces = r.analysis_status === 'completed' && (r.timeline || []).length === 0;
                    const isFailed = r.analysis_status === 'failed';
                    const isPending = r.analysis_status === 'pending' || r.analysis_status === 'processing';
                    const isUploadPending = r.upload_status !== 'completed';

                    const statusBadge = isUploadPending ? (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-900/50 text-yellow-400 border border-yellow-700">Upload pending</span>
                    ) : isAnalyzed ? (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-900/50 text-green-400 border border-green-700">Analyzed</span>
                    ) : isNoFaces ? (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-900/50 text-yellow-400 border border-yellow-700" title="Analysis completed but no face was detected in the webcam frames">No face detected</span>
                    ) : isFailed ? (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-red-900/50 text-red-400 border border-red-700">Failed</span>
                    ) : isPending ? (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-900/50 text-blue-400 border border-blue-700">Pending</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-900/50 text-gray-400 border border-gray-700">No data</span>
                    );

                    return (
                      <React.Fragment key={r.recording_id}>
                        <Table.Row className="bg-elevated border-elevated-border hover:bg-surface-600 [&:hover>td]:bg-surface-600 [&>td]:bg-elevated transition-colors">
                          <Table.Cell className="text-white">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{r.filename || `Recording #${r.recording_id}`}</span>
                              <span className="text-xs text-gray-500">ID: {r.recording_id}</span>
                              {isFailed && r.analysis_error && (
                                <span className="text-xs text-red-400 mt-1 max-w-[200px] truncate" title={r.analysis_error}>
                                  {r.analysis_error}
                                </span>
                              )}
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            {r.thumbnail_url ? (
                              <img
                                src={r.thumbnail_url}
                                alt={r.filename}
                                loading="lazy"
                                className="w-16 h-10 object-cover rounded border border-elevated-border"
                              />
                            ) : (
                              <div className="w-16 h-10 bg-surface-600 rounded flex items-center justify-center border border-elevated-border">
                                <VideoIcon size={16} className="text-gray-500" />
                              </div>
                            )}
                          </Table.Cell>
                          <Table.Cell>{statusBadge}</Table.Cell>
                          <Table.Cell className="text-gray-300">{r.duration || '—'}s</Table.Cell>
                          <Table.Cell className="text-gray-300">
                            {isAnalyzed ? `${topLabel} ${top ? `${(top[1] * 100).toFixed(0)}%` : ''}` : '—'}
                          </Table.Cell>
                          <Table.Cell className="text-gray-300">
                            {isAnalyzed ? `${((r.distribution?.happy || 0) * 100).toFixed(0)}%` : '—'}
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex gap-1">
                              {r.recording_url && (
                                <Button
                                  color="gray"
                                  size="xs"
                                  onClick={() => triggerDownload(r.recording_url, r.filename || `recording-${r.recording_id}.webm`)}
                                  title="Download recording"
                                >
                                  <Download size={14} />
                                </Button>
                              )}
                              <Button
                                color="light"
                                size="xs"
                                disabled={!isAnalyzed}
                                onClick={() => setExpanded(expanded === r.recording_id ? null : r.recording_id)}
                              >
                                {expanded === r.recording_id ? 'Hide' : 'Timeline'}
                              </Button>
                              {isAdmin && (
                              <Button
                                color="failure"
                                size="xs"
                                onClick={() => setDeleteTarget(r)}
                                title="Delete recording"
                              >
                                <Trash2 size={14} />
                              </Button>
                              )}
                            </div>
                          </Table.Cell>
                        </Table.Row>
                        {expanded === r.recording_id && (
                          <Table.Row className="bg-surface border-elevated-border [&>td]:bg-surface">
                            <Table.Cell colSpan={7}>
                              <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={r.timeline || []}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                  <XAxis dataKey="t" stroke="#9ca3af" tickFormatter={(t) => `${t}s`} />
                                  <YAxis stroke="#9ca3af" domain={[0, 1]} />
                                  <RTooltip formatter={(v) => `${(v * 100).toFixed(0)}%`} labelFormatter={(t) => `${t}s`} />
                                  <Legend />
                                  {EMOTIONS.map(e => (
                                    <Line
                                      key={e.key}
                                      type="monotone"
                                      dataKey={e.key}
                                      name={e.label}
                                      stroke={e.color}
                                      dot={false}
                                      isAnimationActive={false}
                                    />
                                  ))}
                                </LineChart>
                              </ResponsiveContainer>
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </React.Fragment>
                    );
                  })}
                </Table.Body>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal show={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} theme={{ content: { inner: 'relative flex max-h-[90dvh] flex-col rounded-lg bg-elevated shadow' } }}>
        <Modal.Header className="bg-elevated text-white border-b border-elevated-border rounded-t-xl">
          <span className="text-white">Delete Recording</span>
        </Modal.Header>
        <Modal.Body className="bg-elevated text-white">
          <p className="mb-2">Are you sure you want to delete this recording?</p>
          {deleteTarget && (
            <p className="text-gray-400 text-sm mb-4">
              &quot;{deleteTarget.filename || `Recording #${deleteTarget.recording_id}`}&quot;
            </p>
          )}
          <p className="text-red-400 text-sm">This action cannot be undone. All emotion analysis data for this recording will also be removed.</p>
        </Modal.Body>
        <Modal.Footer className="bg-elevated border-t border-elevated-border">
          <button onClick={handleDeleteRecording} disabled={deleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50" type="button">
            {deleting ? 'Deleting...' : 'Delete Permanently'}
          </button>
          <button onClick={() => !deleting && setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-300 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors" type="button">
            Cancel
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

function computeSegments(timeline) {
  if (!timeline || timeline.length === 0) return null;

  const byT = [...timeline].sort((a, b) => a.t - b.t);
  if (byT.length < 2) return null;

  const negativeEmotions = ['sad', 'angry', 'fear', 'disgust'];
  const windowed = [];

  for (let i = 0; i < byT.length; i++) {
    const start = byT[i].t;
    const end = start + WINDOW_SECONDS;
    const slice = byT.filter(p => p.t >= start && p.t <= end);
    if (slice.length === 0) continue;

    const happy = slice.reduce((s, p) => s + (p.happy || 0), 0) / slice.length;
    const negative = slice.reduce(
      (s, p) => s + negativeEmotions.reduce((sum, k) => sum + (p[k] || 0), 0),
      0
    ) / slice.length;

    windowed.push({ start, end, happy, negative, slice });
  }

  if (windowed.length === 0) return null;

  const best = windowed.reduce((a, b) =>
    b.happy > a.happy ? b : a
  );
  const worst = windowed.reduce((a, b) => {
    const aScore = a.happy - a.negative;
    const bScore = b.happy - b.negative;
    return bScore < aScore ? b : a;
  });

  return {
    best: { label: `${best.start}s – ${best.end}s`, happy: best.happy },
    worst: { label: `${worst.start}s – ${worst.end}s`, happy: worst.happy, negative: worst.negative },
  };
}

function triggerDownload(url, filename) {
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default DetailedAnalytics;
