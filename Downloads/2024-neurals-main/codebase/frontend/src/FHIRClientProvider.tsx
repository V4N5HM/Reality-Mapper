import React, { useState, useEffect, ReactNode } from "react";
import { oauth2 as SMART } from "fhirclient";
import Client from "fhirclient/lib/Client";
import { PatientData } from "./types";

interface FhirClientContextProps {
    client: Client | null;
    error: Error | null;
    loading: boolean | null
    patient: PatientData | null
    
}

const defaultContext: FhirClientContextProps = {
    client: null,
    error: null,
    loading: null,
    patient: null
};

export const FhirClientContext = React.createContext<FhirClientContextProps>(defaultContext);

interface FhirClientProviderProps {
    children: ReactNode;
}

const FhirClientProvider: React.FC<FhirClientProviderProps> = ({ children }) => {
    const [client, setClient] = useState<Client | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);
    const [patient, setPatient] = useState<PatientData | null>(null);

    useEffect(() => {
        SMART.ready().then(
            (client) => setClient(client),
            (error) => setError(error)
        );
    }, []);

    // Effect to fetch patient data when the component mounts or when the client changes
    useEffect(() => {
        if (!client) return; // Ensure the client is available

        // Fetch patient data using the FHIR client
        client.patient
        .read()
        .then((patient: unknown) => { // set it as unknown to bypass stupid typescript checker
            setPatient(patient as PatientData); // If successful, set the patient data
            setError(null);
        })
        .catch((err: Error) => setError(err)) 
        .finally(() => setLoading(false)); 
    }, [client]); 

    return (
        <FhirClientContext.Provider value={{ client, error, loading, patient }}>
            <FhirClientContext.Consumer>
                {({ client, error }) => {
                    if (error) {
                        return <pre>{error.stack}</pre>;
                    }

                    if (client) {
                        return children;
                    }

                    return (
                        <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-teal-500 border-solid"></div>
                            <p className="mt-4 text-lg text-gray-600">Authorizing, please wait...</p>
                        </div>)
                }}
            </FhirClientContext.Consumer>
        </FhirClientContext.Provider>
    );
};

export default FhirClientProvider;
