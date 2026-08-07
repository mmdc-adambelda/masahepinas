import { describe, expect, it } from 'vitest';
import { parseCsv, parseCsvRecords } from './csv';

describe('parseCsv', () => {
  it('parses a simple comma-separated file', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields containing commas', () => {
    expect(parseCsv('name,address\n"Serenity Spa","123 Main St, Makati"')).toEqual([
      ['name', 'address'],
      ['Serenity Spa', '123 Main St, Makati'],
    ]);
  });

  it('handles doubled quotes as an escaped quote', () => {
    expect(parseCsv('name\n"The ""Best"" Spa"')).toEqual([['name'], ['The "Best" Spa']]);
  });

  it('handles a quoted field containing a newline', () => {
    expect(parseCsv('name,notes\n"Spa A","Line one\nLine two"')).toEqual([
      ['name', 'notes'],
      ['Spa A', 'Line one\nLine two'],
    ]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('strips a leading UTF-8 BOM', () => {
    expect(parseCsv('﻿a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('parseCsvRecords', () => {
  it('maps rows to objects keyed by the header row', () => {
    const records = parseCsvRecords(
      'business_name,city\nSerenity Spa,Makati\nBamboo Grove,QC',
    );
    expect(records).toEqual([
      { business_name: 'Serenity Spa', city: 'Makati' },
      { business_name: 'Bamboo Grove', city: 'QC' },
    ]);
  });

  it('fills missing trailing cells with an empty string', () => {
    const records = parseCsvRecords('a,b,c\n1,2');
    expect(records).toEqual([{ a: '1', b: '2', c: '' }]);
  });

  it('returns an empty array for an empty file', () => {
    expect(parseCsvRecords('')).toEqual([]);
  });
});
