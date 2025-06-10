import { useEffect, useContext, useState } from "react";
import { FhirClientContext } from "./FHIRClientProvider";
import {
  Observation,
  Condition,
  PatientHistory,
  GenHealthResponse,
  FHIRCondition,
  FHIRDevice,
  FHIREncounter,
  FHIRImmunization,
  FHIRMedicationRequest,
  FHIRObservation,
  PatientData,

} from "./types";
import { snomedICDMap } from "./assets/snomed_icd_map";
import { getPatientAge } from "./utils";
import { Tab } from "@headlessui/react";

import Chart from "./Chart";
import GenHealthPredictionSection from "./GenHealthPrediction";
import PatientCarePlanSection from "./CarePlan";
import { DoctorCarePlanSection } from "./CarePlan";
import Patient from "./Patient";
import { Link } from 'react-router-dom';


// Import GoogleGenerativeAI
import { GoogleGenerativeAI } from "@google/generative-ai";
// Initialize Google Generative AI with the API key
const genAI = new GoogleGenerativeAI('AIzaSyDh67diYvZ_3Bg7nBjNgfhfBMqb-wkxN9g'); 
// Get the model (e.g., gemini-1.5-flash)
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });




const MainSection = () => {

// Importing the necessary context and hooks
const { client, patient } = useContext(FhirClientContext); // FHIR client and global patient context

// Initializing state variables to store chart data, care plan, and other data
const [chartData, setChartData] = useState({
  glucoseEntries: [] as Observation[], // Stores blood glucose measurements
  a1cEntries: [] as Observation[],    // Stores A1C values
  creatinineEntries: [] as Observation[], // Stores creatinine values
});


const [genHealthResponse, setGenHealthResponse] = useState<GenHealthResponse>({} as GenHealthResponse); // State variable for holding GenHealth API response
const [perplexityPatientFuture, setPerplexityPatientFuture] = useState(""); // state variable for holding perplexity predicted medical future
const [geminiPatientFuture, setGeminiPatientFuture] = useState(""); // state variable for holding perplexity predicted medical future


// State variable for storing the generated care plan (patient and doctor sections)
const [carePlanString, setCarePlanString] = useState({ patientCarePlan: "", doctorCarePlan: ""});

// State to track whether GenHealth data is loaded
const [genHealthDataLoaded, setGenHealthDataLoaded] = useState(false);

// State to store patient history data
const [patientHistory, setPatientHistory] = useState<PatientHistory[]>([]);

// Helper function to calculate the patient's age based on their birthDate
const age = getPatientAge(patient?.birthDate as string);

// useEffect hook to load data whenever the client or patient's age changes
useEffect(() => {
  loadData(); // Function that loads data based on client and age
}, [client, age]);




// useEffect hook to trigger the GenHealth response if the patient history is updated and has a valid system entry
useEffect(() => {
  const getPatientFuture = async() => {
    if (patientHistory.length > 0 && patientHistory[0].system === "age") {
      await Promise.all([
        getPerplexityPatientFuture(patientHistory), // Fetch Perplexity future data
        getGenHealthResponse(patientHistory), // Fetch GenHealth data
        getGeminiResponse(patientHistory)
      ])
      setGenHealthDataLoaded(true); // Mark that the GenHealth data has been successfully loaded.
    }
  } 
  getPatientFuture()
}, [patientHistory]); // Dependency: patientHistory - Runs when patient history is updated




// useEffect hook to generate the care plan once the GenHealth data has been successfully loaded
useEffect(() => {
  if (genHealthDataLoaded) {
    getPerplexityCarePlan(); // Calls the function to generate the care plan based on loaded GenHealth data
  }
}, [genHealthDataLoaded]); // Dependency: genHealthDataLoaded - Runs when GenHealth data is loaded




/**
 * Asynchronously loads patient data and prepares it for display and further processing.
 * 
 * This function:
 * - Fetches glucose, A1C, and creatinine observation data using their LOINC codes.
 * - Populates the chart data state with the fetched observations.
 * - Retrieves the patient's conditions from the FHIR server using the patient ID.
 * - Filters conditions based on the SNOMED coding system.
 * - Generates a comprehensive patient history combining observations and conditions.
 * - Updates the patient history state with the generated data.
 */
const loadData = async () => {
  try {
    // Fetch glucose observations using the LOINC code "2339-0".
    const glucoseEntries = await fetchObservations("2339-0");

    // Fetch A1C (glycated hemoglobin) observations using the LOINC code "4548-4".
    const a1cEntries = await fetchObservations("4548-4");

    // Fetch creatinine observations using the LOINC code "38483-4".
    const creatinineEntries = await fetchObservations("38483-4");

    // Update the chart data state with the fetched observation entries.
    setChartData({
      glucoseEntries,
      a1cEntries,
      creatinineEntries,
    });

    // Retrieve the patient's conditions from the FHIR server using their ID.
    const conditionEntries = await client?.request(
      `Condition?subject=${client?.patient.id}`, // FHIR query for patient's conditions.
      {
        pageLimit: 0, // Retrieve all pages of results.
        flat: true,   // Flatten the response for easier handling.
      }
    );

    // Filter conditions to include only those using the SNOMED coding system.
    const conditionEntriesList = conditionEntries.filter(
      (condition: Condition) => {
        return condition.code.coding[0].system === "http://snomed.info/sct";
      }
    );

    // Generate a comprehensive patient history based on observations and filtered conditions.
    const history = generatePatientHistory(
      glucoseEntries,
      a1cEntries,
      creatinineEntries,
      conditionEntriesList
    );

    // Update the patient history state with the generated history.
    setPatientHistory(history);
  } catch (error) {
    // Log any errors encountered during data loading.
    console.error("Error loading data:", error);
  }
};





/**
 * Asynchronously fetches observation data for a given LOINC code from the FHIR server.
 * 
 * @param {string} code - The LOINC code used to identify the specific type of observation.
 * @returns {Promise<Observation[]>} - A promise that resolves to an array of Observation objects.
 * 
 * This function:
 * - Constructs a FHIR query using the provided LOINC code and the current patient ID.
 * - Sends a request to the FHIR server to retrieve observations matching the query.
 * - Returns the fetched observation data in a flattened format for easier handling.
 */
const fetchObservations = async (code: string): Promise<Observation[]> => {
  // Create URL search parameters with the LOINC code and patient ID.
  const q = new URLSearchParams();
  q.set("code", `http://loinc.org|${code}`); // Set the observation code with the LOINC system prefix.
  q.set("subject", client?.patient.id as string); // Set the subject (patient) ID.

  // Send a request to the FHIR server with the constructed query and return the resulting observations.
  return await client?.request(`Observation?${q}`, {
    pageLimit: 0, // Retrieve all pages of results.
    flat: true,   // Flatten the response for easier handling.
  }) as Observation[];
};





/**
 * Generates a patient's medical history by processing observation and condition data.
 * 
 * @param {Observation[]} patientGlucoseEntries - Array of glucose observation entries.
 * @param {Observation[]} patientsA1CEntries - Array of A1C observation entries.
 * @param {Observation[]} patientCreatinineEntries - Array of creatinine observation entries.
 * @param {Condition[]} patientConditionEntries - Array of condition entries from the patient's FHIR data.
 * @returns {PatientHistory[]} - An array of processed patient history entries, including diagnoses, time gaps, age, and gender.
 * 
 * This function:
 * - Merges, sorts, and analyzes observation entries.
 * - Calculates time gaps between entries and adds them as historical events.
 * - Detects and adds diagnostic codes for hyperglycemia, hypoglycemia, prediabetes, and kidney abnormalities.
 * - Incorporates condition data by matching SNOMED codes to ICD codes.
 * - Prepends the patient's age and gender to the history.
 * - Limits the number of history entries to 70 minus the number of condition entries.
 */
const generatePatientHistory = (
  patientGlucoseEntries: Observation[],
  patientsA1CEntries: Observation[],
  patientCreatinineEntries: Observation[],
  patientConditionEntries: Condition[]
) => {
  const local_patient_history = [] as PatientHistory[];

  // Helper function to calculate time gap in months between two dates.
  const calculateTimeGap = (date1: Date, date2: Date): string => {
    const diffMonths = Math.round(
      (date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    if (diffMonths >= 6 && diffMonths <= 12) return "06-12-month";
    if (diffMonths >= 1 && diffMonths < 6) return "01-06-month";
    if (diffMonths > 12) return "12+ months";
    return "less than 1 month";
  };

  // Merge and sort all observation entries by issue date.
  const allEntries = [
    ...patientGlucoseEntries,
    ...patientsA1CEntries,
    ...patientCreatinineEntries,
  ].sort((a, b) => new Date(a.issued).getTime() - new Date(b.issued).getTime());

  let lastEntryDate: Date | null = null;

  // Iterate through all sorted observation entries.
  allEntries.forEach((p) => {
    const entryDate: Date = new Date(p.issued);

    // Add time gap if there is a previous entry.
    if (lastEntryDate) {
      const timegap = calculateTimeGap(lastEntryDate, entryDate);
      local_patient_history.push({
        code: timegap,
        system: "timegap",
        display: timegap,
      });
    }

    // Analyze the observation values for potential diagnoses.
    if (p.valueQuantity?.value > 180) {
      local_patient_history.push({
        code: "R73.9",
        system: "ICD10CM",
        display: "Hyperglycemia, unspecified",
        date: p.issued,
      });
    }

    if (p.valueQuantity?.value < 70) {
      local_patient_history.push({
        code: "E16.2",
        system: "ICD10CM",
        display: "Hypoglycemia, unspecified",
        date: p.issued,
      });
    }

    if (p.valueQuantity?.value > 5.7 && p.valueQuantity?.value < 6.4) {
      local_patient_history.push({
        code: "R73.03",
        system: "ICD10CM",
        display: "Prediabetes",
        date: p.issued,
      });
    }

    if (p.valueQuantity?.value > 6.5) {
      local_patient_history.push({
        code: "R73.9",
        system: "ICD10CM",
        display: "Hyperglycemia, unspecified",
        date: p.issued,
      });
    }

    if (p.valueQuantity?.value > 1.35) {
      local_patient_history.push({
        code: "R94.4",
        system: "ICD10CM",
        display: "Abnormal results of kidney function studies",
        date: p.issued,
      });
    }

    lastEntryDate = entryDate;
  });

  // Limit the history to 70 entries minus condition entries, if necessary.
  const numObservations = 70 - patientConditionEntries.length;
  const latestEntries = local_patient_history.length > numObservations 
    ? local_patient_history.slice(-numObservations) 
    : local_patient_history;

  // Add conditions based on SNOMED-ICD mapping.
  patientConditionEntries.forEach((condition) => {
    if (condition.code.coding[0].system === "http://snomed.info/sct") {
      const conditionDate: Date = new Date(condition.onsetDateTime);
      for (let index = 0; index < latestEntries.length; index++) {
        const entry = latestEntries[index];
        if (entry.date && conditionDate < new Date(entry.date)) {
          const snomedCode = condition.code.coding[0].code;
          const icdCodes: string = snomedICDMap[snomedCode];
          if (icdCodes) {
            latestEntries.splice(index, 0, {
              system: "ICD10CM",
              code: icdCodes,
              display: condition.code.text,
              date: condition.onsetDateTime,
            });
          } else {
            console.log("No ICD code found for SNOMED code: ", snomedCode);
          }
          break;
        }
      }
    }
  });

  // Add the patient's gender and age to the beginning of the history.
  const gender = patient?.gender;
  if (gender) {
    latestEntries.unshift({ code: `${gender}`, system: "gender", display: `${gender}` });
  }

  const age = getPatientAge(patient?.birthDate as string);
  if (!isNaN(age)) {
    latestEntries.unshift({ code: `${age}`, system: "age", display: `${age}` });
  }

  // Remove duplicate timegap if present at the start.
  if (latestEntries[1]?.system === "timegap") latestEntries.splice(1, 1);

  return latestEntries;
};





/**
 * Asynchronously fetches a response from the GenHealth API using a serverless proxy.
 * 
 * @param {PatientHistory[]} patientHistory - Array of patient history objects to be sent for prediction.
 * 
 * This function:
 * - Sends a POST request to the GenHealth API proxy endpoint.
 * - Includes the patient history and prediction parameters in the request body.
 * - Handles both success and error responses.
 * - Updates the state with the API response or logs an error if the request fails.
 */
const getGenHealthResponse = async (patientHistory: PatientHistory[]) => {
  try {
    // Send a POST request to the GenHealth API proxy with required headers and body.
    const response = await fetch("https://genhealth-serverless-vercel-proxy.vercel.app/genhealth-predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Specifies the request body format as JSON.
        Authorization:
          "Token gh_s_k-MWZjM2E1M2EtZmFhYS00NGE4LWIzMjItN2JlNTVmNTY5ZDBh", // API authorization token for secure access.
        "Access-Control-Allow-Origin": "*", // Allows CORS for cross-origin requests.
      },
      body: JSON.stringify({
        history: patientHistory, // Patient history data sent for inference.
        num_predictions: 1, // Number of predictions to be generated.
        generation_length: 25, // Length of the generated prediction.
        inference_threshold: 0.95, // Confidence threshold for predictions.
        inference_temperature: 0.95, // Sampling temperature for prediction variability.
      }),
    });

    // Check if the response status is OK (status code 200-299).
    if (response.ok) {
      const data = await response.json(); // Parse the JSON response data.
      setGenHealthResponse(data); // Update the state with the API response.
    } else {
      console.error("Error fetching predictions:", response.statusText); // Log an error message for a non-OK response.
    }
  } catch (error) {
    // Log any network or other errors encountered during the request.
    console.error("Error fetching predictions:", error);
  }
};



const getPerplexityPatientFuture = async(patientHistory: PatientHistory[]) => {
  try {
    // Construct a prompt string containing various health-related patient information
    const prompt = `
          This is a data structure that denotes a patient's medical history, which includes the recent conditions that the patient has been diagnosed with
          ${JSON.stringify(patientHistory.map((p) => p))}

          Based on the information above, can you forecast and predict the patient's future medical history down the line. Structure it such that it is a timeline of events.
          The format must strictly be as follows without anything extra.
          
          ----Timeline of Events----
          
          --Short Term (Next 6 Months)--
          list all the predicted events in the next 6 months here
          
          --Medium Term (Next 1-2 years)--
          list all the predicted events in the next 1 -2 years here
          

          --Long Term (Next 5-10 years)--
          list all the predicted events in the next 5-10 years here

          --Conclusion--
          conclude all the predicted events listed above in a concise manner

          Do not provide advice on how to care for the patient. ONLY provide the predicted medical events.
          `;

    // Send a POST request to the Perplexity AI API to generate the summary
    const response = await fetch(
      "https://api.perplexity.ai/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer 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`, // API token for authentication
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-chat", // Specify the AI model to be used
          messages: [
            {
              role: "system",
              content:
                "You are a predictive model that forecasts a diabetic patient's future medical history by providing a timeline of events based on the patient's medical history so far",
            },
            { role: "user", content: prompt }, // Include user-provided prompt in the request
          ],
        }),
      }
    );

    // Parse the response data from the Perplexity API.
    const data = await response.json();
    const generatedContent = data.choices[0].message.content;
    setPerplexityPatientFuture(generatedContent)

    // Handle non-OK responses by throwing an error
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }


  } catch (error) {
    // Log any errors that occur during the request
    console.error("Error generating content:", error);
  }
}


