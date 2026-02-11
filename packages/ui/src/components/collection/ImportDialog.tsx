'use client';

import { useState, useCallback, useRef } from 'react';
import { Modal } from '../Modal';
import { cn } from '../../utils';

export interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportProject: (json: string) => void;
  onImportPtex: (json: string) => void;
}

type ImportStatus = 'idle' | 'success' | 'error';

export function ImportDialog({
  isOpen,
  onClose,
  onImportProject,
  onImportPtex,
}: ImportDialogProps) {
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setStatus('idle');
      setStatusMessage('');

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (file.name.endsWith('.ptex.json')) {
          // Validate ptex format
          if (parsed.format !== 'procedural-texture' || parsed.version !== 1) {
            throw new Error('Invalid .ptex.json file: missing format or version');
          }
          onImportPtex(text);
          setStatus('success');
          setStatusMessage(`Imported procedural texture: ${parsed.name || file.name}`);
        } else if (file.name.endsWith('.tidkit.json')) {
          // Validate project format
          if (!parsed.params || !parsed.name) {
            throw new Error('Invalid .tidkit.json file: missing params or name');
          }
          onImportProject(text);
          setStatus('success');
          setStatusMessage(`Imported project: ${parsed.name || file.name}`);
        } else {
          throw new Error('Unsupported file type. Use .tidkit.json or .ptex.json files.');
        }
      } catch (err) {
        setStatus('error');
        setStatusMessage(
          err instanceof Error ? err.message : 'Failed to import file',
        );
      }
    },
    [onImportProject, onImportPtex],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [processFile],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import File"
      description="Import .tidkit.json project files or .ptex.json procedural texture presets"
      size="md"
    >
      <div className="p-6">
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
            dragOver
              ? 'border-tidkit-500 bg-tidkit-50'
              : 'border-gray-300 hover:border-gray-400',
          )}
        >
          <svg
            className="w-10 h-10 mx-auto text-gray-400 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm font-medium text-gray-700">
            Drag and drop a file here, or click to browse
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Supports .tidkit.json and .ptex.json
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Status message */}
        {status !== 'idle' && (
          <div
            className={cn(
              'mt-4 p-3 rounded-lg text-sm',
              status === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700',
            )}
          >
            {statusMessage}
          </div>
        )}
      </div>
    </Modal>
  );
}
