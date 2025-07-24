# Instagram DM Bot Application

## Overview

This is a full-stack application that creates an Instagram DM bot using Express.js backend with React frontend. The application receives Instagram direct messages via webhooks, processes them through an AI service (OpenAI GPT-4), and sends automated responses back to users.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a monorepo structure with a clear separation between client and server code, sharing common schema definitions. It uses a modern web stack with TypeScript throughout.

### Directory Structure
- `client/` - React frontend with Vite build system
- `server/` - Express.js backend with TypeScript
- `shared/` - Common schema definitions and types
- `migrations/` - Database migration files

## Key Components

### Backend Architecture
- **Express.js Server**: Main application server handling API routes and webhook endpoints
- **Instagram API Integration**: Handles webhook verification and message processing
- **AI Service Integration**: Uses OpenAI GPT-4 for generating intelligent responses
- **Database Layer**: Uses Drizzle ORM with PostgreSQL for data persistence (fully implemented)
- **Webhook Event Storage**: All Instagram DM events are now persisted to PostgreSQL database

### Frontend Architecture
- **React with TypeScript**: Modern React application using functional components
- **Shadcn/UI Components**: Comprehensive UI component library based on Radix UI
- **TanStack Query**: State management and data fetching
- **Tailwind CSS**: Utility-first styling framework
- **Wouter**: Lightweight client-side routing

### Database Schema
- **Users Table**: Basic user management with username/password
- **Webhook Events Table**: Logs all Instagram webhook events with message tracking

## Data Flow

1. **Webhook Reception**: Instagram sends DM events to `/webhook` endpoint
2. **Message Processing**: Incoming messages are validated and logged
3. **AI Response Generation**: User messages are sent to OpenAI GPT-4 for response generation
4. **Response Delivery**: Generated responses are sent back via Instagram API
5. **Event Logging**: All interactions are stored in the database for tracking

## External Dependencies

### Core Services
- **Instagram Graph API**: For receiving DMs and sending responses
- **OpenAI API**: GPT-4 integration for intelligent message processing
- **PostgreSQL**: Primary database (with Neon Database as cloud provider)

### Development Tools
- **Vite**: Frontend build tool and development server
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Backend bundling for production

### UI Framework
- **Radix UI**: Headless component primitives
- **Tailwind CSS**: Styling framework
- **Lucide React**: Icon library

## Authentication and Authorization

The application implements basic username/password authentication for the dashboard. Instagram webhook security is handled through:
- Webhook verification tokens for initial setup
- Signature verification using app secret for incoming requests

## External Service Integrations

### Instagram Integration
- Webhook endpoint for receiving DM events
- Graph API for sending messages with quick reply buttons
- Signature verification for security

### OpenAI Integration
- GPT-4 model for generating conversational responses
- Fallback responses when API is unavailable
- Configurable via environment variables

## Deployment Strategy

### Environment Configuration
Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `IG_VERIFY_TOKEN`: Instagram webhook verification token
- `IG_PAGE_TOKEN`: Instagram page access token
- `IG_APP_SECRET`: Instagram app secret for signature verification
- `OPENAI_API_KEY`: OpenAI API key for GPT-4 access

### Build Process
- Frontend: Vite builds React app to `dist/public`
- Backend: ESBuild bundles server code to `dist/index.js`
- Database: Drizzle manages schema migrations

### Production Considerations
- Session storage using PostgreSQL with connect-pg-simple
- Error handling and logging for webhook events
- Graceful fallbacks when external services are unavailable
- Static file serving for the React application

The application is designed to be deployed on platforms that support Node.js with PostgreSQL databases, such as Railway, Vercel, or similar cloud platforms.

## Recent Changes

**July 24, 2025:**
- ✅ **Instagram DM Bot Fully Functional**: Bot successfully processes test messages, generates AI responses via GPT-4, and sends responses through Instagram API
- ✅ **Instagram API Integration Complete**: Using correct graph.instagram.com/v21.0/me/messages endpoint with Instagram User Access Token format
- ✅ **Message Flow Confirmed**: Bot receives webhook events, processes through OpenAI, sends responses with successful message_id confirmations
- ✅ **Meta Developer Console Configured**: User has properly configured webhooks and generated personal Instagram token
- ✅ **Loop MC System Context Implemented**: Bot now responds as "MC" with proper Loop music networking assistant personality
- ✅ **ACTION Block System**: Integrated structured output system for routing user intents to Loop dashboard widgets
- ✅ **Quick Reply Integration**: Messages now include "Open Loop Dashboard" quick reply buttons
- **Status**: Bot fully operational with proper Loop MC context and dashboard integration