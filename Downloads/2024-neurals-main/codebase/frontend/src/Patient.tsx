import React, { useState, useEffect } from 'react';

import {
  FHIRCondition,
  FHIRDevice,
  FHIREncounter,
  FHIRImmunization,
  FHIRMedicationRequest,
  FHIRObservation,
  PatientData,
} from './types';

interface PatientProps {
  patient: PatientData;
  conditionEntries: FHIRCondition[];
  observationEntries: FHIRObservation[];
  medicationEntries: FHIRMedicationRequest[];
  encounterEntries: FHIREncounter[];
  immunizationEntries: FHIRImmunization[];
  deviceEntries: FHIRDevice[];
  perplexitySummary: string
}

const Patient: React.FC<PatientProps> = ({
  patient,
  conditionEntries,
  observationEntries,
  medicationEntries,
  encounterEntries,
  immunizationEntries,
  deviceEntries,
  perplexitySummary
}) => {

  // State for each section's loading status
  const [isConditionLoaded, setIsConditionLoaded] = useState(false);
  const [isObservationLoaded, setIsObservationLoaded] = useState(false);
  const [isMedicationLoaded, setIsMedicationLoaded] = useState(false);
  const [isEncounterLoaded, setIsEncounterLoaded] = useState(false);
  const [isImmunizationLoaded, setIsImmunizationLoaded] = useState(false);
  const [isDeviceLoaded, setIsDeviceLoaded] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false); // state for tracking modal opening and closing

  // Data Loading effects
  useEffect(() => {
    if (conditionEntries.length > 0) {
      setIsConditionLoaded(true);
    }
  }, [conditionEntries]);

  useEffect(() => {
    if (observationEntries.length > 0) {
      setIsObservationLoaded(true);
    }
  }, [observationEntries]);

  useEffect(() => {
    if (medicationEntries.length > 0) {
      setIsMedicationLoaded(true);
    }
  }, [medicationEntries]);

  useEffect(() => {
    if (encounterEntries.length > 0) {
      setIsEncounterLoaded(true);
    }
  }, [encounterEntries]);

  useEffect(() => {
    if (immunizationEntries.length > 0) {
      setIsImmunizationLoaded(true);
    }
  }, [immunizationEntries]);

  useEffect(() => {
    if (deviceEntries.length > 0) {
      setIsDeviceLoaded(true);
    }
  }, [deviceEntries]);





  // Extracting personal details
  const name =
    patient.name && patient.name[0]
      ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}`
      : 'Unknown Name';
  const gender = patient.gender || 'Unknown Gender';
  const birthDate = patient.birthDate
    ? new Date(patient.birthDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown Birth Date';
  const maritalStatus = patient.maritalStatus?.coding?.[0]?.display || 'Unknown';
  const race =
    patient.extension?.find((ext) => ext.url.includes('us-core-race'))?.extension?.[0]?.valueString ||
    'Unknown';
  const ethnicity =
    patient.extension?.find((ext) => ext.url.includes('us-core-ethnicity'))?.extension?.[0]?.valueString ||
    'Unknown';
  const primaryLanguage = patient.communication?.[0]?.language?.text || 'Unknown';

  // Extracting contact information
  const address = patient.address?.[0]
    ? `${patient.address[0].line?.[0]}, ${patient.address[0].city}, ${patient.address[0].state} ${patient.address[0].postalCode}`
    : 'Unknown Address';
  const phone = patient.telecom?.[0]?.value || 'Unknown Phone Number';

  // Toggle modal visibility
  const handleViewSummary = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="patient-health-data grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 mb-8">
      <div className="mb-4 md:col-span-2">
        <h2 className="text-center text-2xl font-bold mb-6">
          Health Data for <span className="text-teal-600">{name}</span>
          <button
            className= {`${!perplexitySummary ? 'bg-gray-300' : 'bg-teal-500 hover:bg-teal-600'} ml-4 py-2 px-6 transition-colors text-white rounded-md shadow-md text-[15px]`}
            onClick={handleViewSummary}
            disabled={!perplexitySummary}
          >
            View Summary
          </button>
        </h2>
      </div>

      {/* Patient Information */}
      <div className="md:col-span-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <ul className="list-none p-0">
              <li><strong>Name:</strong> {name}</li>
              <li><strong>Gender:</strong> {gender}</li>
              <li><strong>Date of Birth:</strong> {birthDate}</li>
              <li><strong>Marital Status:</strong> {maritalStatus}</li>
              <li><strong>Race:</strong> {race}</li>
              <li><strong>Ethnicity:</strong> {ethnicity}</li>
              <li><strong>Primary Language:</strong> {primaryLanguage}</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Contact Information</h3>
            <ul className="list-none p-0">
              <li><strong>Address:</strong> {address}</li>
              <li><strong>Phone:</strong> {phone}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Patient Health Data Sections */}
      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
        {isConditionLoaded && (
          <div>
            <h3 className="text-lg font-semibold">Conditions</h3>
            <ul>
              {conditionEntries.map((condition, idx) => (
                <li key={idx}>{condition.code?.text || 'Unknown Condition'}</li>
              ))}
            </ul>
          </div>
        )}
        {isObservationLoaded && (
          <div>
            <h3 className="text-lg font-semibold">Observations</h3>
            <ul>
              {observationEntries.map((observation, idx) => (
                <li key={idx}>{observation.code?.text || 'Unknown Observation'}</li>
              ))}
            </ul>
          </div>
        )}
        {isMedicationLoaded && (
          <div>
            <h3 className="text-lg font-semibold">Medications</h3>
            <ul>
              {medicationEntries.map((medication, idx) => (
                <li key={idx}>{medication.medicationCodeableConcept?.text || 'Unknown Medication'}</li>
              ))}
            </ul>
          </div>
        )}
        {isEncounterLoaded && (
          <div>
            <h3 className="text-lg font-semibold">Encounters</h3>
            <ul>
              {encounterEntries.map((encounter, idx) => (
                <li key={idx}>{encounter.type?.[0]?.text || 'Unknown Encounter'}</li>
              ))}
            </ul>
          </div>
        )}
        {isImmunizationLoaded && (
          <div>
            <h3 className="text-lg font-semibold">Immunizations</h3>
            <ul>
              {immunizationEntries.map((immunization, idx) => (
                <li key={idx}>{immunization.vaccineCode?.text || 'Unknown Immunization'}</li>
              ))}
            </ul>
          </div>
        )}
        {isDeviceLoaded && (
          <div>
            <h3 className="text-lg font-semibold">Devices</h3>
            <ul>
              {deviceEntries.map((device, idx) => (
                <li key={idx}>{device.type?.text || 'Unknown Device'}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Modal Component */}
      {isModalOpen && (
        <Modal patient={patient} onClose={closeModal} perplexitySummary={perplexitySummary}/>
      )}
    </div>
  );
};

// Modal Component
const Modal: React.FC<{ patient: PatientData; onClose: () => void; perplexitySummary: string }> = ({ patient, onClose, perplexitySummary }) => {
  const name =
    patient.name && patient.name[0]
      ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}`
      : 'Unknown Name';
  const gender = patient.gender || 'Unknown Gender';
  const birthDate = patient.birthDate
    ? new Date(patient.birthDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown Birth Date';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-md w-4/5 md:w-1/2">
        <h2 className="text-2xl font-semibold">Patient Summary</h2>
        <div className="mt-4">
          <ul>
            <li><strong>Name:</strong> {name}</li>
            <li><strong>Gender:</strong> {gender}</li>
            <li><strong>Date of Birth:</strong> {birthDate}</li>
            <li className='mt-6 text-justify'>{ perplexitySummary }</li>
          </ul>
        </div>
        <div className="mt-6 text-center">
          <button onClick={onClose} className="bg-teal-500 text-white py-2 px-6 rounded-md">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Patient;
