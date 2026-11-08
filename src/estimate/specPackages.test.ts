import {describe, expect, it} from 'vitest'
import {packageLine, packageOptions, packageTotal,changePackage,PACKAGE_VERSION} from './specPackages'

describe('部材と仕様パッケージの見積', () => {
  it('仕様変更でも数量条件を保持し、旧仕様の単価を引き継がない',()=>{
    const next=changePackage({packageId:'PKG-026',version:PACKAGE_VERSION,quantity:2,heightMm:2400,price:{value:1,status:'仮値',source:'旧仕様',url:'',date:'',region:'',scope:'旧範囲'}},'PKG-027')
    expect(next.quantity).toBe(2)
    expect(next.heightMm).toBe(2400)
    expect(next.price).toBeUndefined()
  })
  it('配置したキッチンに対応する候補だけを選ぶ', () => {
    const options = packageOptions({id:'1F/U1/K1',part:'キッチン',quantity:1,unit:'台'})
    expect(options.some(p=>p.id==='PKG-026')).toBe(true)
    expect(options.some(p=>p.id==='PKG-030')).toBe(false)
  })
  it('部材数量と選択単価から金額を出し仮値と出典を保持する', () => {
    const line=packageLine({id:'1F/U1/K1',part:'キッチン',quantity:1,unit:'台'},'PKG-026')
    expect(line.amount).toBe(300000)
    expect(line.priceStatus).toBe('仮値')
    expect(line.source).toContain('独自')
    expect(line.objectId).toBe('1F/U1/K1')
  })
  it('面積変更を反映し、寸法不足をゼロ扱いしない', () => {
    expect(packageLine({id:'R1',part:'床',quantity:12,unit:'m2'},'PKG-014').amount).toBe(114000)
    const unknown=packageLine({id:'W1',part:'窓',quantity:null,unit:'m2'},'PKG-025')
    expect(unknown.amount).toBeNull()
    expect(packageTotal([unknown]).incomplete).toBe(true)
  })
  it('違う部材の仕様と不正数量を拒否する', () => {
    expect(()=>packageLine({id:'K1',part:'キッチン',quantity:1,unit:'台'},'PKG-030')).toThrow()
    expect(()=>packageLine({id:'K1',part:'キッチン',quantity:-1,unit:'台'},'PKG-026')).toThrow()
  })
})
