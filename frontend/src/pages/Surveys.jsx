import { useEffect, useState } from 'react';
import { getDistinctSurveyNames, getSurveySubsets, getSurveyMetadata } from '../services/surveyService';
import {
  ChartBarIcon,
  EyeIcon,
  ArrowRightIcon,
  UserGroupIcon,
  ServerIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

function Surveys() {
  const [surveyNames, setSurveyNames] = useState([]);
  const [surveyMeta, setSurveyMeta] = useState({});
  const [metadata, setMetadata] = useState({});

  useEffect(() => {
    getDistinctSurveyNames().then(names => {
      setSurveyNames(names);

      names.forEach(name => {
        getSurveySubsets(name).then(meta => {
          setSurveyMeta(prev => ({ ...prev, [name]: meta }));
        });

        getSurveySubsets(name).then(subsets => {
          if (subsets && subsets.length > 0) {
            const { survey_year, survey_subset } = subsets[0];
            getSurveyMetadata(name, survey_year, survey_subset).then(metaData => {
              setMetadata(prev => ({ ...prev, [name]: metaData }));
            });
          }
        });
      });
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Available Surveys</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse and explore available MoSPI survey datasets
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {surveyNames.length === 0 ? (
          <p className="text-gray-500">No data available</p>
        ) : (
          surveyNames.map((name) => (
            <div key={name} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <ChartBarIcon className="h-6 w-6 text-primary-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Survey description will go here.
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Code:</span>
                      <span className="font-medium">SURVEY_CODE</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Year:</span>
                      <span className="font-medium">2023-24</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Records:</span>
                      <span className="font-medium">XX,XXX</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Size:</span>
                      <span className="font-medium">X.XX GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Access:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        'public' === 'public' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        public
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Updated: 2024-01-15
                </span>
                <div className="flex space-x-2">
                  <button className="btn-secondary text-sm px-3 py-1">
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View Details
                  </button>
                  <Link
                    to={`/query/${1}`}
                    className="btn-primary text-sm px-3 py-1"
                  >
                    Query Data
                    <ArrowRightIcon className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>

              <div>
                {surveyMeta[name] && surveyMeta[name].length > 0 ? (
                  <ul>
                    {surveyMeta[name].map((meta, idx) => (
                      <li key={idx}>
                        Year: {meta.survey_year}, Subset: {meta.survey_subset}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-400">No subsets available</span>
                )}
              </div>
              <div>
                {metadata[name] && metadata[name].length > 0 ? (
                  <ul>
                    {metadata[name].map((col, idx) => (
                      <li key={idx}>
                        Column: {col.survey_column_names}, Type: {col.data_types}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-400">No metadata available</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Surveys;
