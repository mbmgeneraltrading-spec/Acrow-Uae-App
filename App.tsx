import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowUpRight,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  X,
  CheckCheck,
  LayoutDashboard,
  AlertCircle,
  ShoppingCart,
  Truck,
  Archive,
  Radio,
  Info,
  Users,
  Command,
  Clock3,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AcrowLogo } from '@/components/AcrowLogo';
import {
  fetchOrders,
  fetchUserByEmail,
  fetchNotifications,
  markAllNotificationsRead,
  type Profile,
  type Order,
  type Notification,
  type AcrowUser,
  fetchUsers,
} from '@/lib/types';
import { SalesEngineerView } from '@/views/SalesEngineer';
import { AccountantView } from '@/views/Accountant';
import { AdminView } from '@/views/Admin';
import { AboutView } from '@/views/About';
import { OperationsTeamView } from '@/views/OperationsTeam';
import { OrderDetailModal } from '@/views/SalesEngineer';

function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [authError, setAuthError] = useState('');
  const [dataError, setDataError] = useState('');
  const [sessionEmail, setSessionEmail] = useState('');
  const [teamUsers, setTeamUsers] = useState<AcrowUser[]>([]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        const email = (data.session.user.email || '').trim().toLowerCase();
        if (!email.endsWith('@acrow.co')) {
          void supabase.auth.signOut();
          setLoading(false);
          return;
        }
        setSessionEmail(email);
        void initializeUser(email);
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'SIGNED_OUT' || !session) {
          if (!mounted) return;
          setProfile(null);
          setOrders([]);
          setNotifications([]);
          setSessionEmail('');
          setLoading(false);
          return;
        }
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const email = (session.user.email || '').trim().toLowerCase();
          if (!email.endsWith('@acrow.co')) {
            await supabase.auth.signOut();
            if (!mounted) return;
            setAuthError('Only @acrow.co email addresses are authorized.');
            setLoading(false);
            return;
          }
          if (!mounted) return;
          setSessionEmail(email);
          setAuthError('');
          await initializeUser(email);
        }
      })();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const initializeUser = async (email: string) => {
    setLoading(true);
    setDataError('');
    try {
      let user: Profile | null = null;
      try {
        user = await fetchUserByEmail(email);
      } catch (e) {
        console.error('User lookup failed', e);
        setDataError('Could not load your user profile from the database.');
      }

      const loggedInProfile: Profile = user ?? {
        user_email: email,
        employee_name: email
          .split('@')[0]
          .replace(/[._]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        role: 'Staff',
        employee_id: '',
      };

      setProfile(loggedInProfile);
      await Promise.all([loadOrders(), loadNotifications(loggedInProfile.user_email), loadTeamUsers()]);
    } catch (e) {
      console.error('Initialization failed', e);
      setDataError('Could not load data from the database. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const data = await fetchOrders();
      setOrders(data);
      setDataError('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('loadOrders error:', msg);
      setOrdersError('Could not load orders from the database.');
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadTeamUsers = async () => {
    try {
      setTeamUsers(await fetchUsers());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('loadTeamUsers error:', msg);
    }
  };

  const loadNotifications = async (email: string) => {
    try {
      const data = await fetchNotifications(email);
      setNotifications(data);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    setAuthError('');

    const emailLower = email.trim().toLowerCase();
    if (!emailLower.endsWith('@acrow.co')) {
      setAuthError('Only @acrow.co email addresses are authorized.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailLower,
        password,
      });
      if (error) {
        if (error.message.toLowerCase().includes('invalid login')) {
          setAuthError('Incorrect email or password. Please try again.');
        } else {
          setAuthError(error.message);
        }
        setLoading(false);
      }
    } catch {
      setAuthError('Sign-in failed. Please check your connection and try again.');
      setLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    setLoading(true);
    setAuthError('');

    const emailLower = email.trim().toLowerCase();
    if (!emailLower.endsWith('@acrow.co')) {
      setAuthError('Only @acrow.co email addresses are authorized.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: emailLower,
        password,
      });
      if (error) {
        setAuthError(error.message);
        setLoading(false);
        return;
      }
      setAuthError('');
      setLoading(false);
    } catch {
      setAuthError('Sign-up failed. Please check your connection and try again.');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setOrders([]);
    setNotifications([]);
    setSessionEmail('');
    setAuthError('');
    setDataError('');
    setLoading(false);
  };

  const handleOrdersChanged = () => {
    void loadOrders();
  };

  const handleNotificationsChanged = () => {
    if (sessionEmail) void loadNotifications(sessionEmail);
  };

  if (loading && !profile) return <LoadingScreen />;
  if (!profile) return (
    <LoginScreen
      error={authError}
      onError={setAuthError}
      loading={loading}
      onSignIn={handleSignIn}
      onSignUp={handleSignUp}
    />
  );

  return (
    <Dashboard
      profile={profile}
      orders={orders}
      ordersLoading={ordersLoading}
      ordersError={ordersError}
      notifications={notifications}
      teamUsers={teamUsers}
      onSignOut={handleSignOut}
      onOrdersChanged={handleOrdersChanged}
      onNotificationsChanged={handleNotificationsChanged}
      dataError={dataError}
    />
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <AcrowLogo size={44} variant="light" />
      <div className="loading-line" />
    </div>
  );
}

function LoginScreen({ error, onError, loading, onSignIn, onSignUp }: {
  error: string;
  onError: (message: string) => void;
  loading: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password) {
      onError('Please enter your password.');
      return;
    }
    setSubmitting(true);
    onError('');
    if (mode === 'signin') {
      await onSignIn(email, password);
    } else {
      await onSignUp(email, password);
    }
    setSubmitting(false);
  };

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-grid" />
        <div className="auth-visual-copy">
          <div className="eyebrow light"><ShieldCheck size={14} /> Contract-to-Order Workflow System</div>
          <h1>Build with precision.<br /><em>Deliver with confidence.</em></h1>
          <p>The centralized operations portal for ACROW UAE — linking contracts, orders, and invoice processing across Sales, Accounts, and Administration.</p>
          <div className="auth-stats">
            <div><strong>01</strong><span>Contract-to-order linkage</span></div>
            <div><strong>24/7</strong><span>Real-time workflow tracking</span></div>
          </div>
        </div>
        <div className="auth-visual-footer">ACROW Formwork Technology <span>•</span> ACROW UAE</div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="brand-lockup auth-brand">
            <AcrowLogo size={30} variant="dark" />
          </div>
          <div className="auth-heading">
            <div className="eyebrow">Operations workspace</div>
            <h2>{mode === 'signin' ? 'Welcome back.' : 'Create your account.'}</h2>
            <p>{mode === 'signin' ? 'Sign in with your authorized ACROW UAE account.' : 'Register with your authorized ACROW UAE email.'}</p>
          </div>
          <form onSubmit={handleSubmit} className="login-form">
            <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@acrow.co" required /></label>
            <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required /></label>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-button full" disabled={submitting || loading}>
              {submitting
                ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
                : (mode === 'signin' ? 'Sign in to workspace' : 'Create account')
              } <ArrowUpRight size={17} />
            </button>
          </form>

          <div className="auth-mode-toggle">
            {mode === 'signin' ? (
              <p>Don't have an account? <button type="button" onClick={() => { setMode('signup'); onError(''); }}>Create one</button></p>
            ) : (
              <p>Already have an account? <button type="button" onClick={() => { setMode('signin'); onError(''); }}>Sign in</button></p>
            )}
          </div>

          <p className="auth-note"><ShieldCheck size={15} /> Access is limited to approved ACROW UAE employees with @acrow.co email addresses.</p>
        </div>
        <div className="auth-panel-footer">© 2026 ACROW UAE <span>Privacy & security</span></div>
      </section>
    </main>
  );
}

function Dashboard({
  profile,
  orders,
  ordersLoading,
  ordersError,
  notifications,
  teamUsers,
  onSignOut,
  onOrdersChanged,
  onNotificationsChanged,
  dataError,
}: {
  profile: Profile;
  orders: Order[];
  ordersLoading: boolean;
  ordersError: string;
  notifications: Notification[];
  teamUsers: AcrowUser[];
  onSignOut: () => void;
  onOrdersChanged: () => void;
  onNotificationsChanged: () => void;
  dataError: string;
}) {
  const [query, setQuery] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeModule, setActiveModule] = useState<'dashboard' | 'sales' | 'rental' | 'archive' | 'live' | 'about' | 'team'>('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const searchResults = query.trim().length < 2 ? [] : orders.filter((order) => [order.lpo_number, order.sales_order_number, order.customer_name, order.project_name].some((field) => field?.toLowerCase().includes(query.trim().toLowerCase()))).slice(0, 6);

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(profile.user_email);
    onNotificationsChanged();
  };

  const roleLabel = useMemo(() => {
    if (profile.role === 'Sales Engineer') return 'Sales Engineer Workspace';
    if (profile.role === 'Accountant') return 'Accounts & Finance';
    if (profile.role === 'Admin') return 'Admin Operations';
    return profile.role;
  }, [profile.role]);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'is-open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand-lockup sidebar-brand"><AcrowLogo size={25} variant="light" /></div>
          <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={20} /></button>
          <div className="workspace-chip"><span className="pulse-dot" /> {roleLabel} <ChevronDown size={14} /></div>
          <nav className="main-nav">
            <div className="nav-label">Workspace</div>
            <NavItem icon={<LayoutDashboard size={17} />} label="Dashboard" active={activeModule === 'dashboard'} onClick={() => { setActiveModule('dashboard'); setMobileNav(false); }} />
            <NavItem icon={<ShoppingCart size={17} />} label="Sales Orders" active={activeModule === 'sales'} onClick={() => { setActiveModule('sales'); setMobileNav(false); }} />
            <NavItem icon={<Truck size={17} />} label="Rental Orders" active={activeModule === 'rental'} onClick={() => { setActiveModule('rental'); setMobileNav(false); }} />
            <NavItem icon={<Archive size={17} />} label="Archive & History" active={activeModule === 'archive'} onClick={() => { setActiveModule('archive'); setMobileNav(false); }} />
            <NavItem icon={<Radio size={17} />} label="Live Operations" active={activeModule === 'live'} onClick={() => { setActiveModule('live'); setMobileNav(false); }} badge={profile.role === 'Sales Engineer' ? unreadCount : 0} />
            <div className="nav-label secondary-nav-label">Company</div>
            <NavItem icon={<Info size={17} />} label="About" active={activeModule === 'about'} onClick={() => { setActiveModule('about'); setMobileNav(false); }} />
            <NavItem icon={<Users size={17} />} label="Operations Team" active={activeModule === 'team'} onClick={() => { setActiveModule('team'); setMobileNav(false); }} />
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-credit">
            Signed in as<br />
            <strong>{profile.employee_name}</strong> · {profile.role}<br />
            <strong>{profile.user_email}</strong>
          </div>
          <div className="developed">Developed for ACROW UAE</div>
        </div>
      </aside>
      {mobileNav && <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={22} /></button>
          <div className="mobile-brand"><AcrowLogo size={20} variant="dark" showSubtitle={false} /><span>Formwork Technology</span></div>
          <div className="breadcrumb"><span>ACROW UAE</span><span>/</span><strong>{roleLabel}</strong></div>
          <div className="topbar-actions">
            <div className="global-search-wrap">
              <div className="search-box global-search">
                <Search size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contract, order, client, project…" aria-label="Search orders" />
                <kbd><Command size={10} /> K</kbd>
              </div>
              {query.trim().length >= 2 && <div className="search-results">
                <div className="search-results-label">{searchResults.length ? 'Matching orders' : 'No matching orders'}</div>
                {searchResults.map((order) => <button key={order.id} className="search-result" onClick={() => { setSelectedOrder(order); setQuery(''); }}><span className="search-result-icon"><ShoppingCart size={14} /></span><span><strong>{order.sales_order_number}</strong><small>{order.customer_name} · {order.project_name}</small></span><span className="search-result-status">{order.delivery_status || order.workflow_status}</span></button>)}
              </div>}
            </div>
            <div className="notification-bell-wrap">
              <button
                className={`icon-button notification ${showNotifications ? 'active' : ''}`}
                aria-label="Notifications"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notif-dropdown-header">
                    <strong>Notifications</strong>
                    {unreadCount > 0 && (
                      <button className="text-button" onClick={handleMarkAllRead}>
                        <CheckCheck size={13} /> Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="notif-dropdown-empty">No notifications</div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div key={n.id} className={`notif-dropdown-item ${n.is_read ? '' : 'unread'}`}>
                        <strong>{n.subject}</strong>
                        <span>{n.body}</span>
                        <small>{new Intl.DateTimeFormat('en-AE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(n.created_at))}</small>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="user-menu">
              <div className="avatar">{profile.employee_name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
              <div className="user-info"><strong>{profile.employee_name}</strong><span>{profile.role}</span></div>
              <button onClick={onSignOut} className="logout-button" aria-label="Sign out"><LogOut size={17} /></button>
            </div>
          </div>
        </header>
        <div className="content-wrap">
          <div className="management-banner"><span>Developed &amp; Managed by:</span> Mr. Mahmoud Badr Mashhood (Operation Officer) <b>&amp;</b> Mr. Mohamed El-Sharkawy (Logistics Manager)</div>
          {dataError && (
            <div className="data-error-banner">
              <AlertCircle size={16} />
              <span>{dataError}</span>
              <button className="text-button" onClick={onOrdersChanged}>Retry</button>
            </div>
          )}
          {ordersError && (
            <div className="data-error-banner">
              <AlertCircle size={16} />
              <span>{ordersError}</span>
              <button className="text-button" onClick={onOrdersChanged}>Retry</button>
            </div>
          )}
          {activeModule === 'about' && <AboutView />}
          {activeModule === 'team' && <OperationsTeamView users={teamUsers} />}
          {activeModule !== 'about' && activeModule !== 'team' && activeModule !== 'dashboard' && (
            <OperationsModule module={activeModule} orders={orders} ordersLoading={ordersLoading} onSelect={setSelectedOrder} />
          )}
          {activeModule === 'dashboard' && profile.role === 'Sales Engineer' && (
            <SalesEngineerView
              profile={profile}
              orders={orders}
              ordersLoading={ordersLoading}
              notifications={notifications}
              onOrdersChanged={onOrdersChanged}
              onNotificationsChanged={onNotificationsChanged}
            />
          )}
          {activeModule === 'dashboard' && profile.role === 'Accountant' && (
            <AccountantView
              profile={profile}
              orders={orders}
              ordersLoading={ordersLoading}
              onOrdersChanged={onOrdersChanged}
            />
          )}
          {activeModule === 'dashboard' && profile.role === 'Admin' && (
            <AdminView
              profile={profile}
              orders={orders}
              ordersLoading={ordersLoading}
              notifications={notifications}
              onOrdersChanged={onOrdersChanged}
            />
          )}
          {selectedOrder && <OrderDetailModal order={selectedOrder} profile={profile} onClose={() => setSelectedOrder(null)} onOrdersChanged={onOrdersChanged} />}
          {(activeModule === 'dashboard' && profile.role !== 'Sales Engineer' && profile.role !== 'Accountant' && profile.role !== 'Admin') && (
            <div className="empty-state">
              <ShieldCheck size={28} />
              <h3>Role not configured</h3>
              <p>Your account role ({profile.role}) does not have a dedicated view. Please contact an administrator.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge = 0 }: { icon: ReactNode; label: string; active: boolean; onClick: () => void; badge?: number }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{badge > 0 && <small>{badge}</small>}</button>;
}

type OperationsModuleName = 'sales' | 'rental' | 'archive' | 'live';

function OperationsModule({ module, orders, ordersLoading, onSelect }: { module: OperationsModuleName; orders: Order[]; ordersLoading: boolean; onSelect: (order: Order) => void }) {
  const title = module === 'sales' ? 'Sales Orders' : module === 'rental' ? 'Rental Orders' : module === 'archive' ? 'Order Archive & History' : 'Live Operations & Logistics Tracking';
  const description = module === 'sales' ? 'Commercial orders moving from customer request to confirmed sale.' : module === 'rental' ? 'Rental orders and equipment movements requiring dispatch coordination.' : module === 'archive' ? 'A searchable history of completed and archived order activity.' : 'A live view of dispatch, delivery, and return movement across the operation.';
  const visibleOrders = module === 'sales' ? orders.filter((order) => !order.order_type.toLowerCase().includes('rental')) : module === 'rental' ? orders.filter((order) => order.order_type.toLowerCase().includes('rental')) : module === 'archive' ? orders.filter((order) => ['delivered', 'returned', 'archived', 'processed'].includes(order.delivery_status.toLowerCase() || order.workflow_status)) : orders;
  const statusLabel = (order: Order) => order.delivery_status || order.workflow_status;
  return <div className="enterprise-page">
    <section className="page-intro-row"><div><div className="eyebrow"><Clock3 size={13} /> Operations module</div><h1>{title}</h1><p>{description}</p></div><div className="module-count"><strong>{visibleOrders.length}</strong><span>records in view</span></div></section>
    <div className="module-kpis"><div><span>Pending</span><strong>{visibleOrders.filter((order) => order.workflow_status === 'new').length}</strong></div><div><span>Sales confirmed</span><strong>{visibleOrders.filter((order) => order.workflow_status === 'confirmed').length}</strong></div><div><span>Dispatched / delivered</span><strong>{visibleOrders.filter((order) => ['dispatched', 'delivered', 'processed'].includes(order.delivery_status.toLowerCase() || order.workflow_status)).length}</strong></div><div><span>Returned / archived</span><strong>{visibleOrders.filter((order) => ['returned', 'archived'].includes(order.delivery_status.toLowerCase())).length}</strong></div></div>
    <div className="module-panel">{ordersLoading ? <div className="empty-state"><Clock3 size={24} /><h3>Loading live orders…</h3></div> : visibleOrders.length === 0 ? <div className="empty-state"><Archive size={28} /><h3>No orders found</h3><p>There are no records matching this module yet.</p></div> : <div className="module-order-list">{visibleOrders.map((order) => <button key={order.id} className="module-order-row" onClick={() => onSelect(order)}><span className="module-order-main"><strong>{order.sales_order_number}</strong><span>{order.customer_name} · {order.project_name}</span></span><span className="module-order-type">{order.order_type}</span><span className="module-order-status">{statusLabel(order)}</span><span className="module-order-date">{order.order_date}</span><ChevronDown size={15} /></button>)}</div>}</div>
  </div>;
}

export default App;
