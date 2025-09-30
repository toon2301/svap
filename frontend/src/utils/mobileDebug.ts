/**
 * Mobile debugging utilities pre Swaply
 */

export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const getDeviceInfo = () => {
  if (typeof window === 'undefined') return null;
  
  return {
    userAgent: navigator.userAgent,
    isMobile: isMobile(),
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
  };
};

export const logMobileDebugInfo = () => {
  const deviceInfo = getDeviceInfo();
  console.log('🔍 Mobile Debug Info:', deviceInfo);
  
  // Test API connectivity
  if (typeof window !== 'undefined') {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    console.log('🌐 API URL:', apiUrl);
    
    // Test fetch
    fetch(`${apiUrl}/auth/register/`)
      .then(response => {
        console.log('✅ API Connection Test:', response.status, response.statusText);
      })
      .catch(error => {
        console.error('❌ API Connection Failed:', error);
      });
  }
};

export const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const response = await fetch(`${apiUrl}/auth/register/`, {
      method: 'GET',
      mode: 'cors',
    });
    return response.ok;
  } catch (error) {
    console.error('Network connectivity check failed:', error);
    return false;
  }
};
