import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Label,
} from "recharts";
import { Observation } from "./types";


interface ChartProps {
    glucoseEntries: Observation[];
    a1cEntries: Observation[];
    creatinineEntries: Observation[];
}

const Chart: React.FC<ChartProps> = ({
    glucoseEntries,
    a1cEntries,
    creatinineEntries,
}) => {

    const glucoseChartData = glucoseEntries.map((p) => ({
        date: new Date(p.issued).toLocaleDateString(),
        glucoseLevel: p.valueQuantity.value,
    }));

    const a1cChartData = a1cEntries.map((p) => ({
        date: new Date(p.issued).toLocaleDateString(),
        a1cLevel: p.valueQuantity.value,
    }));

    const creatinineChartData = creatinineEntries.map((p) => ({
        date: new Date(p.issued).toLocaleDateString(),
        creatinineLevel: p.valueQuantity.value,
    }));

    return (
        <div className="w-full mt-12 flex flex-col justify-center items-center space-y-10 px-8">
            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
                {/* Glucose Chart */}
                <ChartSection
                    title="Recent Blood Glucose Levels"
                    data={glucoseChartData}
                    dataKey="glucoseLevel"
                    yAxisLabel="Glucose (mg/dL)"
                    lineColor="#8884d8"
                />

                {/* Hemoglobin A1c Chart */}
                <ChartSection
                    title="Recent Hemoglobin A1c Levels"
                    data={a1cChartData}
                    dataKey="a1cLevel"
                    yAxisLabel="A1c (%)"
                    lineColor="#82ca9d"
                />

                {/* Creatinine Chart */}
                <ChartSection
                    title="Recent Creatinine Levels"
                    data={creatinineChartData}
                    dataKey="creatinineLevel"
                    yAxisLabel="Creatinine (mg/dL)"
                    lineColor="#ff7300"
                />
            </div>
        </div>
    );
};

const ChartSection = ({
    title,
    data,
    dataKey,
    yAxisLabel,
    lineColor,
}: {
    title: string;
    data: unknown[];
    dataKey: string;
    yAxisLabel: string;
    lineColor: string;
}) => {
    return (
        <div className="w-full bg-white p-4 rounded-md shadow-md">
            <h3 className="text-xl mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date">
                        <Label value="Date" offset={-10} position="insideBottom" />
                    </XAxis>
                    <YAxis>
                        <Label value={yAxisLabel} angle={-90} position="insideLeft" />
                    </YAxis>
                    <Tooltip />
                    <Line type="monotone" dataKey={dataKey} stroke={lineColor} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};


export default Chart;
