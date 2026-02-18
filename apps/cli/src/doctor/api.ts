/**
 * Programmatic API for mycontext doctor
 *
 * Usage:
 *   import { diagnose } from "./doctor/api";
 *   const result = await diagnose("./path/to/project");
 *   console.log(result.score);
 */
import { runDoctor } from "./DoctorEngine";
import type { DoctorResult, DiagnoseOptions, DoctorCategory } from "./types";

export async function diagnose(
  directory: string,
  options: DiagnoseOptions = {}
): Promise<DoctorResult> {
  return runDoctor(directory, {
    category: options.category,
    project: options.project,
  });
}

export { type DoctorResult, type DiagnoseOptions } from "./types";
