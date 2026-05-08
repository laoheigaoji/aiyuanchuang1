import { Home, User, ImageIcon } from 'lucide-react';

interface BottomNavProps {
  currentPage: 'home' | 'image' | 'profile';
  onNavigate: (page: 'home' | 'image' | 'profile') => void;
}

export default function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-4xl mx-auto grid grid-cols-3">
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center py-2 transition ${
            currentPage === 'home'
              ? 'text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Home className={`size-5 mb-0.5 ${currentPage === 'home' ? 'fill-current' : ''}`} />
          <span className="text-xs font-medium">文本检测</span>
        </button>

        <button
          onClick={() => onNavigate('image')}
          className={`flex flex-col items-center justify-center py-2 transition ${
            currentPage === 'image'
              ? 'text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className={`relative ${currentPage === 'image' ? 'scale-110 transition-transform' : ''}`}>
             <div className={`absolute -inset-2 bg-blue-100 rounded-full blur-md opacity-0 group-hover:opacity-100 transition ${currentPage === 'image' ? 'opacity-100' : ''}`} />
             <ImageIcon className={`relative size-5 mb-0.5 ${currentPage === 'image' ? 'fill-current text-blue-600' : ''}`} />
          </div>
          <span className="text-xs font-medium">图片检测</span>
        </button>

        <button
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center justify-center py-2 transition ${
            currentPage === 'profile'
              ? 'text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <User className={`size-5 mb-0.5 ${currentPage === 'profile' ? 'fill-current' : ''}`} />
          <span className="text-xs font-medium">个人中心</span>
        </button>
      </div>
    </div>
  );
}
