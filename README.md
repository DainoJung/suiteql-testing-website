# SuiteQL Query Interface

A web-based interface for testing and executing NetSuite SuiteQL queries with real-time results.

## Features

- **Monaco Editor**: SQL syntax highlighting with auto-completion
- **Real-time Query Execution**: Execute SuiteQL queries against NetSuite
- **Results Display**: View results in a formatted table
- **Export Functionality**: Export results as JSON or CSV
- **Query History**: Save and reuse previous queries
- **Sample Queries**: Pre-loaded examples for common use cases

## Architecture

- **Backend**: FastAPI with NetSuite REST API integration
- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Authentication**: OAuth 1.0 for NetSuite API access

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+ and pip
- NetSuite account with REST web services enabled
- NetSuite integration record with tokens

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Ensure your `.env` file is configured with NetSuite credentials:
   ```
   NETSUITE_ACCOUNT_ID=your_account_id
   NETSUITE_CONSUMER_KEY=your_consumer_key
   NETSUITE_CONSUMER_SECRET=your_consumer_secret
   NETSUITE_TOKEN_ID=your_token_id
   NETSUITE_TOKEN_SECRET=your_token_secret
   NETSUITE_BASE_URL=https://your-account.restlets.api.netsuite.com
   ```

4. Start the FastAPI server:
   ```bash
   python main.py
   ```
   
   The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:3000`

## Usage

1. **Open the application** in your browser at `http://localhost:3000`

2. **Write your SuiteQL query** in the Monaco editor with syntax highlighting

3. **Execute the query** by clicking the "Execute Query" button or pressing Ctrl+Enter (Cmd+Enter on Mac)

4. **View results** in the formatted table on the right side

5. **Export results** as JSON or CSV using the export button

6. **Access query history** to reuse previous queries

## Sample Queries

The application includes sample queries for:
- Customer listings
- Item inventory
- Recent transactions

Click the "Samples" button in the query editor to load these examples.

## API Endpoints

### Backend (FastAPI)

- `GET /` - Health check
- `GET /health` - Backend and NetSuite connection status
- `POST /api/suiteql` - Execute SuiteQL query
- `GET /api/sample-queries` - Get sample queries

## Configuration

### NetSuite Setup

1. Create an integration record in NetSuite
2. Generate consumer key/secret and token ID/secret
3. Ensure the integration has appropriate permissions for SuiteQL
4. Update the `.env` file with your credentials

### Environment Variables

Create a `.env` file in the root directory with:

```env
NETSUITE_ACCOUNT_ID=your_account_id_here
NETSUITE_CONSUMER_KEY=your_consumer_key_here
NETSUITE_CONSUMER_SECRET=your_consumer_secret_here
NETSUITE_TOKEN_ID=your_token_id_here
NETSUITE_TOKEN_SECRET=your_token_secret_here
NETSUITE_BASE_URL=https://your-account.restlets.api.netsuite.com
```

## Troubleshooting

### Backend Issues

- **"NetSuite client not configured"**: Check your `.env` file and ensure all credentials are correct
- **"Connection error"**: Verify your NetSuite base URL and network connectivity
- **"Authentication failed"**: Verify your OAuth credentials and integration permissions

### Frontend Issues

- **"Backend Unavailable"**: Ensure the FastAPI server is running on port 8000
- **Query execution fails**: Check the browser console for error details

## Development

### Adding New Features

1. **Backend**: Add new endpoints in `backend/main.py`
2. **Frontend**: Add new components in `frontend/components/`
3. **Styling**: Use Tailwind CSS classes for consistent styling

### Testing

- Backend: Use FastAPI's automatic documentation at `http://localhost:8000/docs`
- Frontend: Use browser developer tools for debugging

## License

This project is for educational and testing purposes.