# NVMe Binary Data Parser & Viewer

[![CI](https://github.com/wipeseals/nvme-bin-viewer/actions/workflows/ci.yml/badge.svg)](https://github.com/wipeseals/nvme-bin-viewer/actions/workflows/ci.yml)
[![Publish to NPM](https://github.com/wipeseals/nvme-bin-viewer/actions/workflows/publish.yml/badge.svg)](https://github.com/wipeseals/nvme-bin-viewer/actions/workflows/publish.yml)
[![npm version](https://badge.fury.io/js/nvme-bin-viewer.svg)](https://badge.fury.io/js/nvme-bin-viewer)
[![npm downloads](https://img.shields.io/npm/dm/nvme-bin-viewer.svg)](https://www.npmjs.com/package/nvme-bin-viewer)

Comprehensive NVMe binary data parser and analyzer supporting both BAR0 register space and queue entry parsing. Available as both web interface and CLI tool.

## 🌐 Web Interface

<https://wipeseals.github.io/nvme-bin-viewer/>

## 📦 CLI Installation & Usage

### Using npx (Recommended)

```bash
# Parse BAR0 registers from hexdump
cat nvme_dump.txt | npx nvme-bin-viewer

# Parse binary file
npx nvme-bin-viewer nvme_registers.bin

# Output as JSON for further processing
npx nvme-bin-viewer --json nvme_dump.txt | jq '.registers[0].name'

# Get help
npx nvme-bin-viewer --help
```

### Global Installation

```bash
npm install -g nvme-bin-viewer
nvme-bin-viewer --help
```

### Package Information

- **NPM Package**: [nvme-bin-viewer](https://www.npmjs.com/package/nvme-bin-viewer)
- **Binary Name**: `nvme-bin-viewer`
- **Releases**: Automated via GitHub releases
- **CI/CD**: Automatically published to NPM on release

## 📖 CLI Options

```
Usage:
  npx nvme-bin-viewer [options] [file]
  cat hexdump.txt | npx nvme-bin-viewer [options]

Options:
  -h, --help     Show help message
  -v, --version  Show version information
  -j, --json     Output in JSON format (default: human-readable table)
  -f, --file     Input file (binary or hexdump format)

Examples:
  # Parse BAR0 registers from hexdump
  cat nvme_dump.txt | npx nvme-bin-viewer
  
  # Parse binary file
  npx nvme-bin-viewer nvme_registers.bin
  
  # Output as JSON
  npx nvme-bin-viewer --json nvme_dump.txt
  
  # Parse hexdump file
  npx nvme-bin-viewer -f hexdump.txt
```

## 📝 Input Formats

### Hexdump Format
```
00000000: ff ff 03 3c 30 00 00 00 00 04 01 00 00 00 00 00
00000010: 00 00 00 00 01 40 46 00 00 00 00 00 09 00 00 00
...
```

### Simple Hex Format
```
ff ff 03 3c 30 00 00 00 00 04 01 00 00 00 00 00
```

### Binary Files
Raw binary files containing NVMe register data are automatically detected and parsed.

## 🔧 Development

### Building from Source

```bash
git clone https://github.com/wipeseals/nvme-bin-viewer.git
cd nvme-bin-viewer
npm install
npm run build

# Run tests
npm test

# Build web version
npm run build:web
```

### Project Structure

- `src/` - TypeScript source code
  - `core.ts` - Main parsing logic and exports
  - `parser.ts` - NVMe register parsing and validation
  - `queue-parser.ts` - NVMe queue entry parsing
  - `queue-types.ts` - Queue parsing type definitions
  - `cli.ts` - Command-line interface
  - `types.ts` - TypeScript type definitions
- `web/` - Web interface files
- `tests/` - Test files
- `dist/` - Compiled JavaScript output

## 📋 Features

### BAR0 Register Analysis
- **Comprehensive NVMe Register Parsing**: Supports all major BAR0 registers
- **Validation**: Checks register values against NVMe specification
- **Multiple Input Formats**: Hexdump, simple hex, and binary files
- **Multiple Output Formats**: Human-readable tables and JSON

### Queue Entry Analysis  
- **Submission Queue Parsing**: Admin and I/O submission queue entries
- **Completion Queue Parsing**: Completion queue entries with status analysis
- **Command-Specific Parsing**: Detailed parsing for different NVMe command types
- **Sample Data**: Built-in sample data for testing and learning

### General Features
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **No Dependencies**: Self-contained with minimal runtime dependencies
- **Web & CLI**: Available as both web interface and command-line tool

## 🚀 Use Cases

### BAR0 Register Analysis
- **NVMe Driver Development**: Debug register states during driver development
- **Hardware Validation**: Verify NVMe controller register configurations
- **System Analysis**: Analyze NVMe controller state in production systems

### Queue Entry Analysis
- **Command Debugging**: Analyze NVMe commands and their parameters
- **Queue Monitoring**: Understand submission and completion queue behavior
- **Performance Analysis**: Study command patterns and completion status

### General Use Cases
- **Educational**: Learn about NVMe register structure and command format
- **Automated Testing**: Use JSON output with tools like `jq` for automated verification
- **Troubleshooting**: Debug NVMe-related issues in development and production

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