const getGeminiResponse = async(patientHistory: PatientHistory[]) => {

  try {
    const prompt = `
    This is a data structure that denotes a patient's medical history, which includes the recent conditions that the patient has been diagnosed with
    ${JSON.stringify(patientHistory.map((p) => p))}

    Based on the information above, can you forecast and predict the patient's future medical history down the line. Structure it such that it is a timeline of events.
    The format must strictly be as follows without anything extra.
    
    ----Timeline of Events----
    
    --Short Term (Next 6 Months)--
    list all the predicted events in the next 6 months here
    
    --Medium Term (Next 1-2 years)--
    list all the predicted events in the next 1 -2 years here
    

    --Long Term (Next 5-10 years)--
    list all the predicted events in the next 5-10 years here

    --Conclusion--
    conclude all the predicted events listed above in a concise manner

    Do not provide advice on how to care for the patient. ONLY provide the predicted medical events.
    `;


    const result = await geminiModel.generateContent(prompt)
    const geminiResponse = result.response.text()
    setGeminiPatientFuture(geminiResponse)
    console.log(geminiResponse)
  } catch (error) {
    console.log(error)
  }
}




/**
 * Asynchronously fetches a care plan recommendation for a diabetic patient based on their medical history and predicted future health conditions.
 * 
 * @param {PatientHistory[]} patientHistory - Array of patient history objects used for generating a care plan.
 * @param {GenHealthResponse} genHealthResponse - The predicted future health conditions for the patient, obtained from the GenHealth API.
 * 
 * This function:
 * - Sends a POST request to the Perplexity API with the patient's medical history and predicted future health conditions.
 * - Requests a care plan generation for both the patient and the doctor, adhering to a strict format.
 * - Validates the response to ensure it follows the required structure.
 * - Updates the state with the generated care plan for both the patient and the doctor or logs an error if the request fails.
 */
