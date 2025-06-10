import FhirClientProvider from "./FHIRClientProvider";
import MainSection from "./MainSection";

export default function HomePage() {
    return (
        <FhirClientProvider>
            <div className="flex">
                {/* Main Content */}
                <div className="flex-grow p-6 space-y-6 bg-gray-50 min-h-screen">
                    <MainSection />
                </div>
            </div>
        </FhirClientProvider>
    );
}
