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

  const ibanNode = getElement('DbtrAcct/Id/IBAN', rltdpties);
  return ibanNode ? stripCommasAndSpaces(ibanNode.textContent) : '';
}

function getReferenceNumber(ntry) {
  const refNode = getElement('NtryDtls/TxDtls/Refs/EndToEndId', ntry);
  if (!refNode) { return ''; }

  const ref = refNode.textContent;
  const vsMatch = ref.match(/\/VS(\d+)/);
  if (vsMatch) {
    return vsMatch[1];
  }
  return stripCommasAndSpaces(ref);
}

function getEntry(ntry) {
  const isDebit = findElement(ntry, 'CdtDbtInd') === 'DBIT';
  const amount = findElement(ntry, 'Amt');
  const payee = isDebit ? getDebitPayee(ntry) : getCreditPayee(ntry);
  const iban = isDebit ? getDebitIban(ntry) : getCreditIban(ntry);
  return new Ntry(
    getDate(ntry),
    isDebit ? amount : '',
    isDebit ? '' : amount,
    payee,
    iban,
    getReferenceNumber(ntry),
  );
}

export function xml2csv(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const ntrys = xml.getElementsByTagName('Ntry');
  let csv = 'Date,Withdrawal,Deposits,Payee,Description,Reference Number\n';
  for (let i = 0; i < ntrys.length; i += 1) {
    const ntry = getEntry(ntrys[i]);
    csv += [ntry.date, ntry.withdrawal, ntry.deposit, ntry.payee, ntry.description, ntry.referenceNumber].join(',');
    csv += '\n';
  }
  return csv;
}
