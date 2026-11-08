import {create} from 'zustand'
import type {ValueMap} from '../law/permitFormPlan'
// 個人情報をブラウザ永続領域へ自動保存しない。CSVを利用者が保管する。
export const usePermitText=create<{values:ValueMap;setValues:(values:ValueMap)=>void}>(set=>({values:{},setValues:values=>set({values})}))
