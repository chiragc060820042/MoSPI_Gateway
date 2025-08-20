import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChartBarIcon, EyeIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

function Surveys() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - in real app, fetch from API
    setTimeout(() => {
      setSurveys([
        {
          id: 1,
          name: 'Periodic Labour Force Survey (PLFS)',
          code: 'PLFS',
          description: 'Quarterly survey on employment and unemployment statistics',
          year: '2023-24',
          recordCount: '125,000',
          dataSize: '0.8 GB',
          accessLevel: 'public',
          lastUpdated: '2024-01-15'
        },
        {
          id: 2,
          name: 'Household Consumption Expenditure Survey (HCES)',
          code: 'HCES',
          description: 'Survey on household consumption patterns and expenditure',
          year: '2022-23',
          recordCount: '98,000',
          dataSize: '1.2 GB',
          accessLevel: 'public',
          lastUpdated: '2023-12-20'
        },
        {
          id: 3,
          name: 'National Sample Survey (NSS)',
          code: 'NSS',
          description: 'Multi-purpose survey covering various socio-economic indicators',
          year: '2021-22',
          recordCount: '75,000',
          dataSize: '0.4 GB',
          accessLevel: 'public',
          lastUpdated: '2023-11-10'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Available Surveys</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse and explore available MoSPI survey datasets
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {surveys.map((survey) => (
          <div key={survey.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <ChartBarIcon className="h-6 w-6 text-primary-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">{survey.name}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">{survey.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Code:</span>
                    <span className="font-medium">{survey.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Year:</span>
                    <span className="font-medium">{survey.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Records:</span>
                    <span className="font-medium">{survey.recordCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Size:</span>
                    <span className="font-medium">{survey.dataSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Access:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      survey.accessLevel === 'public' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {survey.accessLevel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Updated: {survey.lastUpdated}
              </span>
              <div className="flex space-x-2">
                <button className="btn-secondary text-sm px-3 py-1">
                  <EyeIcon className="h-4 w-4 mr-1" />
                  View Details
                </button>
                <Link
                  to={`/query/${survey.id}`}
                  className="btn-primary text-sm px-3 py-1"
                >
                  Query Data
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Surveys;
