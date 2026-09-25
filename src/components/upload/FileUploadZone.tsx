'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Mic, MicOff, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { UploadedDocument } from '@/types';
import { formatFileSize, cn } from '@/lib/utils';

interface FileUploadZoneProps {
  onDocumentAdded: (doc: UploadedDocument) => void;
  documents: UploadedDocument[];
  onDocumentRemoved: (id: string) => void;
}

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
};

type FileState = { id: string; name: string; status: 'uploading' | 'done' | 'error'; error?: string };

export default function FileUploadZone({ onDocumentAdded, documents, onDocumentRemoved }: FileUploadZoneProps) {
  const [fileStates, setFileStates] = useState<FileState[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');

  const processFile = useCallback(
    async (file: File) => {
      const tempId = uuidv4();
      setFileStates((prev) => [...prev, { id: tempId, name: file.name, status: 'uploading' }]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error ?? 'Upload failed');

        const doc: UploadedDocument = {
          id: uuidv4(),
          name: data.name,
          type: data.type,
          size: data.size,
          extractedText: data.extractedText,
          uploadedAt: new Date().toISOString(),
        };

        onDocumentAdded(doc);
        setFileStates((prev) => prev.map((f) => (f.id === tempId ? { ...f, status: 'done' } : f)));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setFileStates((prev) =>
          prev.map((f) => (f.id === tempId ? { ...f, status: 'error', error: msg } : f))
        );
      }
    },
    [onDocumentAdded]
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      accepted.forEach(processFile);
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 20 * 1024 * 1024,
  });

  const toggleVoice = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recording is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SR = win.webkitSpeechRecognition || win.SpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let fullTranscript = '';

    recognition.onresult = (event: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; [0]: { transcript: string } } } }) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          fullTranscript += result[0].transcript + ' ';
        } else {
          interim = result[0].transcript;
        }
      }
      setTranscript(fullTranscript + interim);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (fullTranscript.trim()) {
        const blob = new Blob([fullTranscript.trim()], { type: 'text/plain' });
        const file = new File([blob], `voice-note-${Date.now()}.txt`, { type: 'text/plain' });
        processFile(file);
      }
      setTranscript('');
    };

    setIsRecording(true);
    recognition.start();

    setTimeout(() => recognition.stop(), 5 * 60 * 1000);
  }, [isRecording, processFile]);

  const uploading = fileStates.some((f) => f.status === 'uploading');

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-[#1e2d40] hover:border-blue-500/50 hover:bg-blue-500/5',
          uploading && 'pointer-events-none opacity-60'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
            isDragActive ? 'bg-blue-500/20' : 'bg-[#0d1630]'
          )}>
            {uploading ? (
              <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
            ) : (
              <Upload className={cn('w-7 h-7', isDragActive ? 'text-blue-400' : 'text-slate-400')} />
            )}
          </div>
          <div>
            <p className="font-semibold text-slate-200 mb-1">
              {isDragActive ? 'Drop files here' : uploading ? 'Processing...' : 'Drop files or click to upload'}
            </p>
            <p className="text-sm text-slate-500">PDF, DOCX, XLSX, CSV, TXT — up to 20 MB each</p>
          </div>
        </div>
      </div>

      {/* Voice Recording */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#1e2d40]" />
        <span className="text-xs text-slate-500">or</span>
        <div className="flex-1 h-px bg-[#1e2d40]" />
      </div>

      <button
        type="button"
        onClick={toggleVoice}
        className={cn(
          'w-full flex items-center justify-center gap-3 py-3 rounded-xl border transition-all duration-200 text-sm font-medium',
          isRecording
            ? 'border-red-500 bg-red-500/10 text-red-400 animate-pulse-slow'
            : 'border-[#1e2d40] text-slate-400 hover:border-slate-500 hover:text-slate-300 hover:bg-white/5'
        )}
      >
        {isRecording ? (
          <>
            <MicOff className="w-4 h-4" />
            Recording — click to stop
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            Record voice note
          </>
        )}
      </button>

      {transcript && (
        <div className="bg-[#0d1630] border border-[#1e2d40] rounded-lg p-3 text-sm text-slate-300 italic">
          {transcript}
        </div>
      )}

      {/* In-progress uploads */}
      {fileStates.filter((f) => f.status !== 'done').length > 0 && (
        <div className="space-y-2">
          {fileStates
            .filter((f) => f.status !== 'done')
            .map((f) => (
              <div
                key={f.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border text-sm',
                  f.status === 'error'
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-[#1e2d40] bg-[#0d1630]'
                )}
              >
                {f.status === 'uploading' ? (
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span className="flex-1 text-slate-300 truncate">{f.name}</span>
                {f.error && <span className="text-red-400 text-xs">{f.error}</span>}
              </div>
            ))}
        </div>
      )}

      {/* Uploaded documents */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Uploaded Files</p>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-[#1e2d40] bg-[#0a1225] group"
            >
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <FileText className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{doc.name}</p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(doc.size)} · {doc.extractedText.length.toLocaleString()} chars extracted
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDocumentRemoved(doc.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 text-slate-500 hover:text-red-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
