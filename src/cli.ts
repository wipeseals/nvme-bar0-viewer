#!/usr/bin/env node

import * as fs from 'fs';
import * as process from 'process';
import { parseInput, ParseResult, Register, RegisterField, toHex } from './core';

interface CliOptions {
  format: 'json' | 'table';
  help: boolean;
  version: boolean;
  file?: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    format: 'table',
    help: false,
    version: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '-v':
      case '--version':
        options.version = true;
        break;
      case '-j':
      case '--json':
        options.format = 'json';
        break;
      case '-f':
      case '--file':
        options.file = args[++i];
        break;
      default:
        if (!arg.startsWith('-')) {
          options.file = arg;
        } else {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
NVMe BAR0 Space Parser CLI

Usage:
  npx nvme-bar0-viewer [options] [file]
  cat hexdump.txt | npx nvme-bar0-viewer [options]

Options:
  -h, --help     Show this help message
  -v, --version  Show version information
  -j, --json     Output in JSON format (default: human-readable table)
  -f, --file     Input file (binary or hexdump format)

Examples:
  # Parse hexdump from stdin
  cat nvme_dump.txt | npx nvme-bar0-viewer
  
  # Parse binary file
  npx nvme-bar0-viewer nvme_registers.bin
  
  # Output as JSON
  npx nvme-bar0-viewer --json nvme_dump.txt
  
  # Parse hexdump file
  npx nvme-bar0-viewer -f hexdump.txt

Input formats:
  - Hexdump format: "00000000: ff 3f 01 14 30 00 00 00 ..."
  - Binary files: raw binary data
`);
}

function showVersion(): void {
  const packageJson = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8'));
  console.log(`nvme-bar0-viewer version ${packageJson.version}`);
}

async function readInput(options: CliOptions): Promise<string | Buffer> {
  if (options.file) {
    // Read from file
    const buffer = fs.readFileSync(options.file);
    
    // Check if it's binary or text
    const isText = buffer.every(byte => 
      (byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13
    );
    
    if (isText) {
      return buffer.toString('utf8');
    } else {
      return buffer;
    }
  } else {
    // Read from stdin
    return new Promise((resolve, reject) => {
      let input = '';
      const chunks: Buffer[] = [];
      
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => {
        if (typeof chunk === 'string') {
          input += chunk;
        } else {
          chunks.push(chunk);
        }
      });
      
      process.stdin.on('end', () => {
        if (input) {
          resolve(input);
        } else if (chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error('No input provided'));
        }
      });
      
      process.stdin.on('error', reject);
    });
  }
}

function formatAsJson(result: ParseResult): string {
  // Convert bigint values to strings for JSON serialization
  const serializable = {
    registers: result.registers.map(reg => ({
      ...reg,
      value: typeof reg.value === 'bigint' ? reg.value.toString() : reg.value,
      fields: reg.fields?.map(field => ({
        ...field,
        raw: typeof field.raw === 'bigint' ? field.raw.toString() : field.raw
      }))
    })),
    totalBytes: result.bytes.length
  };
  
  return JSON.stringify(serializable, null, 2);
}

function formatAsTable(result: ParseResult): string {
  let output = '';
  
  // Header
  output += '\\n' + '='.repeat(80) + '\\n';
  output += 'NVMe BAR0 Space Parser Results\\n';
  output += '='.repeat(80) + '\\n';
  output += `Total bytes parsed: ${result.bytes.length}\\n\\n`;
  
  result.registers.forEach(reg => {
    // Register header
    output += `\\n[${toHex(reg.offset, 2)}] ${reg.name} - ${reg.description}\\n`;
    output += '-'.repeat(60) + '\\n';
    
    // Register value
    const valueStr = typeof reg.value === 'bigint' ? 
      toHex(reg.value, 16) : 
      (typeof reg.value === 'number' ? toHex(reg.value, 8) : reg.value);
    output += `Value: ${valueStr}\\n`;
    
    // Raw bytes
    const regBytes = Array.from(result.bytes.slice(reg.offset, reg.offset + reg.size))
      .map(b => b.toString(16).padStart(2, '0')).join(' ');
    output += `Bytes: ${regBytes}\\n`;
    
    // Validation messages for register
    if (reg.validation && reg.validation.length > 0) {
      output += '\\nRegister Validation:\\n';
      reg.validation.forEach(v => {
        const icon = v.level === 'error' ? '❌' : v.level === 'warning' ? '⚠️' : 'ℹ️';
        output += `  ${icon} ${v.level.toUpperCase()}: ${v.message}\\n`;
      });
    }
    
    // Fields
    if (reg.fields && reg.fields.length > 0) {
      output += '\\nFields:\\n';
      reg.fields.forEach(field => {
        const rawStr = field.name.startsWith('Reserved') ? '-' : toHex(field.raw, 2);
        output += `  ${field.name.padEnd(12)} [${field.bits.padEnd(8)}] = ${rawStr}`;
        if (field.value) {
          output += ` (${field.value})`;
        }
        output += '\\n';
        
        // Field validation
        if (field.validation && field.validation.length > 0) {
          field.validation.forEach(v => {
            const icon = v.level === 'error' ? '❌' : v.level === 'warning' ? '⚠️' : 'ℹ️';
            output += `    ${icon} ${v.level.toUpperCase()}: ${v.message}\\n`;
          });
        }
      });
    }
    
    output += '\\n';
  });
  
  return output;
}

async function main(): Promise<void> {
  try {
    const options = parseArgs();
    
    if (options.help) {
      showHelp();
      return;
    }
    
    if (options.version) {
      showVersion();
      return;
    }
    
    const input = await readInput(options);
    const result = parseInput(input);
    
    if (options.format === 'json') {
      console.log(formatAsJson(result));
    } else {
      console.log(formatAsTable(result));
    }
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}