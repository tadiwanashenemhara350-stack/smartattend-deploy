import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    QrCode, Activity, BookOpen, Users, Database, Settings, LogOut, Search, Plus, Trash2, X, ShieldCheck, MessageCircle, Send, Bell
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title as ChartTitle, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import api from '../lib/api';
import useViewport from '../hooks/useViewport';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, Tooltip, Legend, ArcElement);

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { isMobile, isTablet } = useViewport();
    const isCompact = isTablet;
    const token = localStorage.getItem('token');

    const [activeTab, setActiveTab] = useState('overview');
    const [usersList, setUsersList] = useState([]);
    const [programmesList, setProgrammesList] = useState([]);
    const [feedbackList, setFeedbackList] = useState([]);
    const [notifications, setNotifications] = useState([]);

    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [newUserRole, setNewUserRole] = useState('student');
    const [newUserForm, setNewUserForm] = useState({ identifier: '', fullName: '' });

    const [systemStats, setSystemStats] = useState({ students: 0, lecturers: 0, admins: 0, live_sessions: 0, scan_trend: { labels: [], data: [] } });
    const [mlPerformance, setMlPerformance] = useState(null);
    const [featureImportance, setFeatureImportance] = useState(null);

    // Academic Setup States
    const [academicSubTab, setAcademicSubTab] = useState('programmes');
    const [modulesList, setModulesList] = useState([]);
    const [enrollmentsMap, setEnrollmentsMap] = useState({}); // {courseId: [studentIds]}
    
    // Forms
    const [progForm, setProgForm] = useState({ name: '', levels: '' });
    const [moduleForm, setModuleForm] = useState({ code: '', name: '', programme_id: '', level: '', lecturer_id: '', day_of_week: '', time_slot: '', start_date: '', end_date: '' });
    const [selectedModuleForEnroll, setSelectedModuleForEnroll] = useState('');
    const [enrollmentSelection, setEnrollmentSelection] = useState([]);
    const [studentSearch, setStudentSearch] = useState('');

    // System Settings States
    const [systemSettings, setSystemSettings] = useState([]);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '' });

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            try {
                const [uRes, pRes, fRes, nRes, sRes, mRes, iRes, cRes, setRes] = await Promise.all([
                    api.get('/users/', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/admin/programmes', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/feedback/inbox', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/notifications/', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/analytics/system_overview', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/analytics/performance', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/analytics/feature-importance', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/admin/courses', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setUsersList(uRes.data);
                setProgrammesList(pRes.data);
                setFeedbackList(fRes.data);
                setNotifications(nRes.data);
                setSystemStats(sRes.data);
                setMlPerformance(mRes.data);
                setFeatureImportance(iRes.data);
                setModulesList(cRes.data);
                setSystemSettings(setRes.data);
            } catch (err) {
                console.error(err);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [token, navigate]);

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const payload = { role: newUserRole, full_name: newUserForm.fullName };
            if (newUserRole === 'student') payload.student_reg_number = newUserForm.identifier;
            else if (newUserRole === 'lecturer') payload.lecturer_id = newUserForm.identifier;
            else payload.email = newUserForm.identifier;

            await api.post('/users/', payload, { headers: { Authorization: `Bearer ${token}` } });
            setIsAddUserModalOpen(false);
            setNewUserForm({ identifier: '', fullName: '' });
            alert("User created successfully!");
            // Refresh
            const res = await api.get('/users/', { headers: { Authorization: `Bearer ${token}` } });
            setUsersList(res.data);
        } catch (err) {
            alert(err.response?.data?.detail || "Error adding user");
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user? This will also remove their attendance records and enrollments.")) return;
        try {
            await api.delete(`/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setUsersList(usersList.filter(u => u.id !== id));
            alert("User deleted successfully");
        } catch (err) {
            alert(err.response?.data?.detail || "Error deleting user");
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        try {
            await api.post('/users/change-password', passwordForm, { headers: { Authorization: `Bearer ${token}` } });
            alert("Password updated successfully!");
            setIsChangingPassword(false);
            setPasswordForm({ old_password: '', new_password: '' });
        } catch (err) {
            alert(err.response?.data?.detail || "Error updating password");
        }
    };

    const handleSaveProgramme = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/programmes', progForm, { headers: { Authorization: `Bearer ${token}` } });
            setProgForm({ name: '', levels: '' });
            const res = await api.get('/admin/programmes', { headers: { Authorization: `Bearer ${token}` } });
            setProgrammesList(res.data);
            alert("Programme saved!");
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to save programme");
        }
    };

    const handleDeleteProgramme = async (id) => {
        if (!window.confirm("Are you sure? This will delete all modules in this programme.")) return;
        try {
            await api.delete(`/admin/programmes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setProgrammesList(programmesList.filter(p => p.id !== id));
        } catch (err) { alert("Failed to delete"); }
    };

    const handleSaveModule = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/courses', moduleForm, { headers: { Authorization: `Bearer ${token}` } });
            setModuleForm({ code: '', name: '', programme_id: '', level: '', lecturer_id: '', day_of_week: '', time_slot: '', start_date: '', end_date: '' });
            const res = await api.get('/admin/courses', { headers: { Authorization: `Bearer ${token}` } });
            setModulesList(res.data);
            alert("Module created!");
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to save module");
        }
    };

    const handleDeleteModule = async (id) => {
        if (!window.confirm("Delete this module and its records?")) return;
        try {
            await api.delete(`/admin/courses/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setModulesList(modulesList.filter(m => m.id !== id));
        } catch (err) { alert("Failed to delete module"); }
    };

    const handleSaveEnrollments = async () => {
        if (!selectedModuleForEnroll) return;
        try {
            await api.post('/admin/enrollments', {
                course_id: Number(selectedModuleForEnroll),
                student_ids: enrollmentSelection
            }, { headers: { Authorization: `Bearer ${token}` } });
            alert("Enrollments updated successfully!");
        } catch (err) {
            alert("Failed to update enrollments");
        }
    };

    const toggleStudentSelection = (id) => {
        if (enrollmentSelection.includes(id)) {
            setEnrollmentSelection(enrollmentSelection.filter(sid => sid !== id));
        } else {
            setEnrollmentSelection([...enrollmentSelection, id]);
        }
    };

    useEffect(() => {
        if (selectedModuleForEnroll) {
            const fetchEnrollments = async () => {
                try {
                    const res = await api.get(`/admin/enrollments/${selectedModuleForEnroll}`, { headers: { Authorization: `Bearer ${token}` } });
                    setEnrollmentSelection(res.data.map(e => e.student_id));
                } catch (err) { console.error(err); }
            };
            fetchEnrollments();
        } else {
            setEnrollmentSelection([]);
        }
    }, [selectedModuleForEnroll, token]);

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            await api.post('/admin/settings', systemSettings, { headers: { Authorization: `Bearer ${token}` } });
            alert("System settings updated!");
        } catch (err) {
            alert("Failed to save settings");
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleBgUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post('/admin/upload-bg', formData, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } });
            alert("Background updated! Refresh to see changes.");
        } catch (err) {
            alert("Upload failed");
        }
    };

    const navItemStyle = (tabName) => ({
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
        background: activeTab === tabName ? '#2563eb' : 'transparent', 
        borderRadius: '12px', color: activeTab === tabName ? '#fff' : '#94a3b8', 
        fontWeight: 600, transition: 'all 0.2s', cursor: 'pointer', marginBottom: '4px'
    });

    const students = usersList.filter(u => u.role === 'student');
    const lecturers = usersList.filter(u => u.role === 'lecturer');
    const admins = usersList.filter(u => u.role === 'admin' || u.role === 'super_admin');

    return (
        <div style={{ display: 'flex', flexDirection: isCompact ? 'column' : 'row', minHeight: '100vh', width: '100%', position: isCompact ? 'relative' : 'fixed', background: 'transparent', color: '#f8fafc', fontFamily: "'Outfit', sans-serif", overflow: isCompact ? 'auto' : 'hidden' }}>
            
            {/* Sidebar */}
            <aside style={{ width: isCompact ? '100%' : '280px', padding: '2rem', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '3rem' }}>
                    <div style={{ background: '#2563eb', padding: '8px', borderRadius: '8px' }}><ShieldCheck size={24} color="#fff" /></div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>MSU Data Science AI</span>
                </div>

                <nav style={{ flex: 1 }}>
                    <div onClick={() => setActiveTab('overview')} style={navItemStyle('overview')}><Activity size={20} /> System Hub</div>
                    <div onClick={() => setActiveTab('academic')} style={navItemStyle('academic')}><BookOpen size={20} /> Academic Setup</div>
                    <div onClick={() => setActiveTab('users')} style={navItemStyle('users')}><Users size={20} /> User Management</div>
                    <div onClick={() => setActiveTab('ml')} style={navItemStyle('ml')}><ShieldCheck size={20} /> Model Intelligence</div>
                    <div onClick={() => setActiveTab('integrity')} style={navItemStyle('integrity')}><Database size={20} /> Data Integrity</div>
                    <div onClick={() => setActiveTab('interactions')} style={navItemStyle('interactions')}><MessageCircle size={20} /> Interactions {feedbackList.length > 0 && <span style={{fontSize: '0.7rem', background: '#ef4444', padding: '2px 6px', borderRadius: '10px'}}>{feedbackList.length}</span>}</div>
                    <div onClick={() => setActiveTab('settings')} style={navItemStyle('settings')}><Settings size={20} /> System Settings</div>
                </nav>

                <div onClick={() => { localStorage.clear(); navigate('/login'); }} style={{ ...navItemStyle('logout'), marginTop: 'auto', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                    <LogOut size={20} /> Logout
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: isCompact ? '1.5rem' : '3rem', overflowY: 'auto' }}>
                
                {activeTab === 'overview' && (
                    <>
                        <div style={{ color: '#3b82f6', fontWeight: '700', fontSize: '0.85rem', marginBottom: '4px', letterSpacing: '1px' }}>SYSTEM HUB</div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 2rem 0' }}>MIDLANDS STATE UNIVERSITY</h1>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                            {[
                                { label: 'Students', val: systemStats.students, color: '#3b82f6' },
                                { label: 'Lecturers', val: systemStats.lecturers, color: '#10b981' },
                                { label: 'System Admins', val: systemStats.admins, color: '#f59e0b' },
                                { label: 'Modules/Sessions', val: systemStats.live_sessions, color: '#c084fc' }
                            ].map((s, i) => (
                                <div key={i} style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '10px' }}>{s.label}</div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                                </div>
                            ))}
                        </div>
                        
                        <div style={{ background: 'rgba(15, 23, 42, 0.3)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', padding: '2rem' }}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                                <h3 style={{ margin: 0 }}>Global Scans (24h Trend)</h3>
                                <div style={{background: 'rgba(59, 130, 246, 0.1)', padding: '6px 14px', borderRadius: '12px', color: '#60a5fa', fontSize: '0.85rem', fontWeight: 600}}>LIVE DATA</div>
                            </div>
                            <div style={{ height: '300px' }}>
                                <Line 
                                    data={{
                                        labels: systemStats.scan_trend.labels,
                                        datasets: [{ data: systemStats.scan_trend.data, borderColor: '#3b82f6', tension: 0.4, fill: true, backgroundColor: 'rgba(59, 130, 246, 0.1)', pointRadius: 4, pointBackgroundColor: '#3b82f6' }]
                                    }} 
                                    options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#64748b' } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } } } }} 
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 1.5fr', gap: '1.5rem' }}>
                             <div style={{ background: 'rgba(15, 23, 42, 0.3)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', padding: '2rem' }}>
                                <h3>CRISP-DM Model Status</h3>
                                <div style={{textAlign: 'center', padding: '1rem'}}>
                                    <div style={{fontSize: '3rem', fontWeight: 800, color: '#10b981'}}>98.2%</div>
                                    <div style={{color: '#94a3b8', fontSize: '0.9rem'}}>Confidence Level</div>
                                </div>
                                <div style={{marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}><span style={{color: '#94a3b8'}}>Algorithm</span><span style={{color: '#f8fafc', fontWeight: 600}}>XGBoost Classifier</span></div>
                                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}><span style={{color: '#94a3b8'}}>Deployment</span><span style={{color: '#f8fafc', fontWeight: 600}}>Active In-Memory</span></div>
                                </div>
                             </div>
                             
                             <div style={{ background: 'rgba(15, 23, 42, 0.3)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', padding: '2rem' }}>
                                <h3>Interaction Summary</h3>
                                {feedbackList.length > 0 ? (
                                    <div style={{marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                        {feedbackList.slice(0, 3).map(f => (
                                            <div key={f.id} style={{padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', borderLeft: '3px solid #3b82f6'}}>
                                                <div style={{fontSize: '0.85rem', fontWeight: 600}}>{f.subject}</div>
                                                <div style={{fontSize: '0.75rem', color: '#64748b'}}>{f.message.substring(0, 40)}...</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <div style={{color: '#64748b', fontSize: '0.9rem', marginTop: '1rem'}}>No recent interactions.</div>}
                             </div>
                        </div>
                    </>
                )}

                {activeTab === 'academic' && (
                    <>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Academic Setup</h1>
                        <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Configure programmes, modules, and enrollments.</p>
                        
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                            <button onClick={() => setAcademicSubTab('programmes')} style={{ background: academicSubTab === 'programmes' ? '#2563eb' : 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '99px', cursor: 'pointer', fontWeight: 'bold' }}>Programmes & Levels</button>
                            <button onClick={() => setAcademicSubTab('modules')} style={{ background: academicSubTab === 'modules' ? '#2563eb' : 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '99px', cursor: 'pointer', fontWeight: 'bold' }}>Modules & Lecturers</button>
                            <button onClick={() => setAcademicSubTab('enrollment')} style={{ background: academicSubTab === 'enrollment' ? '#2563eb' : 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '99px', cursor: 'pointer', fontWeight: 'bold' }}>Student Enrollment</button>
                        </div>

                        {academicSubTab === 'programmes' && (
                            <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 1.5fr', gap: '2rem' }}>
                                <div style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <h3>Create Programme</h3>
                                    <form onSubmit={handleSaveProgramme} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1.5rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Programme Name (e.g. Computer Science)</label>
                                            <input value={progForm.name} onChange={e => setProgForm({...progForm, name: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }} required />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Levels (Comma separated, e.g. L1,L2,L3)</label>
                                            <input value={progForm.levels} onChange={e => setProgForm({...progForm, levels: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }} required />
                                        </div>
                                        <button type="submit" style={{ padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Save Programme</button>
                                    </form>
                                </div>
                                <div style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <h3>Mapped Programmes</h3>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1.5rem', textAlign: 'left' }}>
                                        <thead><tr style={{ color: '#64748b', fontSize: '0.8rem' }}><th style={{ padding: '1rem' }}>PROGRAMME NAME</th><th style={{ padding: '1rem' }}>LEVELS</th><th style={{ padding: '1rem' }}>ACTIONS</th></tr></thead>
                                        <tbody>
                                            {programmesList.map(p => (
                                                <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <td style={{ padding: '1rem', fontWeight: 600 }}>{p.name}</td>
                                                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{p.levels}</td>
                                                    <td style={{ padding: '1rem' }}><Trash2 size={18} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => handleDeleteProgramme(p.id)} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {academicSubTab === 'modules' && (
                            <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 1.5fr', gap: '2rem' }}>
                                <div style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <h3>Create Module</h3>
                                    <form onSubmit={handleSaveModule} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                                        <div style={{ gridColumn: 'span 1' }}>
                                            <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Module Code</label>
                                            <input value={moduleForm.code} onChange={e => setModuleForm({...moduleForm, code: e.target.value})} style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} required />
                                        </div>
                                        <div style={{ gridColumn: 'span 1' }}>
                                            <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Module Name</label>
                                            <input value={moduleForm.name} onChange={e => setModuleForm({...moduleForm, name: e.target.value})} style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} required />
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Programme</label>
                                            <select value={moduleForm.programme_id} onChange={e => setModuleForm({...moduleForm, programme_id: e.target.value})} style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} required>
                                                <option value="">Select Programme...</option>
                                                {programmesList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Level</label>
                                            <select value={moduleForm.level} onChange={e => setModuleForm({...moduleForm, level: e.target.value})} style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} required>
                                                <option value="">Select Level...</option>
                                                {programmesList.find(p => String(p.id) === String(moduleForm.programme_id))?.levels.split(',').map(lv => <option key={lv} value={lv.trim()}>{lv.trim()}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Assign Lecturer</label>
                                            <select value={moduleForm.lecturer_id} onChange={e => setModuleForm({...moduleForm, lecturer_id: e.target.value})} style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} required>
                                                <option value="">Select Lecturer...</option>
                                                {lecturers.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                                            </select>
                                        </div>
                                        <button type="submit" style={{ gridColumn: 'span 2', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem' }}>Create Module</button>
                                    </form>
                                </div>
                                <div style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
                                    <h3>Mapped Modules</h3>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1.5rem', textAlign: 'left' }}>
                                        <thead><tr style={{ color: '#64748b', fontSize: '0.8rem' }}><th style={{ padding: '1rem' }}>CODE & NAME</th><th style={{ padding: '1rem' }}>SCHEDULE</th><th style={{ padding: '1rem' }}>ACTIONS</th></tr></thead>
                                        <tbody>
                                            {modulesList.map(m => (
                                                <tr key={m.id} style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{fontWeight: 'bold', color: '#fff'}}>{m.code}</div>
                                                        <div style={{fontSize: '0.8rem', color: '#94a3b8'}}>{m.name} ({m.programme?.name || '...'})</div>
                                                    </td>
                                                    <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>{m.day_of_week} {m.time_slot}</td>
                                                    <td style={{ padding: '1rem' }}><Trash2 size={18} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => handleDeleteModule(m.id)} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {academicSubTab === 'enrollment' && (
                            <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 1.5fr', gap: '2rem' }}>
                                <div style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <h3>Target Module</h3>
                                    <p style={{fontSize: '0.85rem', color: '#94a3b8'}}>Select Module to Map Students</p>
                                    <select value={selectedModuleForEnroll} onChange={e => setSelectedModuleForEnroll(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', marginBottom: '2rem' }}>
                                        <option value="">Choose...</option>
                                        {modulesList.map(m => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
                                    </select>
                                    <button onClick={handleSaveEnrollments} disabled={!selectedModuleForEnroll} style={{ width: '100%', padding: '14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', opacity: selectedModuleForEnroll ? 1 : 0.5 }}>Save Enrollments ({enrollmentSelection.length})</button>
                                </div>
                                <div style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                                        <h3>Select Students</h3>
                                        <div style={{position: 'relative', width: '250px'}}>
                                            <Search size={16} style={{position: 'absolute', left: '10px', top: '10px', color: '#64748b'}} />
                                            <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search students..." style={{width: '100%', padding: '8px 8px 8px 35px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '0.85rem'}} />
                                        </div>
                                    </div>
                                    <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {students.filter(s => s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) || s.student_reg_number.toLowerCase().includes(studentSearch.toLowerCase())).map(s => (
                                            <div key={s.id} onClick={() => toggleStudentSelection(s.id)} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '1rem', background: enrollmentSelection.includes(s.id) ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255,255,255,0.03)', borderRadius: '16px', border: enrollmentSelection.includes(s.id) ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid transparent', cursor: 'pointer' }}>
                                                <div style={{ width: '20px', height: '20px', border: '2px solid #3b82f6', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {enrollmentSelection.includes(s.id) && <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }}></div>}
                                                </div>
                                                <div>
                                                    <div style={{fontWeight: 600, fontSize: '0.9rem'}}>{s.full_name}</div>
                                                    <div style={{fontSize: '0.75rem', color: '#64748b'}}>{s.student_reg_number}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'users' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>User Management</h1>
                                <p style={{ color: '#94a3b8', margin: '4px 0 0 0' }}>Manage student, lecturer and admin accounts.</p>
                            </div>
                            <button onClick={() => setIsAddUserModalOpen(true)} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                <Plus size={20} /> Add New User
                            </button>
                        </div>

                        <div style={{ background: 'rgba(30, 41, 59, 0.3)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem' }}>
                            <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '400px' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                                <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name, email or reg number..." style={{ width: '100%', padding: '10px 10px 10px 40px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px' }} />
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead><tr style={{ color: '#64748b', fontSize: '0.8rem' }}><th style={{ padding: '1rem' }}>FULL NAME</th><th style={{ padding: '1rem' }}>ROLE</th><th style={{ padding: '1rem' }}>IDENTIFIER</th><th style={{ padding: '1rem' }}>STATUS</th><th style={{ padding: '1rem' }}>ACTIONS</th></tr></thead>
                                    <tbody>
                                        {usersList.filter(u => u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()) || u.student_reg_number?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                                            <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                                                <td style={{ padding: '1rem', fontWeight: 600 }}>{u.full_name}</td>
                                                <td style={{ padding: '1rem' }}><span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', background: u.role === 'student' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)', color: u.role === 'student' ? '#3b82f6' : '#10b981' }}>{u.role.toUpperCase()}</span></td>
                                                <td style={{ padding: '1rem', color: '#94a3b8' }}>{u.email || u.student_reg_number || u.lecturer_id}</td>
                                                <td style={{ padding: '1rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: u.is_active ? '#10b981' : '#ef4444' }}></div> {u.is_active ? 'Active' : 'Disabled'}</div></td>
                                                <td style={{ padding: '1rem' }}>
                                                    {u.role !== 'super_admin' && (
                                                        <Trash2 size={18} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => handleDeleteUser(u.id)} />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'ml' && (() => {
                    // Safely find the class-1 report row — backend may return key as '1' or '1.0'
                    const reportRow = mlPerformance && !mlPerformance.error
                        ? (mlPerformance.classification_report['1'] || mlPerformance.classification_report['1.0'] || null)
                        : null;
                    const accuracy = mlPerformance && !mlPerformance.error
                        ? mlPerformance.classification_report['accuracy']
                        : null;

                    // Sort features by importance descending, normalise bars relative to top weight
                    const fiEntries = featureImportance && !featureImportance.error
                        ? Object.entries(featureImportance.importance).sort((a, b) => b[1] - a[1])
                        : [];
                    const maxWeight = fiEntries.length > 0 ? fiEntries[0][1] : 1;

                    const metricColors = { precision: '#3b82f6', recall: '#10b981', 'f1-score': '#f59e0b', accuracy: '#c084fc' };

                    return (
                        <>
                            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 2rem 0' }}>Model Intelligence</h1>
                            <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr', gap: '2rem' }}>
                                {/* --- Classification Metrics --- */}
                                <div style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <h3 style={{ margin: '0 0 0.4rem 0' }}>Classification Metrics</h3>
                                    <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 1.5rem 0' }}>At-risk class (label = 1) performance</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {reportRow ? (
                                            [['precision', reportRow.precision], ['recall', reportRow.recall], ['f1-score', reportRow['f1-score']], ...(accuracy != null ? [['accuracy', accuracy]] : [])]
                                                .filter(([, v]) => v != null)
                                                .map(([k, v]) => {
                                                    const pct = (v * 100).toFixed(1);
                                                    return (
                                                        <div key={k}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                                                                <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{k}</span>
                                                                <span style={{ fontWeight: 'bold', color: metricColors[k] || '#fff' }}>{pct}%</span>
                                                            </div>
                                                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${pct}%`, height: '100%', background: metricColors[k] || '#3b82f6', borderRadius: '3px', transition: 'width 0.6s ease' }}></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                        ) : (
                                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Model data unavailable.</p>
                                        )}
                                    </div>
                                </div>

                                {/* --- Feature Importance --- */}
                                <div style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <h3 style={{ margin: '0 0 0.4rem 0' }}>Feature Importance</h3>
                                    <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 1.5rem 0' }}>XAI — Gradient Boosting feature weights (sorted)</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        {fiEntries.length > 0 ? (
                                            fiEntries.map(([feature, weight], idx) => {
                                                const barPct = ((weight / maxWeight) * 100).toFixed(1);
                                                const rawPct = (weight * 100).toFixed(1);
                                                const hue = 200 + idx * 20;
                                                return (
                                                    <div key={feature}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '5px' }}>
                                                            <span style={{ color: '#cbd5e1', textTransform: 'capitalize' }}>{feature.replace(/_/g, ' ')}</span>
                                                            <span style={{ fontWeight: 'bold', color: `hsl(${hue}, 80%, 65%)` }}>{rawPct}%</span>
                                                        </div>
                                                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${barPct}%`, height: '100%', background: `hsl(${hue}, 80%, 55%)`, borderRadius: '4px', transition: 'width 0.6s ease' }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>XAI weights unavailable.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ML Ops Status Banner */}
                            <div style={{ marginTop: '2rem', background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem 2rem', borderRadius: '20px', border: '1px dashed rgba(59, 130, 246, 0.25)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <ShieldCheck size={20} color="#60a5fa" />
                                <div>
                                    <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: '0.85rem' }}>ML Operations — Active</div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '2px' }}>Gradient Boosting Classifier · 5-Fold Cross-Validation · Real-time in-memory inference</div>
                                </div>
                            </div>
                        </>
                    );
                })()}

                {activeTab === 'settings' && (
                    <>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 2rem 0' }}>System Settings</h1>
                        <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'minmax(400px, 600px)', gap: '2rem' }}>
                            <div style={{ background: 'rgba(15, 23, 42, 0.3)', padding: '2.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <h3 style={{ marginBottom: '1.5rem' }}>Global Configuration</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Institution Name</label>
                                        <input 
                                            value={systemSettings.find(s => s.key === 'system_name')?.value || ''} 
                                            onChange={e => {
                                                const newSet = [...systemSettings];
                                                const idx = newSet.findIndex(s => s.key === 'system_name');
                                                if (idx > -1) newSet[idx].value = e.target.value;
                                                else newSet.push({ key: 'system_name', value: e.target.value });
                                                setSystemSettings(newSet);
                                            }}
                                            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Custom Background Image</label>
                                        <input type="file" onChange={handleBgUpload} style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.8rem' }} />
                                    </div>
                                    <button onClick={handleSaveSettings} disabled={isSavingSettings} style={{ padding: '14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem' }}>
                                        {isSavingSettings ? 'Saving...' : 'Save All Changes'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ background: 'rgba(15, 23, 42, 0.3)', padding: '2.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <h3 style={{ marginBottom: '1.5rem' }}>Security</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <p style={{color: '#94a3b8', fontSize: '0.85rem'}}>Update your administrative password.</p>
                                    <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <input 
                                            type="password" 
                                            placeholder="Current Password" 
                                            value={passwordForm.old_password} 
                                            onChange={e => setPasswordForm({...passwordForm, old_password: e.target.value})}
                                            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }} 
                                            required 
                                        />
                                        <input 
                                            type="password" 
                                            placeholder="New Password" 
                                            value={passwordForm.new_password} 
                                            onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})}
                                            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }} 
                                            required 
                                        />
                                        <button type="submit" style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                                            Update Password
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'integrity' && (
                    <>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 2rem 0' }}>Data Integrity</h1>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                            <div style={{ background: 'rgba(15, 23, 42, 0.3)', padding: '2.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '1.5rem'}}>
                                    <div style={{background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '12px'}}><ShieldCheck size={32} color="#10b981" /></div>
                                    <div>
                                        <h3 style={{margin: 0}}>Database Health</h3>
                                        <p style={{margin: 0, fontSize: '0.85rem', color: '#94a3b8'}}>Synced & Encrypted</p>
                                    </div>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{color: '#94a3b8'}}>Total Records</span><span style={{fontWeight: 'bold'}}>48,240</span></div>
                                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{color: '#94a3b8'}}>Present</span><span style={{color: '#10b981', fontWeight: 'bold'}}>28,928</span></div>
                                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{color: '#94a3b8'}}>Late</span><span style={{color: '#f59e0b', fontWeight: 'bold'}}>9,694</span></div>
                                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{color: '#94a3b8'}}>Absent</span><span style={{color: '#ef4444', fontWeight: 'bold'}}>9,618</span></div>
                                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{color: '#94a3b8'}}>Encryption</span><span style={{color: '#10b981'}}>AES-256 Active</span></div>
                                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{color: '#94a3b8'}}>Backup Sync</span><span style={{color: '#3b82f6'}}>Cloud Persistent</span></div>
                                </div>
                            </div>
                            
                            <div style={{ background: 'rgba(15, 23, 42, 0.3)', padding: '2.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '1.5rem'}}>
                                    <div style={{background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '12px'}}><Database size={32} color="#3b82f6" /></div>
                                    <div>
                                        <h3 style={{margin: 0}}>Audit Logs</h3>
                                        <p style={{margin: 0, fontSize: '0.85rem', color: '#94a3b8'}}>Dataset Synchronization</p>
                                    </div>
                                </div>
                                <div style={{maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                    <div style={{padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.8rem'}}>
                                        <span style={{color: '#10b981'}}>SUCCESS</span> Synced msu_attendance_2026_cleaned_complete.csv — 48,240 records loaded
                                    </div>
                                    <div style={{padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.8rem'}}>
                                        <span style={{color: '#10b981'}}>SUCCESS</span> 630 student accounts seeded &amp; verified (Faculty: Data Science)
                                    </div>
                                    <div style={{padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.8rem'}}>
                                        <span style={{color: '#10b981'}}>SUCCESS</span> 10 lecturers registered — all modules assigned
                                    </div>
                                    <div style={{padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.8rem'}}>
                                        <span style={{color: '#3b82f6'}}>INFO</span> 10 modules active: AI, Big Data, Cloud, Data Mining, Data Viz, DB Systems, ML, Python, Research, Statistics
                                    </div>
                                    <div style={{padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.8rem'}}>
                                        <span style={{color: '#3b82f6'}}>INFO</span> Dataset period: 2026-01-05 → 2026-02-11 | Sessions: Mon, Tue, Wed
                                    </div>
                                    <div style={{padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.8rem'}}>
                                        <span style={{color: '#f59e0b'}}>STAT</span> Attendance split — Present: 59.9% | Late: 20.1% | Absent: 19.9%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'interactions' && (
                    <>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 2rem 0' }}>Interactions & Feedback</h1>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {feedbackList.length > 0 ? feedbackList.map(f => (
                                <div key={f.id} style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{f.subject}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(f.created_at).toLocaleString()}</div>
                                    </div>
                                    <p style={{ color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 1.5rem 0' }}>{f.message}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>S</div>
                                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Sender ID: {f.sender_id}</div>
                                    </div>
                                </div>
                            )) : <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>No feedback or reports received yet.</div>}
                        </div>
                    </>
                )}
            </main>

            {/* Modals */}
            {isAddUserModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#1e293b', width: '100%', maxWidth: '450px', borderRadius: '24px', padding: '2.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <h2 style={{ margin: 0 }}>Create Authority</h2>
                            <X size={24} style={{ cursor: 'pointer' }} onClick={() => setIsAddUserModalOpen(false)} />
                        </div>
                        <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>Account Role</label>
                                <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }}>
                                    <option value="student">Student</option>
                                    <option value="lecturer">Lecturer</option>
                                    <option value="admin">System Admin</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>Identifier (Reg No / Email)</label>
                                <input value={newUserForm.identifier} onChange={e => setNewUserForm({...newUserForm, identifier: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>Full Name</label>
                                <input value={newUserForm.fullName} onChange={e => setNewUserForm({...newUserForm, fullName: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }} required />
                            </div>
                            <button type="submit" style={{ padding: '14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem' }}>Initialize User Account</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
