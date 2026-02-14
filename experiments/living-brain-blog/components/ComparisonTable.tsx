'use client';

import { Check, AlertTriangle, X } from 'lucide-react';

const ComparisonTable = () => {
  const data = [
    {
      feature: 'Context Efficiency',
      antigravity: <Check className="text-green-500" />,
      cursor: <AlertTriangle className="text-yellow-500" />,
      claude: <X className="text-red-500" />,
    },
    {
      feature: 'State Persistence',
      antigravity: <Check className="text-green-500" />,
      cursor: <AlertTriangle className="text-yellow-500" />,
      claude: <X className="text-red-500" />,
    },
    {
      feature: 'Scalability',
      antigravity: <Check className="text-green-500" />,
      cursor: <AlertTriangle className="text-yellow-500" />,
      claude: <X className="text-red-500" />,
    },
    {
      feature: 'Cost',
      antigravity: <Check className="text-green-500" />,
      cursor: <AlertTriangle className="text-yellow-500" />,
      claude: <X className="text-red-500" />,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-300 bg-white">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-300">
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Feature</th>
            <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">MyContext Antigravity</th>
            <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Cursor</th>
            <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Claude</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className={`border-b ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
            >
              <td className="px-4 py-2 text-sm text-gray-700">{row.feature}</td>
              <td className="px-4 py-2 text-center">{row.antigravity}</td>
              <td className="px-4 py-2 text-center">{row.cursor}</td>
              <td className="px-4 py-2 text-center">{row.claude}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComparisonTable;