# MoSPI API Gateway - Backend

A scalable, configurable, and privacy-compliant API Gateway for MoSPI microdata datasets.

## 🚀 Features

- **RESTful API Layer** for querying filtered subsets of data
- **Role-based Access Control** with JWT authentication
- **Privacy Protection** with cell suppression and data aggregation
- **Rate Limiting** and usage tracking
- **Survey-specific Configurations** for variables, metadata, and relationships
- **PostgreSQL Database** with Sequelize ORM
- **DPDP-Aligned Privacy Features** for data protection

## 🏗️ Architecture

```
Backend/
├── config/          # Database and app configuration
├── middleware/      # Authentication and privacy middleware
├── models/          # Sequelize data models
├── routes/          # API route handlers
├── server.js        # Main Express server
└── package.json     # Dependencies and scripts
```

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Authentication**: JWT + bcrypt
- **Security**: Helmet, CORS, Rate Limiting
- **Privacy**: Cell suppression, data aggregation

## 📋 Prerequisites

- Node.js >= 16.0.0
- PostgreSQL >= 12.0
- npm or yarn

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd backend
npm install
```

### 2. Environment Setup

Copy the environment template and configure:

```bash
cp env.example .env
```

Edit `.env` with your database credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mospi_surveys
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=24h
```

### 3. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE mospi_surveys;
```

### 4. Initialize Database

```bash
npm run init-db
```

This will:
- Create database tables
- Set up sample surveys (PLFS, HCES, NSS)
- Create admin user (admin/admin123)

### 5. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:5000`

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/generate-api-key` - Generate new API key

### Surveys
- `GET /api/surveys` - List all surveys
- `GET /api/surveys/:id` - Get survey details
- `GET /api/surveys/:id/metadata` - Get survey metadata
- `GET /api/surveys/:id/stats` - Get survey statistics

### Data Query
- `POST /api/query/:surveyId` - Execute data query
- `GET /api/query/history` - Get query history
- `GET /api/query/stats` - Get query statistics
- `GET /api/query/test/:surveyId` - Test query structure

### Health Check
- `GET /health` - API health status

## 🔐 Authentication

### JWT Token
Include in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### API Key
Include in headers or query:
```
X-API-Key: <your_api_key>
```

## 📝 Query Examples

### Basic Query
```json
POST /api/query/PLFS
{
  "filters": {
    "state": "Maharashtra",
    "gender": "female",
    "age": "15-29"
  },
  "select": ["state", "gender", "age", "employment_status"],
  "limit": 100
}
```

### Aggregated Query
```json
POST /api/query/PLFS
{
  "filters": {
    "state": "Maharashtra"
  },
  "select": ["state", "employment_status"],
  "groupBy": ["state", "employment_status"],
  "aggregation": "count"
}
```

## 🛡️ Privacy Features

- **Cell Suppression**: Results with <5 records are masked
- **Data Aggregation**: Large result sets are automatically aggregated
- **Sensitive Variable Blocking**: Restricted variables are redacted
- **Query Validation**: Prevents overly specific queries

## 👥 User Roles

- **researcher**: Basic access to public datasets
- **policymaker**: Access to restricted datasets
- **developer**: API access with rate limits
- **admin**: Full access and management

## 📈 Rate Limiting

- **Default**: 100 requests per 15 minutes
- **Role-based**: Different limits for different user types
- **Survey-based**: Premium surveys have stricter limits

## 🚨 Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server with nodemon
npm run start        # Start production server
npm run init-db      # Initialize database with sample data
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | mospi_surveys |
| `JWT_SECRET` | JWT signing secret | required |
| `MIN_CELL_COUNT` | Privacy threshold | 5 |
| `AGGREGATION_THRESHOLD` | Aggregation threshold | 10 |

## 🧪 Testing

Test the API endpoints using the provided test data:

1. **Health Check**: `GET /health`
2. **Sample Query**: `GET /api/query/test/PLFS`
3. **Survey List**: `GET /api/surveys`

## 📚 Sample Data

The system comes with pre-configured surveys:

- **PLFS 2023**: Employment and unemployment data
- **HCES 2022**: Household consumption expenditure
- **NSS Employment 2021**: Employment statistics

## 🔒 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: API abuse prevention
- **Input Validation**: SQL injection prevention
- **JWT Authentication**: Secure token-based auth

## 🚀 Production Deployment

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Configure production database
4. Set up reverse proxy (nginx)
5. Enable HTTPS
6. Monitor logs and performance

## 🤝 Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure privacy compliance

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For hackathon support, contact the development team or check the project documentation.
