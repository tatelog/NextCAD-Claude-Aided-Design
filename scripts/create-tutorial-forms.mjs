import JSZip from 'jszip';
import {mkdir,writeFile} from 'node:fs/promises';
const xml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const samples=[['F2','第二号様式',['確認申請書（建築物）','（第一面）','申請者氏名','設計者氏名','（第三面）','【1.地名地番】','【2.住居表示】']],['F3','第三号様式',['建築計画概要書','（第二面）','【1.地名地番】','【2.住居表示】']]];
await mkdir('evidence/legacy-tutorial-forms',{recursive:true});
for(const [id,title,rows] of samples){
const z=new JSZip();
z.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
z.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
z.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+[title,'チュートリアル練習用・提出不可','独自作成の抜粋です。正式な申請様式ではありません。',...rows].map(t=>'<w:p><w:pPr><w:spacing w:after="240"/></w:pPr><w:r><w:rPr><w:rFonts w:eastAsia="游ゴシック"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">'+xml(t)+'</w:t></w:r></w:p>').join('')+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000"/></w:sectPr></w:body></w:document>');
await writeFile(`evidence/legacy-tutorial-forms/tutorial-${id}.docx`,await z.generateAsync({type:'nodebuffer'}));
}
