import {create} from 'zustand'
export const useSolarSettings=create<{date:string;setDate:(date:string)=>void}>(set=>({date:'2026-12-22',setDate:date=>set({date})}))
