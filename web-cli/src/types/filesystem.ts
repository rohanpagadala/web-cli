export interface FileSystemItem {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: Record<string, FileSystemItem>;
  created: Date;
  modified: Date;
}

export interface FileSystem {
  root: FileSystemItem;
  currentPath: string[];
}

export interface CommandResult {
  output: string;
  error?: boolean;
}