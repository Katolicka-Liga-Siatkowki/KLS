import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {zipSync,strToU8,unzipSync} from 'fflate';

globalThis.__rosterUnzip=unzipSync;
const stub='data:text/javascript;base64,'+Buffer.from('export const unzipSync=globalThis.__rosterUnzip').toString('base64');
const source=ts.transpileModule(readFileSync(new URL('../lib/roster-import.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace("from 'fflate'",`from '${stub}'`);
const {extractRosterPlayers}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('extracts and cleans player names from text and CSV files',()=>{
 assert.deepEqual(extractRosterPlayers('sklad.txt',strToU8('Lp.\n1. Jan Kowalski\n2. Anna Nowak\nJan Kowalski')),['Jan Kowalski','Anna Nowak']);
 assert.deepEqual(extractRosterPlayers('sklad.csv',strToU8('nr;imię;nazwisko\n1;Piotr;Zieliński\n2;Maria;Dąbrowska')),['Piotr Zieliński','Maria Dąbrowska']);
});

test('extracts player names from DOCX paragraphs',()=>{
 const xml='<w:document><w:body><w:p><w:r><w:t>Imię i nazwisko</w:t></w:r></w:p><w:p><w:r><w:t>Jan Kowalski</w:t></w:r></w:p><w:p><w:r><w:t>Anna Nowak</w:t></w:r></w:p></w:body></w:document>';
 const file=zipSync({'word/document.xml':strToU8(xml)});
 assert.deepEqual(extractRosterPlayers('sklad.docx',file),['Jan Kowalski','Anna Nowak']);
});

test('extracts player names from XLSX shared strings',()=>{
 const shared='<sst><si><t>Imię i nazwisko</t></si><si><t>Jan Kowalski</t></si><si><t>Anna Nowak</t></si></sst>';
 const sheet='<worksheet><sheetData><row><c t="s"><v>0</v></c></row><row><c t="s"><v>1</v></c></row><row><c t="s"><v>2</v></c></row></sheetData></worksheet>';
 const file=zipSync({'xl/sharedStrings.xml':strToU8(shared),'xl/worksheets/sheet1.xml':strToU8(sheet)});
 assert.deepEqual(extractRosterPlayers('sklad.xlsx',file),['Jan Kowalski','Anna Nowak']);
});

test('rejects unsupported automatic import formats',()=>assert.throws(()=>extractRosterPlayers('sklad.pdf',new Uint8Array([1,2,3])),/DOCX/));
