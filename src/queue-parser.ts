import { QueueType, QueueEntry, QueueParseResult, CommandDetails, CompletionDetails } from './queue-types';

// NVMe Command Opcodes
const ADMIN_OPCODES: Record<number, string> = {
    0x00: "Delete I/O Submission Queue", 
    0x01: "Create I/O Submission Queue", 
    0x02: "Get Log Page",
    0x04: "Delete I/O Completion Queue", 
    0x05: "Create I/O Completion Queue", 
    0x06: "Identify",
    0x08: "Abort", 
    0x09: "Set Features", 
    0x0a: "Get Features", 
    0x0c: "Asynchronous Event Request",
    0x0d: "Namespace Management", 
    0x10: "Firmware Commit", 
    0x11: "Firmware Image Download",
    0x7c: "Format NVM", 
    0x80: "Security Send", 
    0x81: "Security Receive", 
    0x82: "Sanitize",
};

const IO_OPCODES: Record<number, string> = {
    0x00: "Flush", 
    0x01: "Write", 
    0x02: "Read", 
    0x04: "Write Uncorrectable", 
    0x05: "Compare",
    0x08: "Write Zeroes", 
    0x09: "Dataset Management",
};

const STATUS_CODES: Record<number, Record<number, string>> = {
    0: { // Generic Command Status
        0x00: "Successful Completion", 
        0x01: "Invalid Command Opcode", 
        0x02: "Invalid Field in Command",
        0x0B: "Invalid Namespace or Format",
    },
    1: { // Command Specific Status
        0x00: "Completion Queue Invalid", 
        0x01: "Invalid Queue Identifier", 
        0x02: "Invalid Queue Size",
    },
    2: { // Media and Data Integrity Errors
        0x80: "Write Fault", 
        0x81: "Unrecovered Read Error", 
        0x87: "Deallocated or Unwritten Logical Block",
    }
};

export function parseHexDumpToQueues(hexDump: string, queueType: QueueType): QueueParseResult {
    const hexString = cleanHexInput(hexDump);
    const entrySizeHex = (queueType === 'cq') ? 32 : 128; // 16 bytes for CQ, 64 bytes for SQ
    
    if (hexString.length === 0) {
        throw new Error("Input is empty or contains no valid hex data.");
    }
    
    if (hexString.length % entrySizeHex !== 0) {
        throw new Error(`Cleaned data length (${hexString.length/2} bytes) is invalid. It must be a multiple of the entry size (${entrySizeHex/2} bytes).`);
    }

    const entries: QueueEntry[] = [];
    
    for (let i = 0; i < hexString.length; i += entrySizeHex) {
        const entryHex = hexString.substring(i, i + entrySizeHex);
        const entryBytes = hexToBytes(entryHex);
        const index = i / entrySizeHex;

        if (queueType === 'admin_sq' || queueType === 'io_sq') {
            const queueTypeStr = queueType === 'admin_sq' ? 'admin' : 'io';
            const parsedCommand = parseCommand(entryBytes, queueTypeStr, index);
            entries.push(parsedCommand);
        } else if (queueType === 'cq') {
            const parsedCompletion = parseCompletion(entryBytes, index);
            entries.push(parsedCompletion);
        }
    }
    
    return {
        entries,
        queueType
    };
}

function cleanHexInput(rawText: string): string {
    const lines = rawText.trim().split('\n');
    let hexString = '';
    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        const dataPart = (colonIndex !== -1) ? line.substring(colonIndex + 1) : line;
        const cleanedPart = dataPart.replace(/[^0-9a-fA-F]/g, '');
        hexString += cleanedPart;
    }
    return hexString;
}

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

function getLeValue(bytes: Uint8Array, offset: number, length: number): number {
    let value = 0;
    for (let i = 0; i < length; i++) {
        if (bytes[offset + i] !== undefined) {
            value += bytes[offset + i] * Math.pow(256, i);
        }
    }
    return value;
}

function getLeU64(bytes: Uint8Array, offset: number): bigint {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
    return view.getBigUint64(0, true);
}

function parseCommand(commandBytes: Uint8Array, queueType: string, commandIndex: number): QueueEntry {
    const cdw0 = getLeValue(commandBytes, 0, 4);
    const opcode = cdw0 & 0xFF;
    const cid = (cdw0 >> 16) & 0xFFFF;
    const nsid = getLeValue(commandBytes, 4, 4);
    const dptr_prp1 = getLeU64(commandBytes, 24);
    const dptr_prp2 = getLeU64(commandBytes, 32);
    const opcodes = queueType === 'admin' ? ADMIN_OPCODES : IO_OPCODES;
    const opcodeName = opcodes[opcode] || "Unknown/Vendor Specific";
    
    let details: Record<string, any> = {
        "Opcode": `0x${opcode.toString(16).padStart(2, '0')} (${opcodeName})`,
        "Command ID (CID)": `${cid}`,
        "Namespace ID (NSID)": `0x${nsid.toString(16).padStart(8, '0')}`,
        "Data Pointer (DPTR)": {
            "PRP Entry 1": `0x${dptr_prp1.toString(16).padStart(16, '0')}`,
            "PRP Entry 2 / SGL": `0x${dptr_prp2.toString(16).padStart(16, '0')}`
        }
    };
    
    const cdw: number[] = [];
    for(let i=10; i<=15; i++) {
        cdw[i] = getLeValue(commandBytes, i*4, 4);
    }

    const cmdSpecific = {
        "CDW10": `0x${cdw[10].toString(16).padStart(8, '0')}`,
        "CDW11": `0x${cdw[11].toString(16).padStart(8, '0')}`,
        "CDW12": `0x${cdw[12].toString(16).padStart(8, '0')}`,
        "CDW13": `0x${cdw[13].toString(16).padStart(8, '0')}`,
        "CDW14": `0x${cdw[14].toString(16).padStart(8, '0')}`,
        "CDW15": `0x${cdw[15].toString(16).padStart(8, '0')}`,
        "Parsed": {}
    };

    if (queueType === 'admin') {
        switch(opcode) {
            case 0x01: // Create I/O SQ
                cmdSpecific.Parsed = parseCreateSq(cdw[10], cdw[11]); break;
            case 0x02: // Get Log Page
                cmdSpecific.Parsed = parseGetLogPage(cdw[10], cdw[11], cdw[12]); break;
            case 0x05: // Create I/O CQ
                cmdSpecific.Parsed = parseCreateCq(cdw[10], cdw[11]); break;
            case 0x06: // Identify
                cmdSpecific.Parsed = parseIdentify(cdw[10]); break;
            case 0x09: // Set Features
                cmdSpecific.Parsed = parseSetFeatures(cdw[10], cdw[11]); break;
            case 0x0a: // Get Features
                cmdSpecific.Parsed = parseGetFeatures(cdw[10]); break;
            case 0x7c: // Format NVM
                cmdSpecific.Parsed = parseFormatNvm(cdw[10]); break;
        }
    } else { // io
        switch(opcode) {
            case 0x01: // Write
            case 0x02: // Read
                cmdSpecific.Parsed = parseReadWrite(cdw[10], cdw[11], cdw[12]); break;
            case 0x09: // Dataset Management
                cmdSpecific.Parsed = { "Number of Ranges (NR)": `${cdw[10] & 0xFF} (${(cdw[10] & 0xFF) + 1} ranges)` }; break;
        }
    }
    
    details["Command Specific"] = cmdSpecific;
    return { index: commandIndex, title: opcodeName, details: details };
}

// Command-specific parsing functions
function parseIdentify(cdw10: number): Record<string, string> {
    const cns = cdw10 & 0xFF;
    const cnsValues: Record<number, string> = { 
        0x00: "Identify Namespace", 
        0x01: "Identify Controller", 
        0x02: "List of active NSIDs" 
    };
    return { "Controller/Namespace Structure (CNS)": `${cns} (${cnsValues[cns] || 'Reserved'})` };
}

function parseCreateCq(cdw10: number, cdw11: number): Record<string, string> {
    return {
        "Queue Identifier (QID)": `${cdw10 & 0xFFFF}`,
        "Queue Size (QSIZE)": `${(cdw10 >> 16) & 0xFFFF}`,
        "Physically Contiguous (PC)": `${cdw11 & 1}`,
        "Interrupts Enabled (IEN)": `${(cdw11 >> 1) & 1}`,
        "Interrupt Vector (IV)": `${(cdw11 >> 16) & 0xFFFF}`,
    };
}

function parseCreateSq(cdw10: number, cdw11: number): Record<string, string> {
    return {
        "Queue Identifier (QID)": `${cdw10 & 0xFFFF}`,
        "Queue Size (QSIZE)": `${(cdw10 >> 16) & 0xFFFF}`,
        "Physically Contiguous (PC)": `${cdw11 & 1}`,
        "Queue Priority (QPIO)": `${(cdw11 >> 1) & 0x3}`,
        "Completion Queue ID (CQID)": `${(cdw11 >> 16) & 0xFFFF}`,
    };
}

