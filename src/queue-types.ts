export type QueueType = 'admin_sq' | 'io_sq' | 'cq';

export interface QueueField {
  name: string;
  value: string | number;
}

export interface QueueEntry {
  index: number;
  title: string;
  details: Record<string, any>;
  isError?: boolean;
}

export interface QueueParseResult {
  entries: QueueEntry[];
  queueType: QueueType;
}

export interface CommandDetails {
  opcode: number;
  cid: number;
  nsid: number;
  dptr_prp1: bigint;
  dptr_prp2: bigint;
  cdw: number[];
}

export interface CompletionDetails {
  status: string;
  phaseTag: number;
  cid: number;
  sqid: number;
  sqhd: number;
  dw0: number;
  isError: boolean;
}