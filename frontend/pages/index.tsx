import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import QueryEditor from '../components/QueryEditor'
import ResultsDisplay from '../components/ResultsDisplay'
import { Database, Activity, AlertCircle } from 'lucide-react'
import axios from 'axios'

interface QueryResult {
  success: boolean
  data: any
  query: string
  parameters?: any
}

interface HealthStatus {
  status: string
  netsuite_configured: boolean
}

export default function Home() {
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [isCheckingHealth, setIsCheckingHealth] = useState(true)

  useEffect(() => {
    checkBackendHealth()
  }, [])

  const checkBackendHealth = async () => {
    try {
      const response = await axios.get('http://localhost:8000/health')
      setHealthStatus(response.data)
    } catch (error) {
      console.error('Health check failed:', error)
      setHealthStatus({ status: 'unhealthy', netsuite_configured: false })
    } finally {
      setIsCheckingHealth(false)
    }
  }

  const handleQueryResult = (result: QueryResult) => {
    setQueryResult(result)
  }

  return (
    <>
      <Head>
        <title>SuiteQL Query Interface</title>
        <meta name="description" content="NetSuite SuiteQL query testing interface" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Database className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">SuiteQL Interface</h1>
                  <p className="text-sm text-gray-500">NetSuite Data Query Tool</p>
                </div>
              </div>
              
              {/* Health Status */}
              <div className="flex items-center space-x-4">
                {isCheckingHealth ? (
                  <div className="flex items-center text-sm text-gray-500">
                    <Activity className="w-4 h-4 mr-2 animate-pulse" />
                    Checking connection...
                  </div>
                ) : healthStatus?.status === 'healthy' ? (
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-green-700">
                      Backend Connected
                      {healthStatus.netsuite_configured && ' • NetSuite Ready'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                    <span className="text-sm text-red-700">Backend Unavailable</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!healthStatus?.netsuite_configured && !isCheckingHealth && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">NetSuite Configuration Required</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Please ensure your .env file contains valid NetSuite credentials and restart the backend server.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Query Editor */}
            <div className="lg:col-span-1">
              <QueryEditor onQueryResult={handleQueryResult} />
            </div>

            {/* Results Display */}
            <div className="lg:col-span-1">
              <ResultsDisplay result={queryResult} />
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Getting Started</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">1. Write Your Query</h3>
                <p className="text-gray-600">
                  Use the Monaco editor to write SuiteQL queries with syntax highlighting and auto-completion.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-2">2. Execute</h3>
                <p className="text-gray-600">
                  Click the "Execute Query" button or press Ctrl+Enter (Cmd+Enter on Mac) to run your query.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-2">3. View Results</h3>
                <p className="text-gray-600">
                  Review the results in a table format and export them as JSON or CSV if needed.
                </p>
              </div>
            </div>
            
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-md">
                <h4 className="font-medium text-blue-800 mb-2">Sample Queries</h4>
                <p className="text-sm text-blue-700">
                  Click the "Samples" button in the query editor to load example SuiteQL queries for common use cases.
                </p>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-md">
                <h4 className="font-medium text-yellow-800 mb-2">NetSuite SuiteQL Tips</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Use <code className="bg-yellow-100 px-1 rounded">RowNum &lt;= N</code> instead of <code>LIMIT N</code></li>
                  <li>• Use <code className="bg-yellow-100 px-1 rounded">SYSDATE</code> for current date</li>
                  <li>• Table names are case-sensitive (e.g., <code>Transaction</code>, <code>customer</code>)</li>
                  <li>• Always include <code>WHERE RowNum &lt;= 1000</code> for performance</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}