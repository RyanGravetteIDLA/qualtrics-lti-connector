# Qualtrics LTI Connector

A secure Learning Tools Interoperability (LTI) 1.3 connector that bridges Agilix Buzz LMS with Qualtrics for seamless survey integration and automated grade passback.

## Features

- 🔐 **LTI 1.3 Compliance** - Secure authentication via JWT tokens
- 📊 **Survey Management** - Create, configure, and distribute Qualtrics surveys
- 🎯 **Automated Grading** - Automatic grade calculation and passback to Agilix Buzz
- 👥 **Role-Based Access** - Different interfaces for instructors and students
- ⚡ **Real-time Updates** - Polls Qualtrics for responses every 5 minutes
- 📈 **Extra Credit Support** - Configure surveys as extra credit assignments

## Architecture

Built on Firebase platform using:
- **Firebase Functions** - Serverless backend (Node.js/TypeScript)
- **Firestore** - NoSQL database for data persistence
- **Firebase Hosting** - Static file hosting for configuration UI
- **Cloud Scheduler** - Automated polling and cleanup tasks

## Documentation

- 🚀 **[Quick Start Guide](docs/QUICK_START.md)** - Get running in 15 minutes
- 📖 **[Complete Setup Guide](docs/SETUP_GUIDE.md)** - Detailed installation instructions
- 👥 **[User Experience Guide](docs/USER_EXPERIENCE_GUIDE.md)** - What users see and do
- 🏗️ **[Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md)** - System design and data flow
- 🔒 **[Security Audit](SECURITY_AUDIT.md)** - Security analysis and recommendations

## Setup

### Prerequisites

- Node.js 18+ (upgrade to 20 recommended)
- Firebase CLI (`npm install -g firebase-tools`)
- Java (for Firebase emulators)
- Agilix Buzz LMS instance
- Qualtrics account with API access

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/qualtrics-lti-connector.git
cd qualtrics-lti-connector
```

2. Install dependencies:
```bash
npm install
cd functions && npm install
```

3. Configure environment variables:
```bash
cp functions/.env.example functions/.env
# Edit functions/.env with your API credentials
```

4. Deploy to Firebase:
```bash
firebase deploy
```

### LTI Registration in Agilix Buzz

Register the tool with these URLs:
- **Tool URL**: `https://your-project.cloudfunctions.net/api/lti/launch`
- **Login URL**: `https://your-project.cloudfunctions.net/api/lti/login`
- **JWKS URL**: `https://your-project.cloudfunctions.net/api/lti/keys`

## Usage

### For Instructors

1. Launch the tool from your Agilix Buzz course
2. Configure survey settings:
   - Qualtrics Survey ID
   - Point value
   - Extra credit option
   - Scoring type (completion/percentage/manual)
3. Students will automatically see the survey when they launch the tool

### For Students

1. Click the LTI link in your course
2. You'll be redirected to the Qualtrics survey
3. Complete the survey
4. Your grade is automatically sent back to Buzz

## API Endpoints

- `POST /api/lti/launch` - LTI 1.3 launch endpoint
- `GET /api/lti/login` - LTI login initiation
- `GET /api/lti/keys` - JWKS endpoint for public keys
- `GET /api/surveys` - List surveys for context
- `POST /api/surveys` - Create survey configuration
- `GET /api/grades/submission-status/:surveyId` - Check submission status
- `POST /api/grades/passback/:gradeId` - Manual grade passback

## Security

⚠️ **Important**: Review `SECURITY_AUDIT.md` for critical security issues that must be addressed before production use.

### Current Security Status
- Overall Score: 3/10 (Critical vulnerabilities present)
- See `SECURITY_AUDIT.md` for detailed vulnerability report

### Required Security Improvements
1. Implement proper CORS restrictions
2. Add input validation and sanitization
3. Use secure session management
4. Encrypt sensitive data
5. Add rate limiting

## Development

### Local Development

```bash
# Start Firebase emulators
firebase emulators:start

# Run TypeScript compiler in watch mode
cd functions && npm run build:watch

# Run tests
npm test
```

### Project Structure

```
├── functions/          # Firebase Functions (backend)
│   ├── src/
│   │   ├── handlers/   # Request handlers
│   │   ├── services/   # External API services
│   │   ├── types/      # TypeScript definitions
│   │   └── index.ts    # Main entry point
│   └── package.json
├── public/             # Static files (hosting)
├── firestore.rules     # Database security rules
└── firebase.json       # Firebase configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and feature requests, please use the GitHub issue tracker.

## Acknowledgments

- Built with [ltijs](https://github.com/Cvmcosta/ltijs) for LTI support
- Firebase platform for serverless infrastructure
- Qualtrics and Agilix for API integration