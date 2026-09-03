import { useEffect, useRef, useState } from 'react';
import { PenLine, Type, Upload } from 'lucide-react';
import { SmartSpinner } from './loading/SmartSpinner';

const TYPED_FONTS = [
  { label: 'Dancing Script', family: 'Dancing Script, cursive' },
  { label: 'Sacramento', family: 'Sacramento, cursive' },
  { label: 'Alex Brush', family: 'Alex Brush, cursive' },
];

const loadGoogleFont = (fontFamily) => {
  if (typeof document === 'undefined') return;
  const fontName = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
  const fontId = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(fontId)) return;
  const link = document.createElement('link');
  link.id = fontId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}&display=swap`;
  document.head.appendChild(link);
};

const blobToPngFile = (blob, name) => new File([blob], name, { type: 'image/png' });

const flattenCanvas = (source) => {
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  out.getContext('2d').drawImage(source, 0, 0);
  return out;
};

const trimTransparent = (source) => {
  const ctx = source.getContext('2d');
  const { width, height } = source;
  const data = ctx.getImageData(0, 0, width, height).data;
  let top = height;
  let left = width;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 12) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (right < left || bottom < top) return source;
  const pad = 8;
  const cropX = Math.max(0, left - pad);
  const cropY = Math.max(0, top - pad);
  const cropW = Math.min(width - cropX, right - left + 1 + pad * 2);
  const cropH = Math.min(height - cropY, bottom - top + 1 + pad * 2);
  const trimmed = document.createElement('canvas');
  trimmed.width = cropW;
  trimmed.height = cropH;
  trimmed.getContext('2d').drawImage(source, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return trimmed;
};

const dataUrlToFile = (dataUrl, filename) => {
  const [header, body] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const bytes = atob(body);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) buffer[i] = bytes.charCodeAt(i);
  return new File([buffer], filename, { type: mime });
};

const canvasToFile = (canvas, filename) =>
  new Promise((resolve, reject) => {
    let exportCanvas = flattenCanvas(canvas);
    try {
      exportCanvas = trimTransparent(exportCanvas);
    } catch {
      // Keep the untrimmed copy if crop fails.
    }
    const finish = (blob) => {
      if (blob && blob.size > 0) {
        resolve(blobToPngFile(blob, filename));
        return;
      }
      try {
        resolve(dataUrlToFile(exportCanvas.toDataURL('image/png'), filename));
      } catch (err) {
        reject(err);
      }
    };
    if (typeof exportCanvas.toBlob === 'function') {
      exportCanvas.toBlob(finish, 'image/png');
      return;
    }
    finish(null);
  });

const SignatureDrawPad = ({ onApply, applying }) => {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const drawingRef = useRef(false);
  const lastRef = useRef(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const paint = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(180, wrap.clientWidth);
      const height = 132;
      if (canvas.width === Math.round(width * dpr) && canvas.height === Math.round(height * dpr)) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2.4;
      setEmpty(true);
    };

    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  const point = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastRef.current = point(event);
    setEmpty(false);
  };

  const onPointerMove = (event) => {
    if (!drawingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.4;
    const next = point(event);
    const prev = lastRef.current;
    if (!prev) {
      lastRef.current = next;
      return;
    }
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    lastRef.current = next;
  };

  const stopDrawing = () => {
    drawingRef.current = false;
    lastRef.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setEmpty(true);
  };

  const apply = async () => {
    if (!canvasRef.current || empty) return;
    try {
      const file = await canvasToFile(canvasRef.current, 'drawn-signature.png');
      onApply(file);
    } catch (err) {
      console.error('Failed to export drawn signature', err);
    }
  };

  return (
    <div className="space-y-2">
      <div ref={wrapRef} className="overflow-hidden rounded-md border border-slate-300 bg-white">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none cursor-crosshair"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
        />
      </div>
      <p className="text-[11px] text-slate-500">Sign with your mouse, trackpad, or finger.</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clear}
          className="h-9 flex-1 rounded-md border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Clear
        </button>
        <button
          type="button"
          disabled={empty || applying}
          onClick={apply}
          className={`h-9 flex-1 rounded-md text-xs font-semibold text-white ${empty || applying ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-900 hover:bg-blue-800'}`}
        >
          {applying ? (
            <SmartSpinner active variant="inline" light label="Saving signature">
              <span>Use signature</span>
            </SmartSpinner>
          ) : (
            'Use signature'
          )}
        </button>
      </div>
    </div>
  );
};

const renderTypedSignature = async (text, fontFamily) => {
  loadGoogleFont(fontFamily);
  const family = fontFamily.split(',')[0].trim();
  await document.fonts.load(`64px "${family}"`);
  await document.fonts.ready;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `64px "${family}", cursive`;
  const width = Math.ceil(measure.measureText(text).width) + 48;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(width, 80);
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  ctx.font = `64px "${family}", cursive`;
  ctx.fillStyle = '#111827';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return canvasToFile(canvas, 'typed-signature.png');
};

