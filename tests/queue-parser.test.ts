import { parseHexDumpToQueues } from '../src/queue-parser';

describe('NVMe Queue Parser', () => {
  describe('parseHexDumpToQueues', () => {
    const sampleAdminSqHex = `00000000: 06 00 00 00 01 00 00 00 00 00 00 00 00 00 00 00
00000010: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
00000020: 00 00 00 00 00 00 00 00 01 00 00 00 00 00 00 00
00000030: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00`;

    const sampleCqHex = `00000000: 00 00 00 00 00 00 00 00 00 00 01 00 00 00 01 00`;

    it('should parse Admin SQ entries correctly', () => {
      const result = parseHexDumpToQueues(sampleAdminSqHex, 'admin_sq');
      
      expect(result.entries).toHaveLength(1);
      expect(result.queueType).toBe('admin_sq');
      expect(result.entries[0].title).toBe('Identify');
      expect(result.entries[0].index).toBe(0);
      expect(result.entries[0].details.Opcode).toBe('0x06 (Identify)');
    });

    it('should parse CQ entries correctly', () => {
      const result = parseHexDumpToQueues(sampleCqHex, 'cq');
      
      expect(result.entries).toHaveLength(1);
      expect(result.queueType).toBe('cq');
      expect(result.entries[0].title).toBe('Completion Entry');
      expect(result.entries[0].index).toBe(0);
    });

    it('should throw error for invalid data length', () => {
      const invalidHex = 'invalid hex data';
      expect(() => {
        parseHexDumpToQueues(invalidHex, 'admin_sq');
      }).toThrow('Cleaned data length');
    });

    it('should throw error for empty input', () => {
      expect(() => {
        parseHexDumpToQueues('', 'admin_sq');
      }).toThrow('Input is empty or contains no valid hex data');
    });
  });
});