import {create} from 'zustand'
import {z} from 'zod'
import type {SpecSelection} from '../estimate/specPackages'

export const SpecSelectionSchema=z.object({packageId:z.string(),version:z.string(),quantity:z.number().finite().nonnegative().optional(),heightMm:z.number().finite().positive().optional(),openingHeightMm:z.number().finite().nonnegative().optional(),price:z.object({value:z.number().finite().nonnegative(),status:z.enum(['公表値','仮値']),source:z.string().min(1),url:z.string(),date:z.string(),region:z.string(),scope:z.string().min(1)}).optional()})
export const useSpecSelections=create<{selections:Record<string,SpecSelection>;set:(id:string,selection:SpecSelection|null)=>void}>((set)=>({selections:{},set:(id,selection)=>set(s=>{const selections={...s.selections};if(selection)selections[id]=SpecSelectionSchema.parse(selection);else delete selections[id];return {selections}})}))