export const SignatureCapture = ({
  signature,
  uploading = false,
  onChangeSource,
  onApplyFile,
  onRemove,
  onUpdate,
}) => {
  const source = signature.signature_source || (signature.signature_image_url ? 'upload' : 'draw');
  const typedText = signature.typed_text ?? (signature.name && signature.name !== '[Name]' ? signature.name : '');
  const typedFont = signature.typed_font || TYPED_FONTS[0].family;
  const [typedError, setTypedError] = useState(null);

  useEffect(() => {
    TYPED_FONTS.forEach((font) => loadGoogleFont(font.family));
  }, []);

  const methods = [
    { id: 'draw', label: 'Draw', icon: PenLine },
    { id: 'type', label: 'Type', icon: Type },
    { id: 'upload', label: 'Upload', icon: Upload },
  ];

  const applyTyped = async () => {
    const text = typedText.trim();
    if (!text) {
      setTypedError('Type a name first');
      return;
    }
    setTypedError(null);
    try {
      const file = await renderTypedSignature(text, typedFont);
      onApplyFile(file, 'type');
    } catch (err) {
      setTypedError(err.message || 'Could not create typed signature');
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-slate-600">Signature method</p>
      <div className="grid grid-cols-3 gap-1 rounded-md bg-slate-100 p-1">
        {methods.map((method) => {
          const Icon = method.icon;
          const selected = source === method.id;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onChangeSource(method.id)}
              className={`flex h-9 items-center justify-center gap-1 rounded text-[11px] font-medium ${
                selected ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {method.label}
            </button>
          );
        })}
      </div>

      {source === 'draw' && (
        <SignatureDrawPad applying={uploading} onApply={(file) => onApplyFile(file, 'draw')} />
      )}

      {source === 'type' && (
        <div className="space-y-2">
          <input
            type="text"
            value={typedText}
            onChange={(event) => {
              setTypedError(null);
              onUpdate({ typed_text: event.target.value });
            }}
            placeholder="Type the name to sign"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-1 gap-1">
            {TYPED_FONTS.map((font) => (
              <button
                key={font.family}
                type="button"
                onClick={() => onUpdate({ typed_font: font.family })}
                className={`h-10 rounded-md border px-3 text-left text-lg ${
                  typedFont === font.family ? 'border-blue-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                }`}
                style={{ fontFamily: font.family }}
              >
                {typedText.trim() || font.label}
              </button>
            ))}
          </div>
          {typedError && <p className="text-xs text-red-600">{typedError}</p>}
          <button
            type="button"
            disabled={uploading || !typedText.trim()}
            onClick={applyTyped}
            className={`h-9 w-full rounded-md text-xs font-semibold text-white ${
              uploading || !typedText.trim() ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-900 hover:bg-blue-800'
            }`}
          >
            {uploading ? (
              <SmartSpinner active variant="inline" light label="Saving signature">
                <span>Use signature</span>
              </SmartSpinner>
            ) : (
              'Use this signature'
            )}
          </button>
        </div>
      )}

      {source === 'upload' && (
        <div className="space-y-2">
          <input
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onApplyFile(file, 'upload');
              event.target.value = '';
            }}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
          />
          <p className="text-[11px] text-slate-500">PNG or JPG. A scanned signature works best.</p>
          {uploading && (
            <SmartSpinner active variant="inline" label="Uploading signature">
              <span className="text-xs text-slate-600">Uploading</span>
            </SmartSpinner>
          )}
        </div>
      )}

      {signature.signature_image_url && (
        <div className="rounded-md border border-slate-200 bg-white p-2">
          <p className="mb-1 text-[11px] font-medium text-slate-500">Current signature</p>
          <img
            src={signature.signature_image_url}
            alt="Current signature"
            className="mx-auto max-h-16 object-contain"
            style={{ width: Math.min(220, signature.signature_image_width || 300) }}
          />
          <button
            type="button"
            onClick={onRemove}
            className="mt-1 w-full text-xs text-red-600 hover:text-red-700"
          >
            Remove signature
          </button>
        </div>
      )}

      <label className="block text-xs font-medium text-slate-600">
        Signature size: {signature.signature_image_width || 280}px
        <input
          type="range"
          min="80"
          max="900"
          step="10"
          value={signature.signature_image_width ?? 280}
          onChange={(event) => {
            const nextWidth = parseInt(event.target.value, 10);
            const prevWidth = signature.signature_image_width || 280;
            const prevHeight = signature.signature_image_height || Math.round(prevWidth / 3);
            const nextHeight = Math.max(32, Math.round(prevHeight * (nextWidth / prevWidth)));
            onUpdate({
              signature_image_width: nextWidth,
              signature_image_height: nextHeight,
            });
          }}
          className="mt-1 w-full"
        />
      </label>
    </div>
  );
};
