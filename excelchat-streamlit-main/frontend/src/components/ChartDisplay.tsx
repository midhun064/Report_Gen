import React from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend
} from "recharts";

interface ChartData {
  type: 'pie' | 'bar' | 'line';
  title: string;
  data: Array<{
    name: string;
    value: number;
    fill?: string;
  }>;
  dataKey: string;
  nameKey: string;
  xAxisKey?: string;
  yAxisKey?: string;
}

interface ChartDisplayProps {
  chartData: ChartData;
}

const ChartDisplay: React.FC<ChartDisplayProps> = ({ chartData }) => {
  const { type, title, data, dataKey, nameKey } = chartData;

  // Create chart config for the UI components
  const chartConfig = data.reduce((config, item, index) => {
    config[item.name] = {
      label: item.name,
      color: item.fill || `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
    };
    return config;
  }, {} as any);

  const renderPieChart = () => (
    <div className="w-full h-[400px] p-4">
      <ChartContainer
        config={chartConfig}
        className="w-full h-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={120}
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill || `hsl(${(index * 137.5) % 360}, 70%, 50%)`} 
                />
              ))}
            </Pie>
            <Legend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{ paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );

  const renderBarChart = () => (
    <div className="w-full h-[400px] p-4">
      <ChartContainer config={chartConfig} className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={nameKey}
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar 
              dataKey={dataKey} 
              radius={4}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill || `hsl(${(index * 137.5) % 360}, 70%, 50%)`} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );

  const renderLineChart = () => (
    <div className="w-full h-[400px] p-4">
      <ChartContainer config={chartConfig} className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={nameKey}
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Line 
              type="monotone"
              dataKey={dataKey}
              stroke="#8884d8"
              strokeWidth={3}
              dot={{ fill: "#8884d8", strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );

  return (
    <div className="w-full max-w-full space-y-4 overflow-hidden">
      <div className="text-center px-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      </div>
      
      <div className="w-full max-w-full overflow-hidden">
        {type === 'pie' && renderPieChart()}
        {type === 'bar' && renderBarChart()}
        {type === 'line' && renderLineChart()}
      </div>
      
      {/* Data summary */}
      <div className="text-sm text-gray-600 dark:text-gray-400 text-center px-4">
        Showing {data.length} categories with {data.reduce((sum, item) => sum + item.value, 0)} total items
      </div>
    </div>
  );
};

export default ChartDisplay;
