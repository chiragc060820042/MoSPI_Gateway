import axios from 'axios';

const SUPABASE_API_KEY = import.meta.env.VITE_SUPABASE_API_KEY;
export const SUPABASE_URL = 'https://odaheneiylpxohcnoptl.supabase.co/rest/v1';

const supabaseHeaders = {
  apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYWhlbmVpeWxweG9oY25vcHRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NjMyNjYsImV4cCI6MjA3MDMzOTI2Nn0.1msltYNGpw-tBS8dScTT3b_eiQOHd-CeFsKiVyk4cYw',
  Authorization: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYWhlbmVpeWxweG9oY25vcHRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NjMyNjYsImV4cCI6MjA3MDMzOTI2Nn0.1msltYNGpw-tBS8dScTT3b_eiQOHd-CeFsKiVyk4cYw`,
  'Content-Type': 'application/json'
};

// 1. Get all distinct survey names
export async function getDistinctSurveyNames() {
  const response = await axios.post(
    `${SUPABASE_URL}/rpc/get_distinct_survey_names`,
    {},
    { headers: supabaseHeaders }
  );
  return response.data;
}

// 2. Get survey_subset & survey_year for a given survey name
export async function getSurveySubsets(surveyName) {
  const response = await axios.post(
    `${SUPABASE_URL}/rpc/get_survey_subsets`,
    { p_survey_name: surveyName },
    { headers: supabaseHeaders }
  );
  return response.data;
}

// 3. Get survey_column_names, data_types, data_info, table_name from metadata_table
export async function getSurveyMetadata(surveyName, surveyYear, surveySubset) {
  const response = await axios.post(
    `${SUPABASE_URL}/rpc/get_survey_metadata`,
    {
      p_survey_name: surveyName,
      p_survey_year: surveyYear,
      p_survey_subset: surveySubset
    },
    { headers: supabaseHeaders }
  );
  return response.data;
}

// 4. Get filtered survey data
export async function getFilteredSurveyData({ table_name, text_filters = {}, numeric_filters = {} }) {
  if (!table_name) return [];
  let url = `${SUPABASE_URL}/${encodeURIComponent(table_name)}`;

  const params = [];
  Object.entries(text_filters).forEach(([field, value]) => {
    if (value && value.trim()) {
      params.push(`${field}=ilike.*${encodeURIComponent(value)}*`);
    }
  });
  Object.entries(numeric_filters).forEach(([field, filterConfig]) => {
    if (filterConfig && filterConfig.op && filterConfig.values && filterConfig.values.length > 0) {
      const value = parseFloat(filterConfig.values[0]);
      if (!isNaN(value)) {
        let operator;
        switch (filterConfig.op) {
          case '=': operator = 'eq'; break;
          case '>': operator = 'gt'; break;
          case '<': operator = 'lt'; break;
          case '>=': operator = 'gte'; break;
          case '<=': operator = 'lte'; break;
          case '!=': operator = 'neq'; break;
          default: operator = 'eq';
        }
        params.push(`${field}=${operator}.${value}`);
      }
    }
  });
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }

  const response = await axios.get(url, { headers: supabaseHeaders });
  return response.data;
}

// Removed duplicate declaration of SUPABASE_URL