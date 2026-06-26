import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useStaff } from '../context/StaffContext.jsx';
import { apiUploadFile, apiListFiles, apiGetFile, apiDeleteFile } from '../services/api.js';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/csv', 'text/plain',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip', 'application/x-zip-compressed',
];

function fmtSize(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
function icon(type) {
  if (type.startsWith('image/')) return '🖼';
  if (type === 'application/pdf') return '📄';
  if (type.includes('sheet') || type.includes('excel') || type === 'text/csv') return '📊';
  if (type.includes('word')) return '📝';
  if (type.includes('zip')) return '🗜';
  return '📎';
}
function readAsDataUrl(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}

export default function SharedFiles() {
  const { user } = useAuth();
  const { staff } = useStaff();
  const me = user?.username || staff?.username || null;

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    try { setFiles(await apiListFiles()); } catch { /* noop */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (me) load(); }, [me, load]);

  if (!user && !staff) return <Navigate to="/admin/login" replace />;

  const upload = async (file) => {
    if (!file) return;
    setErr(null);
    if (!ALLOWED.includes(file.type)) { setErr('Unsupported file type.'); return; }
    if (file.size > MAX_BYTES) { setErr('File too large (max 2 MB on the free plan).'); return; }
    setBusy(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      await apiUploadFile({ name: file.name, type: file.type, dataUrl });
      await load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Upload failed.');
    } finally { setBusy(false); }
  };

  const download = async (f) => {
    try {
      const full = await apiGetFile(f.id);
      const a = document.createElement('a');
      a.href = full.dataUrl; a.download = full.name; a.click();
    } catch { setErr('Could not download file.'); }
  };

  const remove = async (f) => {
    if (!window.confirm(`Delete “${f.name}”?`)) return;
    try { await apiDeleteFile(f.id); load(); } catch (e) { setErr(e.response?.data?.error || 'Could not delete.'); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="label">Workspace · Files</div>
          <h1 className="font-display text-5xl tracking-tightest leading-none mt-2">Shared files</h1>
          <p className="text-sm text-graphite mt-2">Share reports, exports and documents with your team. Up to 2 MB per file.</p>
        </div>
        <Link to={user ? '/admin' : '/staff'} className="btn-secondary text-sm">← Back</Link>
      </div>

      {err && <div className="mb-4 p-3 border border-accent bg-accent/5 text-accent-deep text-sm">{err}</div>}

      {/* Upload dropzone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files?.[0]); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors mb-8 ${dragOver ? 'border-ink bg-cream' : 'border-rule hover:border-ink'}`}
      >
        <input ref={inputRef} type="file" accept={ALLOWED.join(',')} onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }} className="hidden" />
        <div className="text-3xl mb-2">⬆</div>
        <div className="text-sm font-medium">{busy ? 'Uploading…' : 'Drag & drop a file, or click to choose'}</div>
        <div className="text-xs text-graphite mt-1">Images, PDF, CSV, Excel, Word, ZIP · max 2 MB</div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-graphite animate-pulse">Loading…</div>
      ) : files.length === 0 ? (
        <div className="py-12 text-center border border-rule bg-cream">
          <div className="font-display text-3xl text-ash">No files yet</div>
        </div>
      ) : (
        <div className="border border-rule divide-y divide-rule">
          {files.map(f => (
            <div key={f.id} className="px-4 py-3 flex items-center gap-4 text-sm">
              <span className="text-xl">{icon(f.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{f.name}</div>
                <div className="text-xs text-graphite">{fmtSize(f.size)} · {new Date(f.createdAt).toLocaleDateString()}</div>
              </div>
              <button onClick={() => download(f)} className="btn-secondary text-xs px-3">Download</button>
              <button onClick={() => remove(f)} className="text-xs text-accent hover:underline">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
