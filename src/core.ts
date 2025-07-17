import { ParseResult } from './types';
import { parseHexDump, parseBinaryFile, parseAndValidateNvmeRegisters } from './parser';

export * from './types';
export * from './parser';
export * from './queue-types';
export * from './queue-parser';

export function parseInput(input: string | Buffer): ParseResult {
  let bytes: Uint8Array;
  
  if (typeof input === 'string') {
    // Try to parse as hex dump
    bytes = parseHexDump(input);
  } else {
    // Parse as binary data
    bytes = parseBinaryFile(input);
  }
  
  if (bytes.length < 64) {
    throw new Error(`Data is insufficient. At least 64 bytes are required, but only ${bytes.length} were found.`);
  }
  
  const registers = parseAndValidateNvmeRegisters(bytes);
  
  return {
    registers,
    bytes
  };
}