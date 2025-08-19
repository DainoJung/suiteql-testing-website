import React, { useState, useEffect } from 'react'
import { Settings, Save, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

interface NetSuiteConfig {
  account_id: string
  consumer_key: string
  consumer_secret: string
  token_id: string
  token_secret: string
}

interface SettingsPageProps {
  onConfigurationComplete: () => void
  showBackButton?: boolean
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onConfigurationComplete, showBackButton = true }) => {
  const [config, setConfig] = useState<NetSuiteConfig>({
    account_id: '',
    consumer_key: '',
    consumer_secret: '',
    token_id: '',
    token_secret: ''
  })
  
  const [showSecrets, setShowSecrets] = useState({
    consumer_secret: false,
    token_secret: false
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    checkCurrentConfiguration()
  }, [])

  const checkCurrentConfiguration = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/config')
      if (response.data.configured) {
        setIsConfigured(true)
        // 보안을 위해 실제 값은 마스킹해서 표시
        setConfig({
          account_id: response.data.account_id || '',
          consumer_key: response.data.consumer_key ? '••••••••' : '',
          consumer_secret: response.data.consumer_secret ? '••••••••' : '',
          token_id: response.data.token_id ? '••••••••' : '',
          token_secret: response.data.token_secret ? '••••••••' : ''
        })
      }
    } catch (error) {
      console.log('No existing configuration found')
    }
  }

  const handleInputChange = (field: keyof NetSuiteConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
    setIsConfigured(false) // 값이 변경되면 재설정 필요
  }

  const toggleSecretVisibility = (field: 'consumer_secret' | 'token_secret') => {
    setShowSecrets(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const saveConfiguration = async () => {
    // 모든 필드가 입력되었는지 확인
    const requiredFields = Object.entries(config)
    const emptyFields = requiredFields.filter(([_, value]) => !value.trim())
    
    if (emptyFields.length > 0) {
      toast.error('모든 필드를 입력해주세요.')
      return
    }

    setIsSaving(true)
    
    try {
      await axios.post('http://localhost:8000/api/config', config)
      toast.success('설정이 저장되었습니다.')
      setIsConfigured(true)
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '설정 저장에 실패했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const testConnection = async () => {
    if (!isConfigured) {
      toast.error('먼저 설정을 저장해주세요.')
      return
    }

    setIsTesting(true)
    
    try {
      const response = await axios.get('http://localhost:8000/api/test-auth')
      if (response.data.status === 'success') {
        toast.success('NetSuite 연결 테스트 성공!')
        onConfigurationComplete()
      } else {
        toast.error(`연결 테스트 실패: ${response.data.error}`)
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '연결 테스트에 실패했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          {showBackButton && (
            <div className="flex justify-start mb-4">
              <button
                onClick={onConfigurationComplete}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                메인 페이지로 돌아가기
              </button>
            </div>
          )}
          <Settings className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900">NetSuite 설정</h2>
          <p className="mt-2 text-sm text-gray-600">
            SuiteQL을 사용하기 위한 NetSuite 인증 정보를 입력해주세요.
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <div className="space-y-6">
            {/* Account ID */}
            <div>
              <label htmlFor="account_id" className="block text-sm font-medium text-gray-700">
                Account ID
              </label>
              <input
                type="text"
                id="account_id"
                value={config.account_id}
                onChange={(e) => handleInputChange('account_id', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="1234567"
              />
            </div>

            {/* Consumer Key */}
            <div>
              <label htmlFor="consumer_key" className="block text-sm font-medium text-gray-700">
                Consumer Key
              </label>
              <input
                type="text"
                id="consumer_key"
                value={config.consumer_key}
                onChange={(e) => handleInputChange('consumer_key', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="abcd1234..."
              />
            </div>

            {/* Consumer Secret */}
            <div>
              <label htmlFor="consumer_secret" className="block text-sm font-medium text-gray-700">
                Consumer Secret
              </label>
              <div className="mt-1 relative">
                <input
                  type={showSecrets.consumer_secret ? "text" : "password"}
                  id="consumer_secret"
                  value={config.consumer_secret}
                  onChange={(e) => handleInputChange('consumer_secret', e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => toggleSecretVisibility('consumer_secret')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showSecrets.consumer_secret ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Token ID */}
            <div>
              <label htmlFor="token_id" className="block text-sm font-medium text-gray-700">
                Token ID
              </label>
              <input
                type="text"
                id="token_id"
                value={config.token_id}
                onChange={(e) => handleInputChange('token_id', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="efgh5678..."
              />
            </div>

            {/* Token Secret */}
            <div>
              <label htmlFor="token_secret" className="block text-sm font-medium text-gray-700">
                Token Secret
              </label>
              <div className="mt-1 relative">
                <input
                  type={showSecrets.token_secret ? "text" : "password"}
                  id="token_secret"
                  value={config.token_secret}
                  onChange={(e) => handleInputChange('token_secret', e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => toggleSecretVisibility('token_secret')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showSecrets.token_secret ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <button
              onClick={saveConfiguration}
              disabled={isSaving}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {isSaving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  저장 중...
                </div>
              ) : (
                <div className="flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  설정 저장
                </div>
              )}
            </button>

            <button
              onClick={testConnection}
              disabled={!isConfigured || isTesting}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {isTesting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  연결 테스트 중...
                </div>
              ) : (
                <div className="flex items-center">
                  {isConfigured ? (
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mr-2 text-orange-500" />
                  )}
                  연결 테스트
                </div>
              )}
            </button>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium">보안 안내</p>
                <p className="mt-1">
                  입력된 인증 정보는 서버 메모리에만 저장되며, 서버 재시작 시 다시 입력해야 합니다.
                  민감한 정보는 안전하게 관리됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage