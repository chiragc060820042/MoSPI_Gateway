# MoSPI API Gateway - Frontend

A modern React.js frontend for the MoSPI (Ministry of Statistics and Programme Implementation) API Gateway, built with Vite, Tailwind CSS, and React Router.

## Features

- **Modern UI/UX**: Clean, responsive design built with Tailwind CSS
- **Authentication**: User registration, login, and profile management
- **Survey Browsing**: View available survey datasets with metadata
- **Query Builder**: Build and execute data queries (coming soon)
- **Query History**: Track your query execution history (coming soon)
- **Dashboard**: Overview of system statistics and recent activity
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **React 18**: Modern React with hooks and functional components
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Recharts**: Chart library for data visualization
- **Headless UI**: Unstyled, accessible UI components
- **Heroicons**: Beautiful SVG icons
- **Axios**: HTTP client for API calls

## Prerequisites

- Node.js 16+ 
- npm or yarn

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.jsx      # Top navigation bar
│   └── Sidebar.jsx     # Side navigation menu
├── contexts/           # React contexts
│   └── AuthContext.jsx # Authentication state management
├── pages/              # Page components
│   ├── Dashboard.jsx   # Main dashboard
│   ├── Login.jsx       # User login
│   ├── Register.jsx    # User registration
│   ├── Surveys.jsx     # Survey listing
│   ├── QueryBuilder.jsx # Query builder (placeholder)
│   ├── QueryHistory.jsx # Query history (placeholder)
│   └── Profile.jsx     # User profile (placeholder)
├── services/           # API services
│   └── authService.js  # Authentication API calls
├── App.jsx             # Main application component
├── main.jsx            # Application entry point
└── index.css           # Global styles and Tailwind imports
```

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:5000/api
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## Development

### Adding New Pages

1. Create a new component in `src/pages/`
2. Add the route to `src/App.jsx`
3. Add navigation link to `src/components/Sidebar.jsx`

### Styling

- Use Tailwind CSS utility classes for styling
- Custom components are defined in `src/index.css`
- Follow the established color scheme (primary, secondary colors)

### State Management

- Use React Context for global state (authentication)
- Use local state for component-specific data
- Consider adding Redux or Zustand for complex state if needed

## API Integration

The frontend communicates with the backend API through:

- **Authentication**: JWT-based authentication
- **API Calls**: RESTful API endpoints
- **Error Handling**: Centralized error handling with axios interceptors

## Responsive Design

- Mobile-first approach with Tailwind's responsive utilities
- Sidebar collapses to mobile menu on small screens
- All components are mobile-optimized

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11+ (with polyfills if needed)

## Contributing

1. Follow the existing code style and patterns
2. Use functional components with hooks
3. Implement proper error handling
4. Add loading states for async operations
5. Test on multiple screen sizes

## Deployment

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

### Environment Configuration

Ensure your production environment variables are properly set:

```env
VITE_API_URL=https://your-api-domain.com/api
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change the port in `vite.config.js`
2. **API connection**: Check `VITE_API_URL` environment variable
3. **Build errors**: Clear `node_modules` and reinstall dependencies

### Development Tips

- Use React DevTools for debugging
- Check browser console for errors
- Verify API endpoints are accessible
- Test responsive design on different screen sizes

## License

This project is part of the MoSPI API Gateway hackathon project.

## Support

For issues and questions, refer to the project documentation or contact the development team.
