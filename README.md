# NVMe BAR0 Parser & Viewer

[![CI](https://github.com/wipeseals/nvme-bar0-viewer/actions/workflows/ci.yml/badge.svg)](https://github.com/wipeseals/nvme-bar0-viewer/actions/workflows/ci.yml)
[![Publish to NPM](https://github.com/wipeseals/nvme-bar0-viewer/actions/workflows/publish.yml/badge.svg)](https://github.com/wipeseals/nvme-bar0-viewer/actions/workflows/publish.yml)
[![npm version](https://badge.fury.io/js/nvme-bar0-viewer.svg)](https://badge.fury.io/js/nvme-bar0-viewer)
[![npm downloads](https://img.shields.io/npm/dm/nvme-bar0-viewer.svg)](https://www.npmjs.com/package/nvme-bar0-viewer)

Parse and validate NVMe Controller Registers from BAR0 space dumps. Available as both web interface and CLI tool.

## 🌐 Web Interface

<https://wipeseals.github.io/nvme-bar0-viewer/>

## 📦 CLI Installation & Usage

### Using npx (Recommended)

```bash
# Parse hexdump from stdin
cat nvme_dump.txt | npx nvme-bar0-viewer

# Parse binary file
npx nvme-bar0-viewer nvme_registers.bin

# Output as JSON for further processing
npx nvme-bar0-viewer --json nvme_dump.txt | jq '.registers[0].name'

# Get help
npx nvme-bar0-viewer --help
```

### Global Installation

```bash
npm install -g nvme-bar0-viewer
nvme-bar0-viewer --help
```

### Package Information

- **NPM Package**: [nvme-bar0-viewer](https://www.npmjs.com/package/nvme-bar0-viewer)
- **Binary Name**: `nvme-bar0-viewer`
- **Releases**: Automated via GitHub releases
- **CI/CD**: Automatically published to NPM on release

## 📖 CLI Options

```
Usage:
  npx nvme-bar0-viewer [options] [file]
  cat hexdump.txt | npx nvme-bar0-viewer [options]

Options:
  -h, --help     Show help message
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
git clone https://github.com/wipeseals/nvme-bar0-viewer.git
cd nvme-bar0-viewer
npm install
npm run build

# Run tests
npm test

# Build web version
npm run build:web
```

### Project Structure

- `src/` - TypeScript source code
  - `core.ts` - Main parsing logic
  - `parser.ts` - NVMe register parsing and validation
  - `cli.ts` - Command-line interface
  - `types.ts` - TypeScript type definitions
- `web/` - Web interface files
- `tests/` - Test files
- `dist/` - Compiled JavaScript output

## 📋 Features

- **Comprehensive NVMe Register Parsing**: Supports all major BAR0 registers
- **Validation**: Checks register values against NVMe specification
- **Multiple Input Formats**: Hexdump, simple hex, and binary files
- **Multiple Output Formats**: Human-readable tables and JSON
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **No Dependencies**: Self-contained with minimal runtime dependencies

## 🚀 Use Cases

- **NVMe Driver Development**: Debug register states during driver development
- **Hardware Validation**: Verify NVMe controller register configurations
- **System Analysis**: Analyze NVMe controller state in production systems
- **Educational**: Learn about NVMe register structure and validation
- **Automated Testing**: Use JSON output with tools like `jq` for automated verification

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
