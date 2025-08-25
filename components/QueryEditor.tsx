import React, { useState, useRef, useEffect, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { Play, Download, History, Save, Loader2 } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_ENDPOINTS } from '../config/api'
import ErrorModal from './ErrorModal'

interface QueryResult {
  success: boolean
  data: any
  query: string
  parameters?: any
}

interface QueryEditorProps {
  onQueryResult: (result: QueryResult) => void
}

const QueryEditor: React.FC<QueryEditorProps> = ({ onQueryResult }) => {
  const [query, setQuery] = useState(`-- NetSuite SuiteQL Sample Query
SELECT 
  id,
  entityid,
  companyname,
  email
FROM customer 
WHERE isinactive = 'F'
AND RowNum <= 10`)
  
  const [isExecuting, setIsExecuting] = useState(false)
  const [queryHistory, setQueryHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const editorRef = useRef<any>(null)
  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean
    error: {
      title: string
      message: string
      details?: string
      query?: string
      type?: 'syntax' | 'execution' | 'network' | 'validation'
    }
  }>({
    isOpen: false,
    error: { title: '', message: '' }
  })

  // Global keyboard shortcut as backup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        // Only trigger if the active element is within the monaco editor
        const activeElement = document.activeElement
        if (activeElement && activeElement.closest('.monaco-editor')) {
          e.preventDefault()
          executeQuery()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const executeQuery = useCallback(async () => {
    const currentQuery = editorRef.current?.getValue() || query
    
    if (!currentQuery.trim()) {
      toast.error('Please enter a query')
      return
    }

    setIsExecuting(true)
    
    try {
      console.log('Executing query:', currentQuery.trim())
      
      const response = await axios.post(API_ENDPOINTS.suiteql, {
        query: currentQuery.trim()
      })

      const result = response.data
      onQueryResult(result)
      
      // Add to history
      setQueryHistory(prev => {
        if (!prev.includes(currentQuery.trim())) {
          return [currentQuery.trim(), ...prev.slice(0, 9)] // Keep last 10 queries
        }
        return prev
      })
      
      toast.success('Query executed successfully')
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to execute query'
      
      // Determine error type based on error details
      let errorType: 'syntax' | 'execution' | 'network' | 'validation' = 'execution'
      let errorTitle = 'Query Execution Error'
      
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        errorType = 'network'
        errorTitle = 'Network Connection Error'
      } else if (error.response?.status === 400) {
        errorType = 'syntax'
        errorTitle = 'Query Syntax Error'
      } else if (error.response?.status === 422) {
        errorType = 'validation'
        errorTitle = 'Query Validation Error'
      }

      // Show prominent error modal
      setErrorModal({
        isOpen: true,
        error: {
          title: errorTitle,
          message: errorMessage,
          details: error.response?.data?.message || error.message,
          query: currentQuery.trim(),
          type: errorType
        }
      })

      // Also show toast for quick notification
      toast.error(`${errorTitle}: Click for details`, {
        duration: 6000,
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          border: '1px solid #FECACA',
          fontSize: '14px',
          fontWeight: '500'
        }
      })
      
      console.error('Query execution error:', error)
    } finally {
      setIsExecuting(false)
    }
  }, [onQueryResult, query])

  const loadSampleQueries = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/sample-queries')
      const samples = response.data.queries
      
      // Show samples in a simple format for now
      const sampleText = samples.map((sample: any) => 
        `-- ${sample.name}: ${sample.description}\n${sample.query}`
      ).join('\n\n')
      
      setQuery(sampleText)
      toast.success('Sample queries loaded')
    } catch (error) {
      toast.error('Failed to load sample queries')
    }
  }

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor
    
    // Track editor focus state
    editor.onDidFocusEditorText(() => setIsEditorFocused(true))
    editor.onDidBlurEditorText(() => setIsEditorFocused(false))
    
    // Add keyboard shortcut for Ctrl+Enter or Cmd+Enter
    // Using addCommand instead of addAction for better compatibility
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      executeQuery()
    })
  }, [executeQuery])

  const exportQuery = () => {
    const blob = new Blob([query], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'suiteql-query.sql'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Query exported')
  }

  const selectFromHistory = (historicalQuery: string) => {
    setQuery(historicalQuery)
    setShowHistory(false)
    toast.success('Query loaded from history')
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">SuiteQL Query Editor</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            <History className="w-4 h-4 mr-2" />
            History
          </button>
          <button
            onClick={loadSampleQueries}
            className="flex items-center px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            Samples
          </button>
          <button
            onClick={exportQuery}
            className="flex items-center px-3 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {showHistory && queryHistory.length > 0 && (
        <div className="mb-4 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Query History</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {queryHistory.map((historicalQuery, index) => (
              <div
                key={index}
                onClick={() => selectFromHistory(historicalQuery)}
                className="p-2 bg-white rounded border border-gray-200 hover:border-blue-300 cursor-pointer text-sm text-gray-600 truncate"
              >
                {historicalQuery.substring(0, 100)}...
              </div>
            ))}
          </div>
        </div>
      )}

      <div 
        className="monaco-editor-container mb-4"
        onKeyDown={useCallback((e: React.KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault()
            executeQuery()
          }
        }, [executeQuery])}
      >
        <Editor
          height="405px"
          language="sql"
          value={query}
          onChange={(value) => setQuery(value || '')}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 15,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            suggest: {
              snippetsPreventQuickSuggestions: false
            }
          }}
          theme="vs-light"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Press Ctrl+Enter (Cmd+Enter on Mac) to execute query
        </div>
        <button
          onClick={executeQuery}
          disabled={isExecuting || !query.trim()}
          className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
        >
          {isExecuting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          {isExecuting ? 'Executing...' : 'Execute Query'}
        </button>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        error={errorModal.error}
      />
    </>
  )
}

export default QueryEditor