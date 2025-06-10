import  { useEffect } from "react";
import { oauth2 as SMART } from "fhirclient";

const Launcher = () => {
    useEffect(() => {
        SMART.authorize({
            clientId: "my-client-id",
            scope: "patient/Observation.read patient/Patient.read launch/patient",
            redirectUri: "./app",
            iss: "https://launch.smarthealthit.org/v/r4/sim/WzAsIjEzMmY0OGJhLTFkNzItNGUwYy1hMjIwLTkxNzg2ZDc1MDFhYSw4ODFmNTM0Zi1kMDQxLTQyNWQtYTU0Mi1jYmY2NjlmNDNlMTgsNzA5OWI0YzUtNmY0Ny00MjkzLTk2OTAtZjJhZmIyM2I5ZGQ2LGM2ZTEwOTk5LTJkNGYtNDA1ZC05NjRjLTJlNjFmMGFlYmQ3NiwxODZmZjk4NC1mNDM3LTQ4MTctOGQzNS0wOTk3YThiN2Y0MDUsODdhMzM5ZDAtOGNhZS00MThlLTg5YzctODY1MWU2YWFiM2M2LGYyMzE2Nzg5LTMwYzQtNGMwNi05MTkzLTBjYTU0NzViYmIxYiw0ZDU4NDY1Yy00NzAzLTRjMzYtYWI4Zi0yZjkzNWRjNGJlZTciLCIiLCJBVVRPIiwwLDAsMCwiIiwiIiwiIiwiIiwiIiwiIiwiIiwwLDEsIiJd/fhir",


            // WARNING: completeInTarget=true is needed to make this work
            // in the codesandbox frame. It is otherwise not needed if the
            // target is not another frame or window but since the entire
            // example works in a frame here, it gets confused without
            // setting this!
            completeInTarget: true
        });
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-teal-500 border-solid"></div>
            <p className="mt-4 text-lg text-gray-600">Launching DiabAI, please wait...</p>
        </div>)
};

export default Launcher;
