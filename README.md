# MoSPI API Gateway - Hackathon Project

A comprehensive API Gateway for MoSPI (Ministry of Statistics and Programme Implementation) survey datasets, built with Node.js/Express backend and React.js frontend.

## 🚀 Project Overview

The MoSPI API Gateway provides secure access to statistical survey datasets with advanced privacy protection, role-based access control, and a modern web interface for data exploration and analysis.

## ✨ Features

### Backend (Node.js/Express)
- **RESTful API**: Complete REST API for survey data access
- **Authentication**: JWT-based authentication with role-based access control
- **Privacy Protection**: Cell suppression, data aggregation, and sensitive variable blocking
- **Rate Limiting**: Configurable rate limiting for API endpoints
- **Database**: PostgreSQL with Sequelize ORM
- **Security**: Helmet, CORS, input validation, and SQL injection protection

### Frontend (React.js)
- **Modern UI**: Clean, responsive design built with Tailwind CSS
- **Authentication**: User registration, login, and profile management
- **Dashboard**: Overview of system statistics and recent activity
- **Survey Browser**: View available datasets with metadata
- **Query Builder**: Build and execute data queries (coming soon)
- **Responsive Design**: Mobile-first approach with mobile navigation

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React.js      │    │   Express.js    │    │   PostgreSQL    │
│   Frontend      │◄──►│   Backend API   │◄──►│   Database      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Authentication**: JWT, bcryptjs
- **Security**: Helmet, CORS, express-rate-limit
- **Validation**: Built-in validation middleware

### Frontend
- **Framework**: React.js 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **Charts**: Recharts
- **UI Components**: Headless UI, Heroicons
- **HTTP Client**: Axios

## 📋 Prerequisites

- **Node.js**: 16+ (recommended 18+)
- **PostgreSQL**: 12+ (for backend)
- **npm** or **yarn** package manager

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd STATATHON
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp env.example .env
# Edit .env with your database credentials

# Setup database
npm run init-db

# Start development server
npm run dev
```

The backend will be running on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your API URL

# Start development server
npm run dev
```

The frontend will be running on `http://localhost:3000`

## 🔧 Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mospi_surveys
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Privacy Settings
MIN_CELL_COUNT=5
AGGREGATION_THRESHOLD=10
```

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=MoSPI API Gateway
```

## 📊 Sample Data

The system comes with pre-configured sample surveys:

1. **PLFS** (Periodic Labour Force Survey)
   - Employment and unemployment statistics
   - Quarterly data updates
   - 125,000+ records

2. **HCES** (Household Consumption Expenditure Survey)
   - Consumption patterns and expenditure data
   - Annual survey data
   - 98,000+ records

3. **NSS** (National Sample Survey)
   - Multi-purpose socio-economic indicators
   - Various survey rounds
   - 75,000+ records

## 🔐 Authentication & Security

### User Roles
- **Public**: Access to basic survey information
- **User**: Authenticated access to data queries
- **Admin**: Full system access and management

### Security Features
- JWT token-based authentication
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- Input validation and sanitization
- SQL injection protection via ORM
- CORS configuration for frontend access

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Surveys
- `GET /api/surveys` - List all surveys
- `GET /api/surveys/:id` - Get survey details
- `GET /api/surveys/:id/metadata` - Get survey metadata
- `GET /api/surveys/:id/stats` - Get survey statistics

### Data Queries
- `POST /api/query/:surveyId` - Execute data query
- `GET /api/query/history` - Query execution history
- `GET /api/query/stats` - Query statistics

## 🎨 Frontend Features

### Dashboard
- System overview with key metrics
- Recent query activity
- Quick action buttons
- Interactive charts and visualizations

### Survey Management
- Browse available datasets
- View detailed metadata
- Access control information
- Direct query building

### User Interface
- Responsive design for all devices
- Dark/light theme support
- Accessible navigation
- Loading states and error handling

## 🚀 Development

### Backend Development

```bash
cd backend

# Development mode with auto-reload
npm run dev

# Run database initialization
npm run init-db

# Production build
npm start
```

### Frontend Development

```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Database Management

```bash
cd backend

# Initialize database and sample data
npm run init-db

# Database connection test
node -e "require('./config/database').testConnection()"
```

## 🧪 Testing

### Backend Testing
- API endpoint testing with Postman/Insomnia
- Database connection testing
- Authentication flow testing

### Frontend Testing
- Component rendering in development
- Responsive design testing
- Browser compatibility testing

## 📦 Deployment

### Backend Deployment
1. Set production environment variables
2. Build and deploy to your Node.js hosting service
3. Configure PostgreSQL database
4. Set up reverse proxy (nginx recommended)

### Frontend Deployment
1. Build the production bundle: `npm run build`
2. Deploy `dist/` folder to static hosting
3. Configure environment variables for production API

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection**
   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **Frontend Build Issues**
   - Clear `node_modules` and reinstall
   - Check Tailwind CSS configuration
   - Verify all dependencies are installed

3. **API Connection**
   - Check backend server is running
   - Verify `VITE_API_URL` in frontend `.env`
   - Check CORS configuration

### Development Tips

- Use browser developer tools for frontend debugging
- Check backend console logs for API issues
- Verify database connections with `npm run init-db`
- Test responsive design on multiple screen sizes

## 🤝 Contributing

1. Follow the established code patterns
2. Use meaningful commit messages
3. Test changes thoroughly
4. Update documentation as needed

## 📄 License

This project is part of the MoSPI API Gateway hackathon project.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the code comments
3. Check the console logs
4. Contact the development team

---

**Built with ❤️ for the MoSPI API Gateway Hackathon**

*Ready for submission by tomorrow afternoon! 🚀*
