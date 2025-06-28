import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal as TerminalIcon, Globe } from 'lucide-react';
import { useFileSystem } from '../hooks/useFileSystem';

interface TerminalLine {
  type: 'input' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

export const Terminal: React.FC = () => {
  const { executeCommand, currentPath } = useFileSystem();
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      type: 'output',
      content: 'Welcome to Web CLI Terminal v1.0.0\nType "help" to see available commands.',
      timestamp: new Date(),
    },
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [lines, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentInput.trim()) return;

    const command = currentInput.trim();
    
    // Add command to history
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);
    
    // Add input line
    setLines(prev => [...prev, {
      type: 'input',
      content: command,
      timestamp: new Date(),
    }]);

    // Execute command
    const result = executeCommand(command);
    
    // Handle special clear command
    if (result.output === 'CLEAR_TERMINAL') {
      setLines([]);
    } else if (result.output) {
      setLines(prev => [...prev, {
        type: result.error ? 'error' : 'output',
        content: result.output,
        timestamp: new Date(),
      }]);
    }

    setCurrentInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentInput('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Basic tab completion for commands
      const commands = ['mkdir', 'ls', 'cd', 'rmdir', 'rm', 'touch', 'mv', 'cp', 'curl', 'pwd', 'cat', 'help', 'clear'];
      const input = currentInput.trim();
      const matches = commands.filter(cmd => cmd.startsWith(input));
      
      if (matches.length === 1) {
        setCurrentInput(matches[0] + ' ');
      } else if (matches.length > 1) {
        setLines(prev => [...prev, {
          type: 'output',
          content: matches.join('  '),
          timestamp: new Date(),
        }]);
      }
    }
  };

  const renderLine = (line: TerminalLine, index: number) => {
    const isInput = line.type === 'input';
    const isError = line.type === 'error';
    
    if (isInput) {
      return (
        <div key={index} className="flex items-start gap-2 font-mono">
          <span className="text-green-400 flex-shrink-0">
            user@webcli:/{currentPath.join('/')}$
          </span>
          <span className="text-white">{line.content}</span>
        </div>
      );
    }

    return (
      <div 
        key={index} 
        className={`font-mono whitespace-pre-wrap ${
          isError ? 'text-red-400' : 'text-gray-300'
        }`}
        dangerouslySetInnerHTML={{
          __html: line.content
            .replace(/\x1b\[34m(.*?)\x1b\[0m/g, '<span class="text-blue-400">$1</span>')
            .replace(/\x1b\[32m(.*?)\x1b\[0m/g, '<span class="text-green-400">$1</span>')
        }}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Terminal Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TerminalIcon size={20} className="text-green-400" />
            <Globe size={16} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-white font-semibold">Web CLI Terminal</h1>
            <p className="text-gray-400 text-sm">Interactive command-line interface</p>
          </div>
          <div className="ml-auto flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={terminalRef}
        className="flex-1 p-4 overflow-y-auto bg-gray-900"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="max-w-none">
          {lines.map((line, index) => renderLine(line, index))}
          
          {/* Current Input Line */}
          <form onSubmit={handleSubmit} className="flex items-start gap-2 font-mono mt-2">
            <span className="text-green-400 flex-shrink-0">
              user@webcli:/{currentPath.join('/')}$
            </span>
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-white outline-none border-none font-mono"
              autoComplete="off"
              spellCheck={false}
            />
          </form>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-4">
            <span>Commands: {commandHistory.length}</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              Online
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>Use ↑↓ for history</span>
            <span>Tab for completion</span>
            <span>Type "help" for commands</span>
          </div>
        </div>
      </div>
    </div>
  );
};