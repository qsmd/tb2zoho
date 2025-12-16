// CAMT.053-SK format parsing

/* eslint-disable import/extensions */
import {
  Ntry, findElement, getElement, getDate, stripCommasAndSpaces,
} from './util.js';

// default is mandatory, so I created unneded version property for that
const version = '0.1';
export default version;

function getDebitPayee(ntry) {
  const rltdpties = getElement('NtryDtls/TxDtls/RltdPties', ntry);
  if (!rltdpties) { return 'Bankove poplatky'; }

  let nameNode = getElement('TradgPty/Nm', rltdpties);
  if (!nameNode) { nameNode = getElement('Cdtr/Nm', rltdpties); }
  return nameNode ? stripCommasAndSpaces(nameNode.textContent) : '';
}

function getDebitIban(ntry) {
  const rltdpties = getElement('NtryDtls/TxDtls/RltdPties', ntry);
  if (!rltdpties) { return ''; }

  const ibanNode = getElement('CdtrAcct/Id/IBAN', rltdpties);
  return ibanNode ? stripCommasAndSpaces(ibanNode.textContent) : '';
}

function getCreditPayee(ntry) {
  const rltdpties = getElement('NtryDtls/TxDtls/RltdPties', ntry);
  if (!rltdpties) { return ''; }

  let nameNode = getElement('TradgPty/Nm', rltdpties);
  if (!nameNode) { nameNode = getElement('Dbtr/Nm', rltdpties); }
  return nameNode ? stripCommasAndSpaces(nameNode.textContent) : '';
}

function getCreditIban(ntry) {
  const rltdpties = getElement('NtryDtls/TxDtls/RltdPties', ntry);
  if (!rltdpties) { return ''; }

  // Try IBAN first, then fallback to Othr/Id (used for international payments)
  let ibanNode = getElement('DbtrAcct/Id/IBAN', rltdpties);
  if (!ibanNode) { ibanNode = getElement('DbtrAcct/Id/Othr/Id', rltdpties); }
  return ibanNode ? stripCommasAndSpaces(ibanNode.textContent) : '';
}

function getReferenceNumber(ntry) {
  const refNode = getElement('NtryDtls/TxDtls/Refs/EndToEndId', ntry);
  if (refNode) {
    const ref = refNode.textContent;
    const vsMatch = ref.match(/\/VS(\d+)/);
    if (vsMatch) {
      return vsMatch[1];
    }
    return stripCommasAndSpaces(ref);
  }

  // Fallback: check RmtInf/Ustrd for invoice number (international payments)
  const ustrdNode = getElement('NtryDtls/TxDtls/RmtInf/Ustrd', ntry);
  if (ustrdNode) {
    const ustrd = ustrdNode.textContent;
    // Look for patterns like "INVOICE NO. 2024230" or just extract numbers
    const invoiceMatch = ustrd.match(/(?:INVOICE\s*(?:NO\.?)?\s*)?(\d{5,})/i);
    if (invoiceMatch) {
      return invoiceMatch[1];
    }
  }

  return '';
}

function getUstrd(ntry, payee) {
  const ustrdNode = getElement('NtryDtls/TxDtls/RmtInf/Ustrd', ntry);
  if (!ustrdNode) { return ''; }

  const ustrd = ustrdNode.textContent;

  // Skip XML-like garbage with parentheses tags like (CdtrRefInf)(Tp)...
  if (/\([A-Za-z]+\)/.test(ustrd)) { return ''; }

  // Skip if contains both payee name and VS (redundant info)
  const hasPayee = payee && ustrd.toLowerCase().includes(payee.toLowerCase().split(' ')[0]);
  const hasVS = /VS|\d{6,}/.test(ustrd);
  if (hasPayee && hasVS) { return ''; }

  return stripCommasAndSpaces(ustrd);
}

function getEntry(ntry) {
  const isDebit = findElement(ntry, 'CdtDbtInd') === 'DBIT';
  const amount = findElement(ntry, 'Amt');
  const payee = isDebit ? getDebitPayee(ntry) : getCreditPayee(ntry);
  const iban = isDebit ? getDebitIban(ntry) : getCreditIban(ntry);
  const ustrd = getUstrd(ntry, payee);
  const description = [iban, ustrd].filter(Boolean).join(' ');
  return new Ntry(
    getDate(ntry),
    isDebit ? amount : '',
    isDebit ? '' : amount,
    payee,
    description,
    getReferenceNumber(ntry),
  );
}

export function xml2csv(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const ntrys = xml.getElementsByTagName('Ntry');
  let csv = 'Date;Withdrawals;Deposits;Payee;Description;Reference Number\n';
  for (let i = 0; i < ntrys.length; i += 1) {
    const ntry = getEntry(ntrys[i]);
    csv += [ntry.date, ntry.withdrawal, ntry.deposit, ntry.payee, ntry.description, ntry.referenceNumber].join(';');
    csv += '\n';
  }
  return csv;
}
