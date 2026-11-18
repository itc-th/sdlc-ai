# 1. ระบบย่อยที่เกี่ยวข้อง

- **Frontend Application** — ทุกหน้าและ components ที่มี navigation
- **Routing System** — ระบบจัดการ URL และ navigation flow
- **State Management** — การจัดการ application state ระหว่างการเปลี่ยนหน้า
- **Authentication/Authorization** — การตรวจสอบสิทธิ์เมื่อเปลี่ยนหน้า
- **Layout/Template System** — header, sidebar, footer ที่ต้องคงอยู่ระหว่างการเปลี่ยนหน้า
- **Asset Management** — การจัดการ CSS, JavaScript bundles และ static assets
- **API Integration Layer** — การเรียก API สำหรับโหลดข้อมูลแต่ละหน้า
- **Error Handling System** — การจัดการ errors และ fallback UI
- **Analytics/Tracking** — การติดตามพฤติกรรมผู้ใช้ (page views, navigation paths)
- **Build/Deployment Pipeline** — กระบวนการ build และ deploy SPA

---

# 2. ข้อเท็จจริงจากระบบปัจจุบัน

## 2.1 Navigation Pattern ปัจจุบัน
- ใช้ **traditional multi-page application (MPA)** โดย server render HTML ทั้งหมดทุก request
- ทุก navigation เป็น **full page reload** ผ่าน `<a href>` หรือ `window.location`
- Server ทำ **server-side rendering** และส่ง complete HTML กลับมาทุกครั้ง

## 2.2 Performance ปัจจุบัน
- **Page transition time**: 800-1,200ms (รวม network + render)
- **Initial page load**: 1,500-2,000ms
- เกิด **white flash/flickering** ระหว่างการเปลี่ยนหน้า
- โหลด **CSS/JS ซ้ำทุกครั้ง** แม้จะ cached แล้ว (browser ต้อง parse ใหม่)

## 2.3 Resource Loading
- **Static assets** (CSS, JS) โหลดซ้ำทุก navigation
- **Common components** (header, sidebar) render ใหม่ทุกหน้า
- ไม่มี **code splitting** หรือ lazy loading

## 2.4 User Experience Issues
- ผู้ใช้สูญเสีย **scroll position** เมื่อกดปุ่ม back
- ไม่มี **transition animations** ระหว่างหน้า
- **Loading states** ไม่ชัดเจน (แสดงเฉพาะ browser loading indicator)

## 2.5 Technical Stack
- Frontend Framework: [ระบุเช่น React 18.x / Vue 3.x / Vanilla JS]
- Build Tool: [ระบุเช่น Webpack / Vite / Parcel]
- Backend: [ระบุเช่น Node.js Express / Django / .NET]
- Deployment: [ระบุเช่น Apache / Nginx / Cloud provider]

---

# 3. ข้อเสนอการออกแบบ

## 3.1 Architecture Overview

### 3.1.1 Single Page Application Pattern
- แปลงเป็น **SPA architecture** โดย:
  - Server ส่ง **single HTML shell** เพียงครั้งเดียวตอน initial load
  - Client รับผิดชอบ **rendering และ navigation** ทั้งหมด
  - ใช้ **AJAX/Fetch API** ดึงข้อมูลจาก backend APIs
  - **DOM manipulation** เพื่อแสดงผลหน้าต่างๆ โดยไม่ reload

### 3.1.2 Routing Strategy
เลือก **client-side router** ตามเทคโนโลยีที่ใช้:

**ถ้าใช้ React:**
```javascript
// React Router v6
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings/*" element={<SettingsRoutes />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

**ถ้าใช้ Vue:**
```javascript
// Vue Router v4
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/dashboard', component: DashboardPage },
    { path: '/users', component: UsersPage },
    { path: '/:pathMatch(.*)*', component: NotFoundPage }
  ]
});
```

**ถ้าใช้ Vanilla JS:**
```javascript
// Custom router ด้วย History API
class Router {
  constructor(routes) {
    this.routes = routes;
    window.addEventListener('popstate', () => this.handleRoute());
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-link]')) {
        e.preventDefault();
        this.navigateTo(e.target.href);
      }
    });
  }

  navigateTo(url) {
    history.pushState(null, null, url);
    this.handleRoute();
  }

  async handleRoute() {
    const path = window.location.pathname;
    const route = this.routes.find(r => r.path === path) || this.routes.find(r => r.path === '404');
    const html = await route.component();
    document.getElementById('app').innerHTML = html;
  }
}
```

## 3.2 Code Splitting & Lazy Loading

### 3.2.1 Route-based Code Splitting
แบ่ง code เป็น chunks ตาม routes:

**React:**
```javascript
import { lazy, Suspense } from 'react';

