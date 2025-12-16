# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tb2zoho is a client-side web application that converts Tatra banka (Slovak bank) transaction exports into ZOHO-compatible CSV format. The app runs entirely in the browser - no server-side processing.

Live site: https://qsmd.github.io/tb2zoho

## Commands

```bash
# Install dependencies
npm install

# Run linting (ESLint with airbnb-base config)
npx eslint docs/
```

There are no tests configured (the test script just exits with an error).

## Architecture

All code is in `docs/` (GitHub Pages deployment directory):

- **tb2zoho.js** - Main entry point. Handles file input, dispatches to appropriate parser based on file type (XML or CSV), triggers download of converted file.

- **camt053sk.js** - Parses CAMT.053-SK XML format (bank statement XML export). Extracts transaction entries (`<Ntry>` elements) and converts to ZOHO CSV format with Date, Payee, Memo, Amount columns.

- **csv.js** - Parses account transaction CSV export format. Handles card transactions differently (extracts card number and payee from combined info field).

- **util.js** - Shared utilities: `Ntry` class for transaction data, XML element traversal helpers (`findElement`, `getElement`), date formatting, text cleanup.

## Input Formats

1. **XML (CAMT.053-SK)** - Standard bank statement format. Credit/debit determined by `<CdtDbtInd>` element.

2. **CSV** - Account transaction export. Column 4 contains "Debet"/"Credit" indicator, column 13 has transaction info that may include card number.

## Output Format

ZOHO-compatible CSV with columns: Date, Withdrawal, Deposits, Payee, Description, Reference Number
