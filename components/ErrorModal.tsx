import React from 'react'
import { X, AlertTriangle, Copy, Bug } from 'lucide-react'
import toast from 'react-hot-toast'

interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  error: {
    title: string
    message: string
    details?: string
    query?: string
    type?: 'syntax' | 'execution' | 'network' | 'validation'
  }
}

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, error }) => {
  if (!isOpen) return null

  const getErrorIcon = () => {
    switch (error.type) {
      case 'syntax':
        return <Bug className="w-8 h-8 text-red-500" />
      case 'network':
        return <AlertTriangle className="w-8 h-8 text-orange-500" />
      default:
        return <AlertTriangle className="w-8 h-8 text-red-500" />
    }
  }

  const getErrorColor = () => {
    switch (error.type) {
      case 'syntax':
        return 'border-red-200 bg-red-50'
      case 'network':
        return 'border-orange-200 bg-orange-50'
      case 'validation':
        return 'border-yellow-200 bg-yellow-50'
      default:
        return 'border-red-200 bg-red-50'
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const formatErrorMessage = (message: string) => {
    // Try to parse and format JSON error messages
    try {
      const parsed = JSON.parse(message)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return message
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {getErrorIcon()}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {error.title}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Query execution failed
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Error Message */}
            <div className={`rounded-lg border p-4 mb-4 ${getErrorColor()}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-2">Error Details</h3>
                  <pre className="text-sm text-gray-700 p-1 whitespace-pre-wrap font-mono bg-white rounded border overflow-x-auto">
                    {formatErrorMessage(error.message)}
                  </pre>
                </div>
                <button
                  onClick={() => copyToClipboard(error.message, 'Error message')}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copy error message"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Additional Details */}
            {error.details && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 mb-2">Additional Information</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {error.details}
                  </pre>
                </div>
              </div>
            )}

            {/* Query */}
            {error.query && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Query</h3>
                  <button
                    onClick={() => copyToClipboard(error.query!, 'Query')}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy Query</span>
                  </button>
                </div>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {error.query}
                  </pre>
                </div>
              </div>
            )}

            {/* Help Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Troubleshooting Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Check your query syntax for typos or missing keywords</li>
                <li>• Verify table and column names exist in NetSuite</li>
                <li>• Ensure you have proper permissions for the queried records</li>
                <li>• Try breaking complex queries into smaller parts</li>
                <li>• Check the NetSuite SuiteQL documentation for supported functions</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => copyToClipboard(
                `Error: ${error.title}\nMessage: ${error.message}\nQuery: ${error.query || 'N/A'}`,
                'Full error details'
              )}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Copy All Details
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorModal