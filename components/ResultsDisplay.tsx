import React, { useState } from 'react'
import { Download, FileText, Table as TableIcon, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface QueryResult {
  success: boolean
  data: any
  query: string
  parameters?: any
}

interface ResultsDisplayProps {
  result: QueryResult | null
}

// SELECT 문에서 컬럼 순서 추출하는 함수
const extractColumnOrder = (query: string): string[] => {
  if (!query) return []
  
  try {
    // SELECT와 FROM 사이의 부분 추출
    const selectMatch = query.match(/SELECT\s+([\s\S]*?)\s+FROM/i)
    if (!selectMatch) return []
    
    const selectPart = selectMatch[1]
    
    // 컬럼들을 분리하고 정리
    const columns = selectPart
      .split(',')
      .map(col => {
        // 별칭이 있는 경우 (AS 키워드 사용)
        const asMatch = col.match(/\s+AS\s+(\w+)/i)
        if (asMatch) return asMatch[1].trim()
        
        // 테이블.컬럼 형태인 경우 컬럼명만 추출
        const dotMatch = col.match(/\w+\.(\w+)/)
        if (dotMatch) return dotMatch[1].trim()
        
        // 일반 컬럼명
        return col.trim()
      })
      .filter(col => col && col !== '*')
    
    return columns
  } catch (error) {
    console.warn('Failed to extract column order:', error)
    return []
  }
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result }) => {
  const [viewFormat, setViewFormat] = useState<'json' | 'csv'>('json')

  if (!result) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-gray-500 py-12">
          <TableIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No Results</h3>
          <p className="text-sm text-gray-400">Execute a query to see results here</p>
        </div>
      </div>
    )
  }

  if (!result.success) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-red-700">Query Execution Failed</h3>
            <p className="text-sm text-red-600 mt-1">The query returned an error response</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-red-800 mb-2">Error Details:</h4>
          <pre className="text-sm text-red-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border overflow-x-auto">
            {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">What to try:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Check your query syntax for any typos</li>
            <li>• Verify table and column names</li>
            <li>• Ensure you have the required permissions</li>
            <li>• Try simplifying complex joins or conditions</li>
          </ul>
        </div>
      </div>
    )
  }

  const { data } = result
  const items = data?.items || data?.data || []
  const hasNext = data?.hasMore || false
  const count = data?.count || items?.length || 0

  const exportResults = () => {
    if (!items.length) {
      toast.error('No data to export')
      return
    }

    let content = ''
    let filename = ''
    let mimeType = ''

    if (viewFormat === 'json') {
      content = JSON.stringify(items, null, 2)
      filename = 'suiteql-results.json'
      mimeType = 'application/json'
    } else {
      // CSV export
      if (items.length > 0) {
        // SELECT 순서대로 헤더 정렬
        const columnOrder = extractColumnOrder(result.query)
        const availableKeys = Object.keys(items[0]).filter(key => key !== 'links')
        const orderedHeaders = columnOrder.length > 0 
          ? columnOrder.filter(col => availableKeys.includes(col))
              .concat(availableKeys.filter(key => !columnOrder.includes(key)))
          : availableKeys
          
        const csvHeaders = orderedHeaders.join(',')
        const csvRows = items.map((item: any) => 
          orderedHeaders.map(header => {
            const value = item[header]
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value || ''
          }).join(',')
        )
        content = [csvHeaders, ...csvRows].join('\n')
      }
      filename = 'suiteql-results.csv'
      mimeType = 'text/csv'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success(`Results exported as ${viewFormat.toUpperCase()}`)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Query Results</h3>
          <p className="text-sm text-gray-600">
            {count > 0 ? `${count} record${count !== 1 ? 's' : ''}` : 'No records'} found
            {hasNext && ' (more available)'}
          </p>
        </div>
        
        {items.length > 0 && (
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">View:</label>
            <select
              value={viewFormat}
              onChange={(e) => setViewFormat(e.target.value as 'json' | 'csv')}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="json">JSON</option>
              <option value="csv">Table</option>
            </select>
            <button
              onClick={exportResults}
              className="flex items-center px-3 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export as {viewFormat.toUpperCase()}
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No data returned from query</p>
        </div>
      ) : (
        <div className="result-container">
          {viewFormat === 'json' && (
            <div className="bg-gray-900 text-green-400 p-4 rounded-md overflow-auto max-h-96">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {JSON.stringify(items, null, 2)}
              </pre>
            </div>
          )}

          {viewFormat === 'csv' && (
            <div className="result-table">
              <table className="min-w-full">
                <thead>
                  <tr>
                    {(() => {
                      // SELECT 문에서 컬럼 순서 추출
                      const columnOrder = extractColumnOrder(result.query)
                      const availableKeys = Object.keys(items[0]).filter(key => key !== 'links')
                      
                      // SELECT 순서가 있으면 그 순서대로, 없으면 기본 순서
                      const orderedKeys = columnOrder.length > 0 
                        ? columnOrder.filter(col => availableKeys.includes(col))
                            .concat(availableKeys.filter(key => !columnOrder.includes(key)))
                        : availableKeys
                        
                      return orderedKeys.map((header) => (
                        <th key={header} className="text-left font-medium text-gray-700">
                          {header}
                        </th>
                      ))
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, index: number) => {
                    // 동일한 컬럼 순서로 데이터 표시
                    const columnOrder = extractColumnOrder(result.query)
                    const availableKeys = Object.keys(items[0]).filter(key => key !== 'links')
                    const orderedKeys = columnOrder.length > 0 
                      ? columnOrder.filter(col => availableKeys.includes(col))
                          .concat(availableKeys.filter(key => !columnOrder.includes(key)))
                      : availableKeys
                    
                    return (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        {orderedKeys.map((key) => (
                          <td key={key} className="text-sm text-gray-900">
                            {typeof item[key] === 'object' 
                              ? JSON.stringify(item[key]) 
                              : String(item[key] || '')
                            }
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ResultsDisplay