import { useRef, useState } from "react";
import emailjs from '@emailjs/browser';

interface CarePlanSectionProps {
    carePlanString: string;
}

// Patient care plan section
const PatientCarePlanSection: React.FC<CarePlanSectionProps> = ({ carePlanString }) => {
    const [email, setEmail] = useState("");  // State for the email input
    const [showSuccess, setShowSuccess] = useState(false);  // State for success notification

    const formRef = useRef<HTMLFormElement | null>(null);

    const parseCarePlan = (carePlan: string) => {
        const formattedSections: { [key: string]: string | string[] } = {};
        const sections = carePlan.split(/--\s*/).filter(Boolean);

        sections.forEach((section, index) => {
            const trimmedSection = section.trim();
            if (trimmedSection === "Recommended Actions") {
                const actions = sections[index + 1]?.split(/>\s*/).filter(Boolean) || [];
                formattedSections[trimmedSection] = actions;
            } else if (trimmedSection === "Recommended Diet" || trimmedSection === "Summary") {
                formattedSections[trimmedSection] = sections[index + 1]?.trim() || '';
            }
        });

        return formattedSections;
    };

    const carePlanSections = parseCarePlan(carePlanString);

    // Send email function
    const sendEmail = (e: React.FormEvent) => {
        e.preventDefault();

        emailjs
            .sendForm('service_gat519a', 'template_6z85xel', formRef.current!, {
                publicKey: 'sZFgOYfXFkhQLE1sB',
            })
            .then(() => {
                console.log('SUCCESS!');
                setShowSuccess(true);  // Show the success notification
                setEmail('');  // Reset the email input field

                // Hide the success message after 3 seconds
                setTimeout(() => setShowSuccess(false), 3000);
            },
            (error) => {
                console.log('FAILED...', error.text);
            });
    };

    return (
        <div className="bg-gray-100 p-4 rounded-md shadow-md w-full">
            <div className="mb-4 flex justify-between">
                <h2 className="text-2xl">Perplexity Care Plan for Patient</h2>

                {/* Send email section */}
                {
                 carePlanString &&
                 
                 <form className="flex items-center space-x-2" ref={formRef} onSubmit={sendEmail}>
                 <input
                     type="email"
                     className="border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-[24em]"
                     placeholder="Enter your patient's email e.g. nick@gmail.com"
                     name="to_email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}  // Update email state
                     required
                 />
                 <textarea 
                     value={carePlanString} 
                     className="hidden" 
                     name="message" 
                     id="">
                 </textarea>
                 <button
                     type="submit"
                     className="bg-teal-500 font-bold text-white px-4 py-2 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700"
                 >
                     Send Email
                 </button>
             </form>
                }
            </div>

            {/* Success notification */}
            {showSuccess && (
                <div className="bg-green-500 text-white p-2 rounded-md mb-4">
                    Email sent successfully!
                </div>
            )}

            {carePlanString ? (
                <div>
                    {Object.entries(carePlanSections).map(([title, content]) => (
                        <div key={title} className="mb-4">
                            <h3 className="text-xl font-semibold">{title}</h3>
                            {Array.isArray(content) ? (
                                <ul className="list-disc pl-5">
                                    {content.map((item, index) => {
                                        const [action, ...descriptionParts] = item.split(':');
                                        const cleanedAction = action.replace(/\*/g, '').trim();
                                        const description = descriptionParts.join(':').trim();
                                
                                        return (
                                            <li key={index}>
                                                <strong>{cleanedAction}:</strong> {description}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p>{content}</p> // Render diet section as a paragraph
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-5">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-teal-500 border-solid"></div>
                    <p className="mt-4 text-lg text-gray-600">Loading care plan for patient to read...</p>
                </div>
            )}
        </div>
    );
};

// Doctor care plan section
export const DoctorCarePlanSection: React.FC<CarePlanSectionProps> = ({ carePlanString }) => {
    const parseCarePlan = (carePlan: string) => {
        const formattedSections: { [key: string]: string | string[] } = {};
        const sections = carePlan.split(/--\s*/).filter(Boolean);

        sections.forEach((section, index) => {
            const trimmedSection = section.trim();
            if (trimmedSection === "Recommended Treatments" || trimmedSection === "Recommended Medications") {
                const actions = sections[index + 1]?.split(/>\s*/).filter(Boolean) || [];
                formattedSections[trimmedSection] = actions;
            } else if (trimmedSection === "Detailed Care Plan") {
                formattedSections[trimmedSection] = sections[index + 1]?.trim() || '';
            }
        });

        return formattedSections;
    };

    const carePlanSections = parseCarePlan(carePlanString);

    return (
        <div className="bg-gray-100 p-4 rounded-md shadow-md w-full">
            <h2 className="text-2xl mb-4">Perplexity Care Plan for Doctor</h2>
            {carePlanString ? (
                <div>
                    {Object.entries(carePlanSections).map(([title, content]) => (
                        <div key={title} className="mb-4">
                            <h3 className="text-xl font-semibold">{title}</h3>
                            {Array.isArray(content) ? (
                                <ul className="list-disc pl-5">
                                    {content.map((item, index) => {
                                        const [action, ...descriptionParts] = item.split(':');
                                        const cleanedAction = action.replace(/\*/g, '').trim();
                                        const description = descriptionParts.join(':').trim();
                                
                                        return (
                                            <li key={index}>
                                                <strong>{cleanedAction}:</strong> {description}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p>{content}</p> // Render diet section as a paragraph
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-5">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-teal-500 border-solid"></div>
                    <p className="mt-4 text-lg text-gray-600">Loading care plan for doctor to read...</p>
                </div>
            )}
        </div>
    );
};


export default PatientCarePlanSection;