const getPerplexityCarePlan = async () => {
  try {
    // Prepare the prompt for the Perplexity API, including patient history and predicted future conditions.
    const prompt = `
      This is a diabetic patient's existing medical history pulled from their electronic health record
      ${JSON.stringify(patientHistory)}

      This is a diabetic patient's predicted future health conditions:
      ${JSON.stringify(genHealthResponse?.predictions[0])}

      Based on the patient's history and predicted future health conditions, generate a care plan 
      recommendation for the patient and doctor. The format must strictly be as follows without anything extra 
      and all text must be plain text. Inside [] are variable names that should be replaced with the actual names.

      ----Recommendations for Patient----
      
      --Recommended Actions--
      > [Action name 1]: explanation
      > [Action name 2]: explanation
      (at least 5 recommended actions)

      --Recommended Diet--
      paragraph about diet

      --Summary--
      a summary of the care plan

      ----Recommendations for Doctor----
      
      --Recommended Treatments--
      > [Treatment name 1]: explanation
      > [Treatment name 2]: explanation
      (at least 4 recommended treatments)

      --Recommended Medications--
      > [Medication name 1]: explanation
      > [Medication name 2]: explanation
      (at least 2 recommended medications)

      --Detailed Care Plan--
      paragraph about detailed care plan, such as severity of the condition, how to monitor it, etc. No dot 
      points
    `;

    // Send a POST request to the Perplexity API with the prepared prompt and authorization token.
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Specifies the content type as JSON.
        Authorization: `Bearer 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`, // API authorization token.
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-chat", // Specifies the model to use for generating the care plan.
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates care plans for diabetic patients.", // System message to provide context to the model.
          },
          {
            role: "user",
            content: prompt, // User message containing the prompt.
          },
        ],
      }),
    });

    // Check if the response status is OK (status code 200-299).
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`); // Handle non-OK response status.
    }

    // Parse the response data from the Perplexity API.
    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    // Split the generated content based on predefined markers ("----").
    const mainSection = generatedContent.split(/----\s*/).filter(Boolean);

    // Validate that the content follows the required structure.
    if (
      mainSection[0] !== "Recommendations for Patient" &&
      mainSection[2] !== "Recommendations for Doctor"
    ) {
      throw new Error("Invalid Care Plan"); // Ensure the care plan is structured correctly.
    }

    // Extract the care plans for both the patient and the doctor.
    const patientCarePlan = mainSection[1];
    const doctorCarePlan = mainSection[3];

    // Update the state with the generated care plan for both the patient and the doctor.
    setCarePlanString({
      patientCarePlan,
      doctorCarePlan,
    });
  } catch (error) {
    // Log any errors encountered during the fetch process.
    console.error("Error generating content:", error);
  }
};

















// States for each health data type with proper typing 
// "THESE STATE VARIABLES TO BE PASSED TO THE <Patient/> COMPONENT"
const [conditionEntries, setConditionEntries] = useState<FHIRCondition[]>([]);
const [observationEntries, setObservationEntries] = useState<FHIRObservation[]>([]);
const [medicationEntries, setMedicationEntries] = useState<FHIRMedicationRequest[]>([]);
const [encounterEntries, setEncounterEntries] = useState<FHIREncounter[]>([]);
const [immunizationEntries, setImmunizationEntries] = useState<FHIRImmunization[]>([]);
const [deviceEntries, setDeviceEntries] = useState<FHIRDevice[]>([]);

const [isLoading, setIsLoading] = useState(true);
const [fetchError, setFetchError] = useState<Error | null>(null);


const [perplexitySummary, setPerplexitySummary] = useState(""); // state for tracking modal opening and closing


useEffect(() => {
  // Function to fetch and process various health data for the current patient
  const fetchHealthData = async () => {
    try {
      // Set loading state to true to indicate data fetching is in progress
      setIsLoading(true);
      
      // Exit early if client or patient ID is not available
      if (!client?.patient?.id) return;

      // Parallelize the data fetching requests using Promise.all to reduce waiting time
      const [
        conditions,        // Fetch patient's medical conditions
        observations,      // Fetch patient's observations (e.g., vitals, lab results)
        medications,       // Fetch patient's medication requests
        encounters,        // Fetch patient's clinical encounters
        immunizations,     // Fetch patient's immunization records
        devices            // Fetch patient's medical devices
      ] = await Promise.all([
        client.request<FHIRCondition[]>(`Condition?subject=${client.patient.id}`, { pageLimit: 0, flat: true }),
        client.request<FHIRObservation[]>(`Observation?subject=${client.patient.id}`, { pageLimit: 0, flat: true }),
        client.request<FHIRMedicationRequest[]>(`MedicationRequest?subject=${client.patient.id}`, { pageLimit: 0, flat: true }),
        client.request<FHIREncounter[]>(`Encounter?subject=${client.patient.id}`, { pageLimit: 0, flat: true }),
        client.request<FHIRImmunization[]>(`Immunization?patient=${client.patient.id}`, { pageLimit: 0, flat: true }),
        client.request<FHIRDevice[]>(`Device?patient=${client.patient.id}`, { pageLimit: 0, flat: true })
      ]);

      // Sort observations by date (most recent first) and take the latest 5
      const recentObservations = observations
        .sort((a, b) => new Date(b.effectiveDateTime || b.meta.lastUpdated).getTime() - new Date(a.effectiveDateTime || a.meta.lastUpdated).getTime())
        .slice(0, 5);
      setObservationEntries(recentObservations);

      // Deduplicate and process medications based on their text and set unique entries
      const uniqueMedications = Array.from(new Set(medications.map(m => m.medicationCodeableConcept?.text)))
        .map(text => medications.find(m => m.medicationCodeableConcept?.text === text));
      setMedicationEntries(uniqueMedications as FHIRMedicationRequest[]);

      // Sort encounters by start date (most recent first) and take the latest 5
      const recentEncounters = encounters
        .sort((a, b) => new Date(b.period?.start || b.meta.lastUpdated).getTime() - new Date(a.period?.start || a.meta.lastUpdated).getTime())
        .slice(0, 5);
      setEncounterEntries(recentEncounters);

      // Sort immunizations by occurrence date and take the latest 5
      const recentImmunizations = immunizations
        .sort((a, b) => new Date(b.occurrenceDateTime || b.meta.lastUpdated).getTime() - new Date(a.occurrenceDateTime || a.meta.lastUpdated).getTime())
        .slice(0, 5);
      setImmunizationEntries(recentImmunizations);

      // Set all fetched devices without further processing
      setDeviceEntries(devices);

      // Deduplicate conditions based on their descriptive text and set unique entries
      const uniqueConditions = Array.from(new Set(conditions.map(c => c.code.text)))
        .map(text => conditions.find(c => c.code.text === text));
      setConditionEntries(uniqueConditions as FHIRCondition[]);

    } catch (err) {
      // Log the error and set the fetch error state for debugging and user feedback
      setFetchError(err as Error);
      console.error(fetchError);
    } finally {
      // Ensure loading state is reset to false regardless of success or failure
      setIsLoading(false);
    }
  };

  // Immediately invoke the fetch function on component mount or when 'client' changes
  fetchHealthData();
}, [client]); // Dependency array: the hook re-runs when 'client' changes







useEffect(() => {
  // Function to generate a care plan summary using Perplexity AI based on patient data
  async function getPerplexityPatientSummary() {
    try {
      // Construct a prompt string containing various health-related patient information
      const prompt = `
            These are a diabetic patient's existing observations
            ${JSON.stringify(observationEntries.map((observation) => observation.code?.text || 'Unknown Observations'))}

            These are a diabetic patient's existing conditions:
            ${JSON.stringify(conditionEntries.map((condition) => condition.code?.text || 'Unknown Condition'))}

            This is the medication the diabetic patient has been prescribed
            ${JSON.stringify(medicationEntries.map((medication) => medication.medicationCodeableConcept?.text || 'Unknown Condition'))}

            These are the encounters the diabetic patient has had
            ${JSON.stringify(encounterEntries.map((encounter) => encounter.type?.[0]?.text || 'Unknown Encounter'))}

            These are the different immunizations that have been given to the diabetic patient
            ${JSON.stringify(immunizationEntries.map((immunization) => immunization.vaccineCode?.text || 'Unknown Immunization'))}

            These are the different medical devices that have been given to the diabetic patient
            ${JSON.stringify(deviceEntries.map((device) => device.type?.text || 'Unknown Device'))}

            Based on the information above, generate a summary for the patient, put it in a single paragraph. Only state the facts, don't provide recommendations`;

      // Send a POST request to the Perplexity AI API to generate the summary
      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer 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`, // API token for authentication
          },
          body: JSON.stringify({
            model: "llama-3.1-sonar-small-128k-chat", // Specify the AI model to be used
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant that generates summaries for the diabetic patient",
              },
              { role: "user", content: prompt }, // Include user-provided prompt in the request
            ],
          }),
        }
      );

      // Handle non-OK responses by throwing an error
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Extract and set the generated summary from the API response
      const data = await response.json();
      const generatedSummary = data.choices[0].message.content;
      setPerplexitySummary(generatedSummary); // Update state with the generated summary

    } catch (error) {
      // Log any errors that occur during the request
      console.error("Error generating content:", error);
    }
  }

  // Only call the function when there are condition entries to provide context
  if (conditionEntries.length > 0) {
    getPerplexityPatientSummary();
  }
// Dependency array: re-run the effect when `conditionEntries` changes
}, [conditionEntries]);


return (
  <div className="main-section min-h-screen bg-gray-50">
    {/* Header */}
    <header className="bg-gradient-to-r from-teal-100 to-teal-50 p-8 text-center shadow-md border-b border-teal-300">
      <Link to="/"> {/* Make the heading a link */}
        <h1 className="text-5xl font-poppins font-bold tracking-wide text-teal-800">
          DiabAI
        </h1>
      </Link>
    </header>

    {/* Tab Group */}
    <div className="container mx-auto p-8 max-w-7xl">
      <Tab.Group>
        {/* Tab List */}
        <Tab.List className="flex justify-center space-x-6 mt-6 mb-8">
          {["Patient", "Key Metrics", "Health Predictions", "Patient Care Plan", "Doctor Care Plan"].map((tab) => (
            <Tab
              key={tab}
              className={({ selected }) =>
                `px-8 py-3 text-lg font-medium rounded-full transition-all duration-300
                ${selected ? "bg-teal-500 text-white shadow-lg" : "bg-gray-200 text-teal-700 hover:bg-gray-300 hover:text-teal-900"}`
              }
            >
              {tab}
            </Tab>
          ))}
        </Tab.List>

        {/* Tab Panels */}
        <Tab.Panels className="flex-grow p-6 bg-white rounded-lg shadow-md">
          <Tab.Panel className="p-6">
          {
            isLoading ? 
            
            <div className="flex flex-col items-center justify-center py-5">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-teal-500 border-solid"></div>
              <p className="mt-4 text-lg text-gray-600">Generating summary of patient data, please wait a moment...</p>
            </div>
            
            : 

            <Patient
            patient={patient as PatientData}
            conditionEntries={conditionEntries}
            observationEntries={observationEntries}
            medicationEntries={medicationEntries}
            encounterEntries={encounterEntries}
            immunizationEntries={immunizationEntries}
            deviceEntries={deviceEntries}
            perplexitySummary={perplexitySummary}
          />
          }
          </Tab.Panel>
          <Tab.Panel className="p-6">
            <Chart
              glucoseEntries={chartData.glucoseEntries}
              a1cEntries={chartData.a1cEntries}
              creatinineEntries={chartData.creatinineEntries}
            />
          </Tab.Panel>
          <Tab.Panel className="p-6">
            <GenHealthPredictionSection
              genHealthDataLoaded={genHealthDataLoaded}
              genHealthResponse={genHealthResponse}
              perplexityPatientFuture={perplexityPatientFuture}
              geminiPatientFuture={geminiPatientFuture}
            />
          </Tab.Panel>
          <Tab.Panel className="p-6">
            <PatientCarePlanSection
              carePlanString={carePlanString.patientCarePlan}
            />
          </Tab.Panel>
          <Tab.Panel className="p-6">
            <DoctorCarePlanSection
              carePlanString={carePlanString.doctorCarePlan}
            />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  </div>
);
};

export default MainSection;
