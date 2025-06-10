import { useState, useEffect } from "react";
import { GenHealthPredictionsProps, ParsedSection } from "./types";

const parsePredictions = (input: string): ParsedSection[] => {
  const sections: ParsedSection[] = [];
  let currentSection: string | null = null;
  let currentContent: string[] = [];

  input.split("\n").forEach((line) => {
    const cleanLine = line.trim();

    if (!cleanLine) return;

    const sectionHeaderMatch = cleanLine.match(/^--(.*?)--$/);
    if (sectionHeaderMatch) {
      if (currentSection) {
        sections.push({ title: currentSection, content: currentContent });
      }
      currentSection = sectionHeaderMatch[1];
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(cleanLine);
    }
  });

  if (currentSection) {
    sections.push({ title: currentSection, content: currentContent });
  }

  return sections;
};

const GenHealthPredictionSection: React.FC<GenHealthPredictionsProps> = ({
  genHealthDataLoaded,
  genHealthResponse,
  perplexityPatientFuture,
  geminiPatientFuture,
}) => {
  const [selectModelModal, setSelectModelModal] = useState(false);
  const [modalSelection, setModalSelection] = useState<
    "genhealth" | "perplexity" | "gemini"
  >("perplexity");

  const [parsedPerplexitySections, setParsedPerplexitySections] = useState<
    ParsedSection[]
  >([]);
  const [parsedGeminiSections, setParsedGeminiSections] = useState<
    ParsedSection[]
  >([]);

  useEffect(() => {
    // Parse Perplexity data
    setParsedPerplexitySections(parsePredictions(perplexityPatientFuture));
  }, [perplexityPatientFuture]);

  useEffect(() => {
    // Parse Gemini data
    setParsedGeminiSections(parsePredictions(geminiPatientFuture));
  }, [geminiPatientFuture]);

  return (
    <div className="bg-gray-100 p-4 rounded-md shadow-md w-full">
      <div className="text-2xl mb-4 flex justify-between items-center">
        <span>
          Health Predictions (
          <span className="text-teal-500 font-bold capitalize">
            {modalSelection}
          </span>
          )
        </span>

        <div className="relative">
          {genHealthDataLoaded && (
            <button
              onClick={() => setSelectModelModal((prev) => !prev)}
              className="bg-teal-500 hover:bg-teal-600 transition-colors p-2 px-4 text-lg rounded-md shadow-md text-white"
            >
              Select Model
            </button>
          )}

          {selectModelModal && (
            <ul className="absolute bg-white w-full top-[50px] flex flex-col gap-2 text-base rounded-md shadow-md">
              <li
                onClick={() => setModalSelection("perplexity")}
                className="cursor-pointer transition-colors hover:bg-slate-500 hover:text-white p-2 rounded-md text-lg"
              >
                Perplexity
              </li>
              <li
                onClick={() => setModalSelection("gemini")}
                className="cursor-pointer transition-colors hover:bg-slate-500 hover:text-white p-2 rounded-md text-lg"
              >
                Gemini
              </li>
              <li
                onClick={() => setModalSelection("genhealth")}
                className="cursor-pointer transition-colors hover:bg-slate-500 hover:text-white p-2 rounded-md text-lg"
              >
                GenHealth
              </li>
            </ul>
          )}
        </div>
      </div>

      {modalSelection === "genhealth" ? (
        genHealthDataLoaded ? (
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="py-2">System</th>
                <th className="py-2">Display</th>
                <th className="py-2">Code (ICD, CPT, Date, Gender)</th>
              </tr>
            </thead>
            <tbody>
              {genHealthResponse?.predictions[0]?.length ? (
                genHealthResponse.predictions[0].map((g, index) => (
                  <tr key={index}>
                    <td className="border px-4 py-2">{g.system}</td>
                    <td className="border px-4 py-2">{g.display}</td>
                    <td className="border px-4 py-2">{g.code}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center py-2">
                    No predictions available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-5">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-teal-500 border-solid"></div>
            <p className="mt-4 text-lg text-gray-600">
              Loading Health Predictions, please wait...
            </p>
          </div>
        )
      ) : modalSelection === "perplexity" ? (
        genHealthDataLoaded ? (
          <div className="py-5">
            {parsedPerplexitySections.map(({ title, content }) => (
              <div key={title} className="mb-4">
                <h3 className="text-xl font-semibold">{title}</h3>
                <ul className="list-disc pl-5">
                  {content.map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-5">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-teal-500 border-solid"></div>
            <p className="mt-4 text-lg text-gray-600">
              Loading Perplexity Predictions, please wait...
            </p>
          </div>
        )
      ) : (
        <div className="py-5">
          {parsedGeminiSections.map(({ title, content }) => (
            <div key={title} className="mb-4">
              <h3 className="text-xl font-semibold">{title}</h3>
              <ul className="list-disc pl-5">
                {content.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GenHealthPredictionSection;
