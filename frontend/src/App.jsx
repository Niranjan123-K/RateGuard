import { useEffect, useState, useMemo } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import {
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from "recharts";

function App() {
    const [events, setEvents] = useState([]);
    const [activeTab, setActiveTab] = useState("Dashboard");
    const [selectedApi, setSelectedApi] = useState(null);
    const [historyRows, setHistoryRows] = useState(10);

    const allowedCount = events.filter(
        event => event.status === "ALLOWED"
    ).length;

    const blockedCount = events.filter(
        event => event.status === "BLOCKED"
    ).length;

    const totalCount = events.length;

    useEffect(() => {
        // Load previous request history from MySQL
        fetch("http://localhost:8080/api/analytics/history")
            .then(response => response.json())
            .then(data => {
                setEvents(prev => {
                    const existingIds = new Set(
                        prev.map(event => event.id).filter(id => id != null)
                    );

                    const historyEvents = data.filter(
                        event => !existingIds.has(event.id)
                    );

                    return [...prev, ...historyEvents].sort(
                        (a, b) =>
                            new Date(b.timestamp).getTime() -
                            new Date(a.timestamp).getTime()
                    );
                });
            })
            .catch(error => {
                console.error("Failed to load history:", error);
            });

        const client = new Client({
            webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
            onConnect: () => {
                console.log("WebSocket connected!");
                client.subscribe(
                    "/topic/rate-limit-events",
                    (message) => {
                        const event = JSON.parse(message.body);
                        console.log("Received:", event);
                        setEvents((prev) => [event, ...prev]);
                    }
                );
            },
            onStompError: (frame) => {
                console.error("STOMP error:", frame);
            }
        });

        client.activate();

        return () => {
            client.deactivate();
        };

    }, []);

    // Analytics processing
    const pieData = [
        { name: "Allowed", value: allowedCount },
        { name: "Blocked", value: blockedCount }
    ];
    const COLORS = ["#059669", "#dc2626"]; // green (allowed), red (blocked)

    const activityData = useMemo(() => {
        const counts = {};
        const sortedEvents = [...events].sort((a, b) => {
            return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
        });

        sortedEvents.forEach(event => {
            const timeObj = new Date(event.timestamp || Date.now());
            const timeBucket = timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (!counts[timeBucket]) {
                counts[timeBucket] = { time: timeBucket, Allowed: 0, Blocked: 0 };
            }
            if (event.status === "ALLOWED") {
                counts[timeBucket].Allowed += 1;
            } else {
                counts[timeBucket].Blocked += 1;
            }
        });
        return Object.values(counts);
    }, [events]);

    const renderDashboard = () => (
        <div className="dashboard-grid">
            {/* Stats Row */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Total Requests</span>
                        <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    </div>
                    <div className="stat-value">{totalCount}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Blocked Requests</span>
                        <svg className="stat-icon" style={{ color: 'var(--color-blocked)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                    </div>
                    <div className="stat-value" style={{ color: "var(--color-blocked)" }}>{blockedCount}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Avg Latency</span>
                        <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                    <div className="stat-value">45<span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500, marginLeft: '4px' }}>ms</span></div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Active Rules</span>
                        <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    </div>
                    <div className="stat-value">12</div>
                </div>
            </div>

            {/* Request Traffic Area Chart */}
            <div className="activity-section" style={{ padding: '24px' }}>
                <div className="activity-title" style={{ marginBottom: '16px' }}>Request Traffic</div>
                <div style={{ width: '100%', height: '250px' }}>
                    <ResponsiveContainer>
                        <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAllowed" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-allowed)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--color-allowed)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-blocked)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--color-blocked)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                            <RechartsTooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '12px' }}
                            />
                            <Area type="monotone" dataKey="Allowed" stroke="var(--color-allowed)" strokeWidth={2} fillOpacity={1} fill="url(#colorAllowed)" />
                            <Area type="monotone" dataKey="Blocked" stroke="var(--color-blocked)" strokeWidth={2} fillOpacity={1} fill="url(#colorBlocked)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Operations Table */}
            <div className="activity-section">
                <div className="activity-header">
                    <h2 className="activity-title">Recent Operations</h2>
                    <p className="activity-subtitle">Real-time API requests monitored by RateGuard.</p>
                </div>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>IP Address</th>
                                <th>Endpoint</th>
                                <th>Status</th>
                                <th>User Agent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.length === 0 ? (
                                <tr>
                                    <td colSpan="5">
                                        <div className="empty-state">No events yet... Monitoring API traffic.</div>
                                    </td>
                                </tr>
                            ) : (
                                events.slice(0, historyRows).map((event, index) => (
                                    <tr key={index}>
                                        <td>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                {event.timestamp ? new Date(event.timestamp).toLocaleString() : new Date().toLocaleString()}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="mono-text">{event.clientId || "192.168.1.1"}</span>
                                        </td>
                                        <td>
                                            <span className="mono-text">{event.endpoint}</span>
                                        </td>
                                        <td>
                                            <span className={`badge ${event.status === "ALLOWED" ? "badge-allowed" : "badge-blocked"}`}>
                                                {event.status}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                {event.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderAnalytics = () => (
        <div className="dashboard-grid">
            {/* 3 Summary Cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Total Requests</span>
                        <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    </div>
                    <div className="stat-value">{totalCount}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Allowed Requests</span>
                        <svg className="stat-icon" style={{ color: 'var(--color-allowed)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                    <div className="stat-value" style={{ color: "var(--color-allowed)" }}>{allowedCount}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Blocked Requests</span>
                        <svg className="stat-icon" style={{ color: 'var(--color-blocked)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                    </div>
                    <div className="stat-value" style={{ color: "var(--color-blocked)" }}>{blockedCount}</div>
                </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                {/* Allowed vs Blocked Pie Chart */}
                <div className="activity-section" style={{ padding: '24px' }}>
                    <div className="activity-title" style={{ marginBottom: '16px' }}>Allowed vs Blocked</div>
                    <div style={{ width: '100%', height: '250px' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Request Activity Area Chart */}
                <div className="activity-section" style={{ padding: '24px' }}>
                    <div className="activity-title" style={{ marginBottom: '16px' }}>Request Activity</div>
                    <div style={{ width: '100%', height: '250px' }}>
                        <ResponsiveContainer>
                            <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorAllowed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-allowed)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--color-allowed)" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-blocked)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--color-blocked)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="Allowed" stroke="var(--color-allowed)" strokeWidth={2} fillOpacity={1} fill="url(#colorAllowed)" />
                                <Area type="monotone" dataKey="Blocked" stroke="var(--color-blocked)" strokeWidth={2} fillOpacity={1} fill="url(#colorBlocked)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Request History Table */}
            <div className="activity-section">
                <div className="activity-header">
                    <h2 className="activity-title">Request History</h2>
                    <p className="activity-subtitle">Comprehensive trace of recent API activities.</p>
                </div>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Client / IP</th>
                                <th>Endpoint</th>
                                <th>Status</th>
                                <th>Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.length === 0 ? (
                                <tr>
                                    <td colSpan="4">
                                        <div className="empty-state">No events yet...</div>
                                    </td>
                                </tr>
                            ) : (
                                events.slice(0, historyRows).map((event, index) => (
                                    <tr key={index}>
                                        <td>
                                            <span className="mono-text">{event.clientId}</span>
                                        </td>
                                        <td>
                                            <span className="mono-text">{event.endpoint}</span>
                                        </td>
                                        <td>
                                            <span className={`badge ${event.status === "ALLOWED" ? "badge-allowed" : "badge-blocked"}`}>
                                                {event.status}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                {event.timestamp ? new Date(event.timestamp).toLocaleString() : new Date().toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderApiLimits = () => (
        <div className="dashboard-grid">
            <div style={{ marginBottom: '8px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.01em' }}>API Limits</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>View and manage rate limits configured for your APIs</p>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Protected APIs</span>
                        <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    </div>
                    <div className="stat-value">1</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Current Rate Limit</span>
                        <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                    <div className="stat-value">20<span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500, marginLeft: '6px' }}>requests / minute</span></div>
                </div>
            </div>

            <div className="activity-section">
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Endpoint</th>
                                <th>Method</th>
                                <th>Rate Limit</th>
                                <th>Duration</th>
                                <th>Algorithm</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ cursor: 'pointer' }} onClick={() => setSelectedApi({
                                endpoint: '/api/products',
                                method: 'GET',
                                limit: '20 requests',
                                duration: '1 minute',
                                algorithm: 'Fixed Window',
                                clientIdentification: 'IP Address',
                                status: 'Active'
                            })}>
                                <td><span className="mono-text">/api/products</span></td>
                                <td><span className="badge" style={{ backgroundColor: '#262626', color: '#a3a3a3', border: '1px solid #404040' }}>GET</span></td>
                                <td>20</td>
                                <td>1 minute</td>
                                <td>Fixed Window</td>
                                <td><span className="badge badge-allowed">Active</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderSettings = () => (
        <div className="dashboard-grid">
            <div style={{ marginBottom: '8px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.01em' }}>Settings</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Application configuration and system information</p>
            </div>

            <div className="activity-section">
                <div className="activity-header">
                    <h2 className="activity-title" style={{ fontSize: '14px' }}>Dashboard Preferences</h2>
                </div>
                <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Request History Rows</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Controls how many rows are displayed in the request-history table.</div>
                    </div>
                    <select
                        className="mono-text"
                        style={{ background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '6px', cursor: 'pointer', outline: 'none' }}
                        value={historyRows}
                        onChange={(e) => setHistoryRows(Number(e.target.value))}
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </div>
            </div>

            <div className="activity-section">
                <div className="activity-header">
                    <h2 className="activity-title" style={{ fontSize: '14px' }}>Real-Time Monitoring</h2>
                </div>
                <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>WebSocket Connection</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>RateGuard uses WebSocket to receive real-time request events.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-allowed)' }}></span>
                        Connected
                    </div>
                </div>
            </div>

            <div className="activity-section">
                <div className="activity-header">
                    <h2 className="activity-title" style={{ fontSize: '14px' }}>System Information</h2>
                </div>
                <div style={{ padding: '0 24px' }}>
                    {[
                        { label: 'Application', value: 'RateGuard' },
                        { label: 'Frontend', value: 'React + Vite' },
                        { label: 'Backend', value: 'Spring Boot' },
                        { label: 'Rate Limiting', value: 'Spring AOP' },
                        { label: 'Algorithm', value: 'Fixed Window' },
                        { label: 'Database', value: 'MySQL' },
                        { label: 'Real-Time Communication', value: 'WebSocket' },
                    ].map((info, idx, arr) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{info.label}</span>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{info.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="activity-section" style={{ padding: '24px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>RateGuard</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Real-time API rate-limiting and monitoring dashboard.</p>
            </div>
        </div>
    );

    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">RG</div>
                    <div className="sidebar-title">RateGuard</div>
                </div>
                <nav className="sidebar-nav">
                    <a className={`nav-item ${activeTab === 'Dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('Dashboard')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
                        Dashboard
                    </a>
                    <a className={`nav-item ${activeTab === 'API Limits' ? 'active' : ''}`} onClick={() => setActiveTab('API Limits')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        API Limits
                    </a>
                    <a className={`nav-item ${activeTab === 'Settings' ? 'active' : ''}`} onClick={() => setActiveTab('Settings')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        Settings
                    </a>
                    <a className={`nav-item ${activeTab === 'System Health' ? 'active' : ''}`} onClick={() => setActiveTab('System Health')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                        System Health
                    </a>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="main-content">
                {/* Topbar */}
                <header className="topbar">
                    <div className="topbar-title">{activeTab}</div>
                    <div className="topbar-actions">
                        <div className="avatar">U</div>
                    </div>
                </header>

                {/* Dashboard Inner Scroll */}
                <div className="dashboard-scroll">
                    {activeTab === 'Dashboard' && renderDashboard()}
                    {activeTab === 'API Limits' && renderApiLimits()}
                    {activeTab === 'Settings' && renderSettings()}
                    {activeTab !== 'Dashboard' && activeTab !== 'API Limits' && activeTab !== 'Settings' && (
                        <div className="empty-state">
                            {activeTab} module is under construction...
                        </div>
                    )}
                </div>
            </main>

            {selectedApi && (
                <div className="modal-overlay" onClick={() => setSelectedApi(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">API Details</div>
                            <button className="modal-close" onClick={() => setSelectedApi(null)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-row">
                                <span className="detail-label">Endpoint</span>
                                <span className="mono-text" style={{ fontSize: '13px' }}>{selectedApi.endpoint}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Method</span>
                                <span className="badge" style={{ backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }}>{selectedApi.method}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Rate Limit</span>
                                <span className="detail-value">{selectedApi.limit}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Time Window</span>
                                <span className="detail-value">{selectedApi.duration}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Algorithm</span>
                                <span className="detail-value">{selectedApi.algorithm}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Client Identification</span>
                                <span className="detail-value">{selectedApi.clientIdentification}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Status</span>
                                <span className="badge badge-allowed">{selectedApi.status}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;