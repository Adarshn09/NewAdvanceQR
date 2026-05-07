# QR Code Manager

## Overview

This is a full-stack QR code management application built with React frontend and Express.js backend. The application allows users to generate QR codes from various input types (URLs, text, custom content), manage their QR code collection, and track analytics on QR code usage. The system provides a clean, modern interface for creating, editing, and monitoring QR codes with click tracking capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Built with shadcn/ui component library and Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Component Structure**: Modular component architecture with separate pages, components, and UI components

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **API Design**: RESTful API endpoints for QR code CRUD operations
- **Data Storage**: Dual storage approach with in-memory storage (MemStorage) and database integration
- **Development Server**: Vite integration for hot module replacement in development

### Database Schema
- **Users Table**: Basic user management with username/password authentication
- **QR Codes Table**: Comprehensive QR code storage including:
  - Short code generation for URL shortening
  - Original input and processed target URL
  - Input type classification (url, text, custom)
  - QR code configuration (error correction, size)
  - Click tracking and timestamps
  - Redirect capability toggle

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon Database serverless connection
- **ORM**: Drizzle ORM for type-safe database operations
- **Fallback Storage**: In-memory storage implementation for development/testing
- **Migration System**: Drizzle Kit for database schema migrations

### Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **User Authentication**: Username/password based authentication
- **Password Security**: Basic password storage (would need enhancement for production)

### Key Features
- **QR Code Generation**: Multiple input types with customizable settings
- **URL Shortening**: Short code generation for QR code redirects
- **Analytics Dashboard**: Click tracking and usage statistics
- **QR Code Management**: Edit, delete, and organize QR codes
- **Responsive Design**: Mobile-first design with responsive breakpoints

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL database hosting
- **Connection**: @neondatabase/serverless for database connectivity

### UI and Styling
- **shadcn/ui**: Comprehensive UI component library
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography

### Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind and Autoprefixer

### Form and Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema validation
- **@hookform/resolvers**: Integration between React Hook Form and Zod

### QR Code Processing
- **qrcode**: Server-side QR code generation library
- **Custom URL Processing**: Input type detection and URL validation

### SEO and Search Engine Optimization
- **Meta Tags**: Comprehensive SEO meta tags including title, description, keywords, and Open Graph tags
- **Structured Data**: JSON-LD schema markup for web application with feature listings
- **Semantic HTML**: Proper heading hierarchy and semantic elements for better crawlability
- **Content Optimization**: SEO-friendly content with relevant keywords and descriptions
- **Sitemap**: XML sitemap for search engine indexing
- **Robots.txt**: Search engine crawler instructions and sitemap location
- **Social Media**: Open Graph and Twitter Card meta tags for social sharing

### Development and Deployment
- **Replit Integration**: Cartographer plugin and runtime error overlay for Replit environment
- **Environment Configuration**: Environment-based configuration for database and development settings
