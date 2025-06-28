import { useState, useCallback } from 'react';
import { FileSystem, FileSystemItem, CommandResult } from '../types/filesystem';

const createInitialFileSystem = (): FileSystem => {
  const now = new Date();
  return {
    root: {
      name: '',
      type: 'directory',
      children: {
        home: {
          name: 'home',
          type: 'directory',
          children: {
            user: {
              name: 'user',
              type: 'directory',
              children: {
                'welcome.txt': {
                  name: 'welcome.txt',
                  type: 'file',
                  content: 'Welcome to the Web CLI Terminal!\nType "help" to see available commands.',
                  created: now,
                  modified: now,
                },
                documents: {
                  name: 'documents',
                  type: 'directory',
                  children: {},
                  created: now,
                  modified: now,
                },
              },
              created: now,
              modified: now,
            },
          },
          created: now,
          modified: now,
        },
        tmp: {
          name: 'tmp',
          type: 'directory',
          children: {},
          created: now,
          modified: now,
        },
      },
      created: now,
      modified: now,
    },
    currentPath: ['home', 'user'],
  };
};

export const useFileSystem = () => {
  const [fileSystem, setFileSystem] = useState<FileSystem>(createInitialFileSystem);

  const getCurrentDirectory = useCallback((): FileSystemItem => {
    let current = fileSystem.root;
    for (const segment of fileSystem.currentPath) {
      if (current.children && current.children[segment]) {
        current = current.children[segment];
      } else {
        return fileSystem.root;
      }
    }
    return current;
  }, [fileSystem]);

  const getItemAtPath = useCallback((path: string[]): FileSystemItem | null => {
    let current = fileSystem.root;
    for (const segment of path) {
      if (current.children && current.children[segment]) {
        current = current.children[segment];
      } else {
        return null;
      }
    }
    return current;
  }, [fileSystem]);

  const resolvePath = useCallback((inputPath: string): string[] => {
    if (inputPath.startsWith('/')) {
      // Absolute path
      return inputPath.split('/').filter(Boolean);
    } else {
      // Relative path
      const segments = inputPath.split('/').filter(Boolean);
      const currentPath = [...fileSystem.currentPath];
      
      for (const segment of segments) {
        if (segment === '..') {
          if (currentPath.length > 0) {
            currentPath.pop();
          }
        } else if (segment !== '.') {
          currentPath.push(segment);
        }
      }
      
      return currentPath;
    }
  }, [fileSystem.currentPath]);

  const executeCommand = useCallback((input: string): CommandResult => {
    const args = input.trim().split(/\s+/);
    const command = args[0];
    
    if (!command) {
      return { output: '' };
    }

    const supportedCommands = ['mkdir', 'ls', 'cd', 'rmdir', 'rm', 'touch', 'mv', 'cp', 'curl', 'pwd', 'cat', 'help', 'clear'];
    
    if (!supportedCommands.includes(command)) {
      return {
        output: `Command not recognized: ${command}`,
        error: true,
      };
    }

    switch (command) {
      case 'help':
        return {
          output: `Available commands:
  mkdir <dirname>    - Create a directory
  ls [path]          - List directory contents
  cd <path>          - Change directory
  rmdir <dirname>    - Remove empty directory
  rm <filename>      - Remove file
  touch <filename>   - Create empty file
  mv <src> <dest>    - Move/rename file or directory
  cp <src> <dest>    - Copy file or directory
  curl <url>         - Fetch data from URL (simulated)
  pwd                - Print working directory
  cat <filename>     - Display file content
  clear              - Clear terminal
  help               - Show this help message`,
        };

      case 'clear':
        return { output: 'CLEAR_TERMINAL' };

      case 'pwd':
        return {
          output: '/' + fileSystem.currentPath.join('/'),
        };

      case 'ls': {
        const targetPath = args[1] ? resolvePath(args[1]) : fileSystem.currentPath;
        const targetDir = getItemAtPath(targetPath);
        
        if (!targetDir) {
          return {
            output: `ls: cannot access '${args[1]}': No such file or directory`,
            error: true,
          };
        }
        
        if (targetDir.type !== 'directory') {
          return {
            output: `ls: cannot access '${args[1]}': Not a directory`,
            error: true,
          };
        }
        
        // Ensure children exists and handle empty directories
        if (!targetDir.children || Object.keys(targetDir.children).length === 0) {
          return { output: '' };
        }
        
        const items = Object.values(targetDir.children)
          .filter(item => item && item.name) // Filter out any invalid items
          .sort((a, b) => {
            if (a.type !== b.type) {
              return a.type === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          })
          .map(item => {
            const prefix = item.type === 'directory' ? 'd' : '-';
            const size = item.type === 'file' ? (item.content?.length || 0).toString().padStart(8) : '     dir';
            const date = new Date(item.modified || item.created || new Date()).toLocaleDateString();
            const name = item.type === 'directory' ? `\x1b[34m${item.name}/\x1b[0m` : item.name;
            return `${prefix}rwxr-xr-x 1 user user ${size} ${date} ${name}`;
          });
        
        return { output: items.join('\n') };
      }

      case 'cd': {
        if (!args[1]) {
          setFileSystem(prev => ({ ...prev, currentPath: ['home', 'user'] }));
          return { output: '' };
        }
        
        const targetPath = resolvePath(args[1]);
        const targetDir = getItemAtPath(targetPath);
        
        if (!targetDir) {
          return {
            output: `cd: ${args[1]}: No such file or directory`,
            error: true,
          };
        }
        
        if (targetDir.type !== 'directory') {
          return {
            output: `cd: ${args[1]}: Not a directory`,
            error: true,
          };
        }
        
        setFileSystem(prev => ({ ...prev, currentPath: targetPath }));
        return { output: '' };
      }

      case 'mkdir': {
        if (!args[1]) {
          return {
            output: 'mkdir: missing operand',
            error: true,
          };
        }
        
        const currentDir = getCurrentDirectory();
        if (!currentDir.children) {
          return {
            output: 'mkdir: cannot create directory: Permission denied',
            error: true,
          };
        }
        
        if (currentDir.children[args[1]]) {
          return {
            output: `mkdir: cannot create directory '${args[1]}': File exists`,
            error: true,
          };
        }
        
        const now = new Date();
        setFileSystem(prev => {
          const newFileSystem = JSON.parse(JSON.stringify(prev));
          let current = newFileSystem.root;
          for (const segment of prev.currentPath) {
            current = current.children[segment];
          }
          current.children[args[1]] = {
            name: args[1],
            type: 'directory',
            children: {},
            created: now,
            modified: now,
          };
          current.modified = now; // Update parent directory's modified time
          return newFileSystem;
        });
        
        return { output: '' };
      }

      case 'touch': {
        if (!args[1]) {
          return {
            output: 'touch: missing file operand',
            error: true,
          };
        }
        
        const currentDir = getCurrentDirectory();
        if (!currentDir.children) {
          return {
            output: 'touch: cannot create file: Permission denied',
            error: true,
          };
        }
        
        const now = new Date();
        setFileSystem(prev => {
          const newFileSystem = JSON.parse(JSON.stringify(prev));
          let current = newFileSystem.root;
          for (const segment of prev.currentPath) {
            current = current.children[segment];
          }
          
          if (current.children[args[1]]) {
            current.children[args[1]].modified = now;
          } else {
            current.children[args[1]] = {
              name: args[1],
              type: 'file',
              content: '',
              created: now,
              modified: now,
            };
          }
          current.modified = now; // Update parent directory's modified time
          return newFileSystem;
        });
        
        return { output: '' };
      }

      case 'rm': {
        if (!args[1]) {
          return {
            output: 'rm: missing operand',
            error: true,
          };
        }
        
        const currentDir = getCurrentDirectory();
        if (!currentDir.children || !currentDir.children[args[1]]) {
          return {
            output: `rm: cannot remove '${args[1]}': No such file or directory`,
            error: true,
          };
        }
        
        if (currentDir.children[args[1]].type === 'directory') {
          return {
            output: `rm: cannot remove '${args[1]}': Is a directory`,
            error: true,
          };
        }
        
        setFileSystem(prev => {
          const newFileSystem = JSON.parse(JSON.stringify(prev));
          let current = newFileSystem.root;
          for (const segment of prev.currentPath) {
            current = current.children[segment];
          }
          delete current.children[args[1]];
          current.modified = new Date(); // Update parent directory's modified time
          return newFileSystem;
        });
        
        return { output: '' };
      }

      case 'rmdir': {
        if (!args[1]) {
          return {
            output: 'rmdir: missing operand',
            error: true,
          };
        }
        
        const currentDir = getCurrentDirectory();
        if (!currentDir.children || !currentDir.children[args[1]]) {
          return {
            output: `rmdir: failed to remove '${args[1]}': No such file or directory`,
            error: true,
          };
        }
        
        const targetDir = currentDir.children[args[1]];
        if (targetDir.type !== 'directory') {
          return {
            output: `rmdir: failed to remove '${args[1]}': Not a directory`,
            error: true,
          };
        }
        
        if (targetDir.children && Object.keys(targetDir.children).length > 0) {
          return {
            output: `rmdir: failed to remove '${args[1]}': Directory not empty`,
            error: true,
          };
        }
        
        setFileSystem(prev => {
          const newFileSystem = JSON.parse(JSON.stringify(prev));
          let current = newFileSystem.root;
          for (const segment of prev.currentPath) {
            current = current.children[segment];
          }
          delete current.children[args[1]];
          current.modified = new Date(); // Update parent directory's modified time
          return newFileSystem;
        });
        
        return { output: '' };
      }

      case 'cat': {
        if (!args[1]) {
          return {
            output: 'cat: missing file operand',
            error: true,
          };
        }
        
        const currentDir = getCurrentDirectory();
        if (!currentDir.children || !currentDir.children[args[1]]) {
          return {
            output: `cat: ${args[1]}: No such file or directory`,
            error: true,
          };
        }
        
        const file = currentDir.children[args[1]];
        if (file.type !== 'file') {
          return {
            output: `cat: ${args[1]}: Is a directory`,
            error: true,
          };
        }
        
        return { output: file.content || '' };
      }

      case 'curl': {
        if (!args[1]) {
          return {
            output: 'curl: no URL specified',
            error: true,
          };
        }
        
        const url = args[1];
        if (!url.match(/^https?:\/\//)) {
          return {
            output: 'curl: (1) Protocol not supported or disabled in libcurl',
            error: true,
          };
        }
        
        // Simulate different responses based on URL
        if (url.includes('api') || url.includes('json')) {
          return {
            output: JSON.stringify({
              message: "Simulated API response",
              url: url,
              timestamp: new Date().toISOString(),
              data: { id: 1, name: "Sample Data" }
            }, null, 2),
          };
        } else {
          return {
            output: `<!DOCTYPE html>
<html>
<head><title>Simulated Response</title></head>
<body>
<h1>Web CLI Terminal</h1>
<p>This is a simulated response for: ${url}</p>
<p>Timestamp: ${new Date().toLocaleString()}</p>
</body>
</html>`,
          };
        }
      }

      case 'mv': {
        if (!args[1] || !args[2]) {
          return {
            output: 'mv: missing file operand',
            error: true,
          };
        }
        
        const currentDir = getCurrentDirectory();
        if (!currentDir.children || !currentDir.children[args[1]]) {
          return {
            output: `mv: cannot stat '${args[1]}': No such file or directory`,
            error: true,
          };
        }
        
        if (currentDir.children[args[2]]) {
          return {
            output: `mv: cannot move '${args[1]}' to '${args[2]}': File exists`,
            error: true,
          };
        }
        
        setFileSystem(prev => {
          const newFileSystem = JSON.parse(JSON.stringify(prev));
          let current = newFileSystem.root;
          for (const segment of prev.currentPath) {
            current = current.children[segment];
          }
          
          current.children[args[2]] = { ...current.children[args[1]], name: args[2] };
          delete current.children[args[1]];
          current.modified = new Date(); // Update parent directory's modified time
          return newFileSystem;
        });
        
        return { output: '' };
      }

      case 'cp': {
        if (!args[1] || !args[2]) {
          return {
            output: 'cp: missing file operand',
            error: true,
          };
        }
        
        const currentDir = getCurrentDirectory();
        if (!currentDir.children || !currentDir.children[args[1]]) {
          return {
            output: `cp: cannot stat '${args[1]}': No such file or directory`,
            error: true,
          };
        }
        
        if (currentDir.children[args[2]]) {
          return {
            output: `cp: cannot create regular file '${args[2]}': File exists`,
            error: true,
          };
        }
        
        const sourceItem = currentDir.children[args[1]];
        if (sourceItem.type === 'directory') {
          return {
            output: `cp: -r not specified; omitting directory '${args[1]}'`,
            error: true,
          };
        }
        
        const now = new Date();
        setFileSystem(prev => {
          const newFileSystem = JSON.parse(JSON.stringify(prev));
          let current = newFileSystem.root;
          for (const segment of prev.currentPath) {
            current = current.children[segment];
          }
          
          current.children[args[2]] = {
            ...current.children[args[1]],
            name: args[2],
            created: now,
            modified: now,
          };
          current.modified = now; // Update parent directory's modified time
          return newFileSystem;
        });
        
        return { output: '' };
      }

      default:
        return {
          output: `Command not recognized: ${command}`,
          error: true,
        };
    }
  }, [fileSystem, getCurrentDirectory, getItemAtPath, resolvePath]);

  return {
    fileSystem,
    executeCommand,
    currentPath: fileSystem.currentPath,
  };
};