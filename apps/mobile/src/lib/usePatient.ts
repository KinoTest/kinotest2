import { getPatient, type PatientDetail } from './patients.ts'
import { useLoad } from './useLoad.ts'

/** Loads one patient (see useLoad). */
export const usePatient = (id: string) => useLoad<PatientDetail>(id, () => getPatient(id))
