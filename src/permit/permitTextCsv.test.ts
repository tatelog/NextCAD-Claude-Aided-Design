import {it,expect} from 'vitest'
import {exportPermitTextCsv,importPermitTextCsv,textFields} from './permitTextCsv'
it('文字情報を引用符・カンマ・改行ごと往復できる',()=>{const id=textFields[0]!.id;const values={[id]:{value:'確認用,"法人"\n住所',from:'CSV'}};expect(importPermitTextCsv(exportPermitTextCsv(values))[id]?.value).toBe(values[id]!.value)})
it('不明IDと重複IDを拒否する',()=>{const csv=exportPermitTextCsv({});expect(()=>importPermitTextCsv(csv.replace(textFields[0]!.id,'unknown'))).toThrow();expect(()=>importPermitTextCsv(csv+'\r\n'+csv.split('\r\n')[1])).toThrow()})
it('空欄は転記対象から外れる',()=>{expect(importPermitTextCsv(exportPermitTextCsv({}))).toEqual({})})
