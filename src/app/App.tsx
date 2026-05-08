import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import HomePage from './components/HomePage';
import ImageDetectionPage from './components/ImageDetectionPage';
import ProfilePage from './components/ProfilePage';
import AdminPage from './components/AdminPage';
import BottomNav from './components/BottomNav';

interface UserData {
  balance: number;
  imageBalance: number;
  nickname: string;
  avatarUrl: string;
  purchaseHistory: any[];
  usageDetails: any[];
  detectionHistory: any[];
  isNewUser: boolean;
  lastLoginDate: string;
  adWatchedToday: number;
  adWatchDate: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'image' | 'profile' | 'admin'>('home');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<UserData>({
    balance: 0,
    imageBalance: 0,
    nickname: '',
    avatarUrl: '',
    purchaseHistory: [],
    usageDetails: [],
    detectionHistory: [],
    isNewUser: true,
    lastLoginDate: '',
    adWatchedToday: 0,
    adWatchDate: ''
  });

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/user');
      if (res.ok) {
        const user = await res.json();
        setUserData(prev => ({
          ...prev,
          balance: user.balance,
          imageBalance: user.imageBalance || 0,
          nickname: user.nickname || '未设置昵称',
          avatarUrl: user.avatarUrl || ''
        }));
        setIsLoggedIn(true);
        return true;
      } else if (res.status === 401) {
        if (window.location.pathname !== '/admin') {
          window.location.href = '/api/auth/wechat/login';
        }
        setIsLoggedIn(false);
        return false;
      }
    } catch (e) {
      console.error('Fetch user failed', e);
      setIsLoggedIn(false);
      return false;
    }
    return false;
  };

  // 初始化用户数据
  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setCurrentPage('admin');
    }
    fetchUser();
  }, []);

  const handleBalanceUpdate = (newBalance: number) => {
    setUserData(prev => ({ ...prev, balance: newBalance }));
  };

  if (isLoggedIn === null) {
    return (
      <div className="size-full flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="size-16 bg-blue-100 rounded-2xl"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="size-full bg-gray-50">
      <Toaster position="top-center" richColors />

      {currentPage === 'home' && (
        <HomePage
          balance={userData.balance}
          onBalanceUpdate={handleBalanceUpdate}
          onAddHistory={() => fetchUser()} 
          onAddUsageDetail={() => {}} 
        />
      )}

      {currentPage === 'image' && (
        <ImageDetectionPage
          balance={userData.balance}
          imageBalance={userData.imageBalance}
          onBalanceUpdate={handleBalanceUpdate}
          onAddHistory={() => fetchUser()} 
        />
      )}

      {currentPage === 'profile' && (
        <ProfilePage
          balance={userData.balance}
          imageBalance={userData.imageBalance}
          onBalanceUpdate={handleBalanceUpdate}
          nickname={userData.nickname}
          avatarUrl={userData.avatarUrl}
          onPurchaseSuccess={() => fetchUser()}
        />
      )}

      {currentPage === 'admin' && <AdminPage />}

      {currentPage !== 'admin' && <BottomNav currentPage={currentPage as any} onNavigate={setCurrentPage as any} />}
    </div>
  );
}
