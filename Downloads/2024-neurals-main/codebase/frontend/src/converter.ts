// import fs from 'fs';
// import path from 'path';
// import csv from 'csv-parser';

// import { fileURLToPath } from 'url';

// // Loinc to ICD
// // Hard code the mapping for now
// // High creatinine level indicates kidney disease R94.4
// // High blood glucose level indicates diabetes E11.9
// // Get all the conditions from FHIR and map them to ICD codes
// // NOTE - no CPT because it doesn't work well with genhealth API?

// // LOINC to/from ICD
// // const loincToICD: Record<string, string> = {
// //     '38483-4': 'R94.4',
// //     '2339-0': 'E11.9',
// //     '4548-4': 'D58.2'
// // };

// // Define types for CSV rows
// interface SnomedICDRow {
//     'SNOMED Code': string;
//     'ICD Code': string;
// }

// export async function SNOMEDtoICD(snomed_code: string): Promise<string[]> {
//     const __filename = fileURLToPath(import.meta.url);
//     const __dirname = path.dirname(__filename);

//     const filePath = path.join(__dirname, 'assets/csv/snomed_icd_map.csv');

//     return new Promise<string[]>((resolve, reject) => {
//         const icdCodes = new Set<string>();

//         fs.createReadStream(filePath)
//             .pipe(csv())
//             .on('data', (row: SnomedICDRow) => {
//                 if (row['SNOMED Code'] === snomed_code) {
//                     let code = row['ICD Code'];
//                     if (code) {
//                         code = code.trim();
//                         if (code.endsWith('?')) {
//                             code = code.slice(0, -1);
//                         }
//                         if (code !== 'nan') {
//                             icdCodes.add(code);
//                         }
//                     }
//                 }
//             })
//             .on('end', () => {
//                 const sortedICDCodes = Array.from(icdCodes).sort();
//                 resolve(sortedICDCodes);
//             })
//             .on('error', (error) => {
//                 reject(error);
//             });
//     });
// }

// // Example usage
// (async () => {
//     try {
//         const result = await SNOMEDtoICD('1003530008');
//         console.log(result);
//     } catch (error) {
//         console.error('Error:', error);
//     }
// })();

// console.log(SNOMEDtoICD('1003530008'));