function parseGetFeatures(cdw10: number): Record<string, string> {
    const fid = cdw10 & 0xFF;
    const sel = (cdw10 >> 8) & 0x7;
    const fidValues: Record<number, string> = { 
        0x01: "Arbitration", 
        0x02: "Power Management", 
        0x05: "Number of Queues", 
        0x07: "Interrupt Coalescing" 
    };
    const selValues: Record<number, string> = { 
        0: "Current", 
        1: "Default", 
        2: "Saved", 
        3: "Supported capabilities" 
    };
    return {
        "Feature Identifier (FID)": `0x${fid.toString(16)} (${fidValues[fid] || 'Unknown'})`,
        "Select (SEL)": `${sel} (${selValues[sel] || 'Reserved'})`,
    };
}

function parseSetFeatures(cdw10: number, cdw11: number): Record<string, string | number> {
    const fid = cdw10 & 0xFF;
    const fidValues: Record<number, string> = { 
        0x01: "Arbitration", 
        0x02: "Power Management", 
        0x07: "Number of Queues" 
    };
    let parsed: Record<string, string | number> = { 
        "Feature Identifier (FID)": `0x${fid.toString(16)} (${fidValues[fid] || 'Unknown'})` 
    };
    if (fid === 0x07) { // Number of Queues
        parsed["Number of Submission Queues (NSQ)"] = cdw11 & 0xFFFF;
        parsed["Number of Completion Queues (NCQ)"] = (cdw11 >> 16) & 0xFFFF;
    }
    return parsed;
}

function parseGetLogPage(cdw10: number, cdw11: number, cdw12: number): Record<string, string> {
    const lid = cdw10 & 0xFF;
    const lidValues: Record<number, string> = { 
        0x01: "Error Information", 
        0x02: "SMART / Health", 
        0x03: "Firmware Slot" 
    };
    const numd = (cdw10 >> 16) & 0xFFF;
    const lpo = getLeU64(new Uint8Array(new Uint32Array([cdw11, cdw12]).buffer), 0);
    return {
        "Log Page ID (LID)": `${lid} (${lidValues[lid] || 'Reserved'})`,
        "Number of Dwords (NUMD)": `${numd + 1}`,
        "Log Page Offset (LPO)": `0x${lpo.toString(16)}`,
    };
}

function parseFormatNvm(cdw10: number): Record<string, string> {
    const ses = (cdw10 >> 5) & 0x7;
    const sesValues: Record<number, string> = { 
        0: "No secure erase", 
        1: "User Data Erase", 
        2: "Cryptographic Erase" 
    };
    return { "Secure Erase Settings (SES)": `${ses} (${sesValues[ses] || 'Reserved'})` };
}

function parseReadWrite(cdw10: number, cdw11: number, cdw12: number): Record<string, string> {
    const slba = getLeU64(new Uint8Array(new Uint32Array([cdw10, cdw11]).buffer), 0);
    const nlb = cdw12 & 0xFFFF;
    return {
        "Starting LBA (SLBA)": `0x${slba.toString(16).padStart(16, '0')}`,
        "Number of Logical Blocks (NLB)": `${nlb} (${nlb + 1} blocks)`,
        "Force Unit Access (FUA)": `${(cdw12 >> 30) & 1}`,
        "Limited Retry (LR)": `${(cdw12 >> 31) & 1}`,
    };
}

function parseCompletion(bytes: Uint8Array, index: number): QueueEntry {
    const dw0 = getLeValue(bytes, 0, 4); // Command Specific
    const dw2 = getLeValue(bytes, 8, 4);
    const dw3 = getLeValue(bytes, 12, 4);

    const sqhd = dw2 & 0xFFFF;
    const sqid = (dw2 >> 16) & 0xFFFF;

    const cid = dw3 & 0xFFFF;
    const p = (dw3 >> 16) & 1;
    const sc = (dw3 >> 17) & 0xFF;
    const sct = (dw3 >> 25) & 0x7;
    
    const sctText: Record<number, string> = {
        0: 'Generic', 
        1: 'Cmd Specific', 
        2: 'Media/Data', 
        7: 'Vendor'
    };
    const sctName = sctText[sct] || 'Reserved';
    const statusText = (STATUS_CODES[sct] && STATUS_CODES[sct][sc]) ? STATUS_CODES[sct][sc] : 'Unknown Status Code';
    const isError = sct !== 0 || sc !== 0;

    const details = {
        "Status": `${statusText} (SCT: ${sct}, SC: 0x${sc.toString(16).padStart(2, '0')})`,
        "Phase Tag (P)": p,
        "Command ID (CID)": cid,
        "SQ Identifier (SQID)": sqid,
        "SQ Head Pointer (SQHD)": sqhd,
        "DW0 (Command Specific)": `0x${dw0.toString(16).padStart(8, '0')}`,
    };
    
    return { index: index, title: 'Completion Entry', details: details, isError: isError };
}