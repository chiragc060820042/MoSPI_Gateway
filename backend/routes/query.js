const express = require('express');
const { surveyDataService } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

// Get filtered survey data
router.post('/:surveyId', authenticateToken, async (req, res) => {
  try {
    const { surveyId } = req.params;
    const { target_table, text_filters, numeric_filters } = req.body;
    
    console.log('🔍 Processing survey data query:', { surveyId, target_table, text_filters, numeric_filters });
    
    // Validate required fields
    if (!target_table) {
      return res.status(400).json({ error: 'target_table is required' });
    }
    
    // Get filtered data from Supabase
    const filters = {
      target_table,
      text_filters: text_filters || {},
      numeric_filters: numeric_filters || {}
    };
    
    const data = await surveyDataService.getFilteredSurveyData(filters);
    
    // Log query for audit purposes
    console.log(`✅ Query executed successfully for table: ${target_table}, returned ${data?.length || 0} rows`);
    
    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      filters: filters,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Survey data query error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch survey data', 
      details: error.message 
    });
  }
});

// Get available survey tables
router.get('/tables', authenticateToken, async (req, res) => {
  try {
    const tables = await surveyDataService.getAvailableTables();
    res.json({ tables });
  } catch (error) {
    console.error('Error getting available tables:', error);
    res.status(500).json({ error: 'Failed to get available tables' });
  }
});

// Get survey metadata for a specific table
router.get('/metadata/:tableName', authenticateToken, async (req, res) => {
  try {
    const { tableName } = req.params;
    const metadata = await surveyDataService.getSurveyMetadata(tableName);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Table metadata not found' });
    }
    
    res.json({ metadata });
  } catch (error) {
    console.error('Error getting table metadata:', error);
    res.status(500).json({ error: 'Failed to get table metadata' });
  }
});

// Get query history (placeholder for future implementation)
router.get('/history', authenticateToken, async (req, res) => {
  try {
    // TODO: Implement query history tracking
    res.json({ 
      message: 'Query history endpoint - coming soon',
      history: [] 
    });
  } catch (error) {
    console.error('Error getting query history:', error);
    res.status(500).json({ error: 'Failed to get query history' });
  }
});

// Get query statistics (placeholder for future implementation)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // TODO: Implement query statistics
    res.json({ 
      message: 'Query statistics endpoint - coming soon',
      stats: {
        totalQueries: 0,
        averageResponseTime: 0,
        mostQueriedTables: []
      }
    });
  } catch (error) {
    console.error('Error getting query stats:', error);
    res.status(500).json({ error: 'Failed to get query statistics' });
  }
});

// Default query endpoint (when no specific survey ID is provided)
router.post('/default', authenticateToken, async (req, res) => {
  try {
    const { target_table, text_filters, numeric_filters } = req.body;
    
    console.log('🔍 Processing default survey data query:', { target_table, text_filters, numeric_filters });
    
    // Validate required fields
    if (!target_table) {
      return res.status(400).json({ error: 'target_table is required' });
    }
    
    // Get filtered data from Supabase
    const filters = {
      target_table,
      text_filters: text_filters || {},
      numeric_filters: numeric_filters || {}
    };
    
    const data = await surveyDataService.getFilteredSurveyData(filters);
    
    // Log query for audit purposes
    console.log(`✅ Default query executed successfully for table: ${target_table}, returned ${data?.length || 0} rows`);
    
    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      filters: filters,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Default survey data query error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch survey data', 
      details: error.message 
    });
  }
});

// Test endpoint for development
router.get('/test/:surveyId', authenticateToken, async (req, res) => {
  try {
    const { surveyId } = req.params;
    
    // Test with sample filters
    const testFilters = {
      target_table: 'survey_data',
      text_filters: { survey_name: 'HCES' },
      numeric_filters: {
        state: { op: '=', values: [10] },
        multiplier: { op: '>', values: [100000] }
      }
    };
    
    console.log('🧪 Testing survey data query with filters:', testFilters);
    
    const data = await surveyDataService.getFilteredSurveyData(testFilters);
    
    res.json({
      message: 'Test query successful',
      surveyId,
      testFilters,
      resultCount: data?.length || 0,
      sampleData: data?.slice(0, 3) || [] // Return first 3 rows as sample
    });
    
  } catch (error) {
    console.error('❌ Test query error:', error);
    res.status(500).json({ 
      error: 'Test query failed', 
      details: error.message 
    });
  }
});

// Create table dynamically from JSON configuration
router.post('/create-table', authenticateToken, requireRole(['admin', 'researcher']), async (req, res) => {
  try {
    const { if_not_exists, columns, dest_table } = req.body;
    
    console.log('🔧 Table creation request:', { if_not_exists, columns, dest_table });
    
    // Validate required fields
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({ 
        error: 'Columns array is required and must not be empty' 
      });
    }
    
    if (!dest_table) {
      return res.status(400).json({ 
        error: 'Destination table name is required' 
      });
    }
    
    // Validate column structure
    for (const column of columns) {
      if (!column.name || !column.type) {
        return res.status(400).json({ 
          error: 'Each column must have name and type properties' 
        });
      }
    }
    
    // Create table using Supabase RPC
    const result = await surveyDataService.createTableFromJson({
      if_not_exists: if_not_exists !== false, // Default to true
      columns,
      dest_table
    });
    
    res.json({
      success: true,
      message: 'Table created successfully',
      table: dest_table,
      result
    });
    
  } catch (error) {
    console.error('❌ Table creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create table', 
      details: error.message 
    });
  }
});

module.exports = router;
