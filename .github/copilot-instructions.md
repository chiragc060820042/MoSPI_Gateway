# Copilot Instructions for MoSPI API Gateway

## Overview
The MoSPI API Gateway is a full-stack project designed to provide secure access to statistical survey datasets. It consists of a **Node.js/Express backend** and a **React.js frontend**, with PostgreSQL as the database. The project emphasizes privacy protection, role-based access control, and a modern user interface for data exploration.

## Architecture
The project is divided into two main components:

1. **Backend** (`backend/`):
   - RESTful API built with Express.js.
   - PostgreSQL database with Sequelize ORM.
   - Privacy features like cell suppression and data aggregation.
   - JWT-based authentication and role-based access control.

2. **Frontend** (`frontend/`):
   - React.js application built with Vite.
   - Tailwind CSS for styling.
   - Features include dashboards, survey browsing, and query building.

### Data Flow
- The frontend communicates with the backend via RESTful API endpoints.
- The backend interacts with the PostgreSQL database to fetch and manipulate data.
- Privacy and security are enforced at the backend level.

## Developer Workflows

### Backend
1. **Setup**:
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Edit .env with database credentials
   npm run init-db
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Database Initialization**:
   ```bash
   npm run init-db
   ```

4. **Testing API Endpoints**:
   Use tools like Postman or Insomnia to test endpoints.

### Frontend
1. **Setup**:
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with API URL
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

4. **Preview Production Build**:
   ```bash
   npm run preview
   ```

## Project-Specific Conventions

### Backend
- **Folder Structure**:
  - `config/`: Database and app configuration.
  - `middleware/`: Authentication and privacy middleware.
  - `models/`: Sequelize models.
  - `routes/`: API route handlers.

- **Environment Variables**:
  - Example:
    ```env
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=mospi_surveys
    JWT_SECRET=your_secret
    ```

- **Scripts**:
  - `npm run dev`: Start development server.
  - `npm run init-db`: Initialize database.

### Frontend
- **Folder Structure**:
  - `components/`: Reusable UI components.
  - `pages/`: Page components (e.g., Dashboard, Login).
  - `services/`: API service functions.

- **Styling**:
  - Use Tailwind CSS utility classes.
  - Follow the established color scheme.

- **Environment Variables**:
  - Example:
    ```env
    VITE_API_URL=http://localhost:5000/api
    ```

## Integration Points
- **Backend API**:
  - Authentication: `POST /api/auth/login`, `POST /api/auth/register`.
  - Surveys: `GET /api/surveys`, `GET /api/surveys/:id`.
  - Queries: `POST /api/query/:surveyId`.

- **Frontend**:
  - Communicates with the backend using Axios.
  - Centralized error handling via Axios interceptors.

## External Dependencies
- **Backend**:
  - `express`, `sequelize`, `jsonwebtoken`, `bcryptjs`, `dotenv`.
- **Frontend**:
  - `react`, `vite`, `tailwindcss`, `axios`, `react-router-dom`.

## Examples

### Backend: Adding a New API Endpoint
1. Create a new route in `routes/`.
2. Add the route to `server.js`.
3. Example:
   ```js
   router.get('/new-endpoint', (req, res) => {
       res.json({ message: 'New endpoint' });
   });
   ```

### Frontend: Adding a New Page
1. Create a new component in `src/pages/`.
2. Add the route to `src/App.jsx`.
3. Example:
   ```jsx
   <Route path="/new-page" element={<NewPage />} />
   ```

## Testing
- Use Postman for backend API testing.
- Test frontend components in development mode.
- Ensure responsive design on multiple screen sizes.

## Deployment
- **Backend**:
  - Set `NODE_ENV=production`.
  - Use a strong `JWT_SECRET`.
  - Configure PostgreSQL for production.
- **Frontend**:
  - Build the production bundle: `npm run build`.
  - Deploy the `dist/` folder to a static hosting service.

---

For further details, refer to the `README.md` files in the `backend/` and `frontend/` directories.
