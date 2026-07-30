import type { SetuAttachment } from '@setu/shared';
import { useRef, useState } from 'react';
import { prepareAudio, prepareImage, uploadMedia, type PreparedMedia } from '../lib/media';
import { useSyncStore } from '../store/syncStore';

export function AttachmentComposer({
  value,
  onChange,
}: {
  value?: SetuAttachment;
  onChange: (attachment: SetuAttachment | undefined) => void;
}) {
  const nodeUrl = useSyncStore((state) => state.nodeUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout>>();
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');

  async function accept(media: PreparedMedia): Promise<void> {
    onChange(media.att);
    void uploadMedia(media, nodeUrl);
  }

  async function choose(file?: File): Promise<void> {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await accept(await prepareImage(file));
    } catch {
      setError('Image could not be compressed below 150 KB.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecording(): Promise<void> {
    if (recorderRef.current && recording) {
      recorderRef.current.stop();
      return;
    }
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : undefined,
        audioBitsPerSecond: 24_000,
      });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        clearTimeout(stopTimer.current);
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setBusy(true);
        void prepareAudio(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
          .then(accept)
          .catch(() => setError('Voice note must be under 30 seconds / 100 KB.'))
          .finally(() => setBusy(false));
      };
      recorder.start();
      setRecording(true);
      stopTimer.current = setTimeout(() => recorder.stop(), 30_000);
    } catch {
      setError('Microphone permission is needed for a voice note.');
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="min-h-11 flex-1 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink"
        >
          📷 Photo
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggleRecording()}
          className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold ${recording ? 'bg-need text-white' : 'border border-line bg-surface text-ink'}`}
        >
          {recording ? '■ Stop' : '🎙️ Voice'}
        </button>
      </div>
      {value && (
        <div className="mt-2 flex items-center justify-between text-xs text-safe">
          <span>{value.k === 'img' ? 'Photo' : 'Voice note'} ready · {Math.ceil(value.sz / 1024)} KB</span>
          <button type="button" onClick={() => onChange(undefined)} className="text-need">Remove</button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-need">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void choose(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