const DashboardPage = lazy(() => import('./pages/Dashboard'));
const UsersPage = lazy(() => import('./pages/Users'));
const SettingsPage = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Suspense>
  );
}
```

**Vue:**
```javascript
const routes = [
  {
    path: '/dashboard',
    component: () => import('./pages/Dashboard.vue')
  },
  {
    path: '/users',
    component: () => import('./pages/Users.vue')
  }
];
```

**Webpack Configuration:**
```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        }
      }
    }
  }
};
```

### 3.2.2 Component-level Lazy Loading
สำหรับ components ขนาดใหญ่ที่ไม่จำเป็นต้องแสดง initial:

```javascript
// Lazy load heavy components
const ChartWidget = lazy(() => import('./components/ChartWidget'));
const DataTable = lazy(() => import('./components/DataTable'));

// ใช้งานพร้อม fallback
<Suspense fallback={<Skeleton />}>
  <ChartWidget data={chartData} />
</Suspense>
```

## 3.3 Navigation Handling

### 3.3.1 Link Component
สร้าง custom link component แทน `<a>`:

```javascript
// NavigationLink.jsx
function NavigationLink({ to, children, ...props }) {
  const navigate = useNavigate(); // หรือ router.push ใน Vue
  
  const handleClick = (e) => {
    e.preventDefault();
    navigate(to);
  };
  
  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}

// Usage
<NavigationLink to="/dashboard">Dashboard</NavigationLink>
```

### 3.3.2 Programmatic Navigation
```javascript
// In React
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();
  
  const handleLogin = async () => {
    await loginAPI();
    navigate('/dashboard', { replace: true });
  };
}

// In Vue
import { useRouter } from 'vue-router';

const router = useRouter();
router.push('/dashboard');
router.replace('/dashboard');
router.go(-1); // back
```

### 3.3.3 Navigation Guards
สำหรับ authentication/authorization:

```javascript
// React - Protected Route
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// Vue - Navigation Guard
router.beforeEach((to, from, next) => {
  const isAuthenticated = store.getters.isAuthenticated;
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});
```

## 3.4 State Management

### 3.4.1 Persistent State
เก็บ state ที่ต้องคงอยู่ระหว่างการเปลี่ยนหน้า:

```javascript
// Using Context API (React)
const AppContext = createContext();

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState({});
  
  // Load from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);
  
  return (
    <AppContext.Provider value={{ user, setUser, preferences, setPreferences }}>
      {children}
    </AppContext.Provider>
  );
}

// Using Vuex (Vue)
const store = createStore({
  state: {
    user: null,
    preferences: {}
  },
  mutations: {
    setUser(state, user) {
      state.user = user;
    }
  },
  plugins: [
    // Persist to localStorage
    createPersistedState()
  ]
});
```

### 3.4.2 Route State
เก็บ state เฉพาะ route:

```javascript
// Pass state via navigation
navigate('/users', { state: { from: 'dashboard' } });

// Access in target component
const location = useLocation();
const { from } = location.state || {};
```

## 3.5 Loading States & Transitions

### 3.5.1 Global Loading Indicator
```javascript
// LoadingBar component
function LoadingBar() {
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location]);
  
  return loading ? (
    <div className="loading-bar">
      <div className="loading-bar-progress" />
    </div>
  ) : null;
}
```

### 3.5.2 Page Transitions
```css
/* CSS Transitions */
.page-enter {
  opacity: 0;
  transform: translateX(20px);
}

.page-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: opacity 300ms, transform 300ms;
}

.page-exit {
  opacity: 1;
}

.page-exit-active {
  opacity: 0;
  transition: opacity 300ms;
}
```

```javascript
// React with react-transition-group
import { CSSTransition, TransitionGroup } from 'react-transition-group';

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <TransitionGroup>
      <CSSTransition key={location.key} classNames="page" timeout={300}>
        <Routes location={location}>
          {/* routes */}
        </Routes>
      </CSSTransition>
    </TransitionGroup>
  );
}
```

### 3.5.3 Skeleton Screens
```javascript
// Skeleton component for lazy loaded content
function PageSkeleton() {
  return (
    <div className="skeleton-container">
      <div className="skeleton-header" />
      <div className="skeleton-content">
        <div className="skeleton-line" />
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
      </div>
    </div>
  );
}

// Usage
<Suspense fallback={<PageSkeleton />}>
  <LazyComponent />
</Suspense>
```

## 3.6 Error Handling

### 3.6.1 Error Boundaries
```javascript
// React Error Boundary
class NavigationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Navigation error:', error, errorInfo);
    // Log to error tracking service
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage 
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }
    
    return this.props.children;
  }
}
```

### 3.6.2 404 Handling
```javascript
// Catch-all route for 404
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="*" element={<NotFoundPage />} />
</Routes>

// NotFoundPage component
function NotFoundPage() {
  const navigate = useNavigate