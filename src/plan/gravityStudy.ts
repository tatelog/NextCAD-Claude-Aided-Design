/** 負担面積法と単純梁モデルの需要側概算。RC耐力・適合判定を返さない。 */
export function gravityStudy(i:{tributaryM2:number;floorsAbove:number;deadKNM2:number;liveKNM2:number;columnMm:number;fcMPa:number;beamSpanM:number;beamTributaryM:number}) {
 if(!Object.values(i).every(Number.isFinite)||i.tributaryM2<=0||i.floorsAbove<1||!Number.isInteger(i.floorsAbove)||i.deadKNM2<0||i.liveKNM2<0||i.columnMm<=0||i.fcMPa<=0||i.beamSpanM<=0||i.beamTributaryM<=0)throw new Error('荷重・材料・断面の入力を確認してください')
 const q=i.deadKNM2+i.liveKNM2,axialKN=q*i.tributaryM2*i.floorsAbove,averageMPa=axialKN*1000/(i.columnMm*i.columnMm),w=q*i.beamTributaryM
 return {axialKN,averageMPa,axialRatio:averageMPa/i.fcMPa,beamMomentKNM:w*i.beamSpanM**2/8,beamShearKN:w*i.beamSpanM/2}
}
