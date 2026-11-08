import {create} from 'zustand'
import {z} from 'zod'
export const BimSettingsSchema=z.object({estimated:z.boolean(),dimensions:z.object({exteriorWallMm:z.number().positive(),partitionWallMm:z.number().positive(),doorHeightMm:z.number().positive(),windowHeightMm:z.number().positive(),windowSillMm:z.number().nonnegative()})})
export type BimSettings=z.infer<typeof BimSettingsSchema>
export const defaultBimSettings=():BimSettings=>({estimated:false,dimensions:{exteriorWallMm:200,partitionWallMm:115,doorHeightMm:2100,windowHeightMm:1200,windowSillMm:900}})
export const useBimSettings=create<{settings:BimSettings;setSettings:(settings:BimSettings)=>void}>(set=>({settings:defaultBimSettings(),setSettings:settings=>set({settings})}))

export const drawingDimensions=(s:BimSettings)=>s.estimated?{columnWidth:0,columnDepth:0,wallThickness:s.dimensions.partitionWallMm,exteriorWallThickness:s.dimensions.exteriorWallMm}:undefined
