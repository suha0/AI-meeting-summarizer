
import React, { useCallback, useState } from 'react';
import { FileIcon } from './icons/FileIcon';

interface FileUploadProps {
  onFileUpload: (content: string, name: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (file && (file.type === 'text/plain' || file.name.endsWith('.vtt'))) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileUpload(content, file.name);
      };
      reader.readAsText(file);
    } else {
      alert('Please upload a valid .txt or .vtt file.');
    }
  }, [onFileUpload]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFile(event.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleFile(event.target.files[0]);
    }
  };

  const openFileDialog = () => {
    document.getElementById('file-input')?.click();
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onClick={openFileDialog}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200 ${
        isDragging ? 'border-indigo-500 bg-slate-700/50' : 'border-slate-600 hover:border-slate-500'
      }`}
    >
      <input
        id="file-input"
        type="file"
        accept=".txt,.vtt"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex flex-col items-center text-slate-400">
        <FileIcon className="w-12 h-12 mb-3" />
        <p className="font-semibold">Drag & drop a file here</p>
        <p className="text-sm">or click to select a file</p>
        <p className="text-xs mt-1 text-slate-500">Supports .txt and .vtt</p>
      </div>
    </div>
  );
};
