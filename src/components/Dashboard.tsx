import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, LogOut, List, BarChart2, Download, Edit2, Save, Trash2, ShieldCheck, Table, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import Chart from './Chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import html2canvas from 'html2canvas';
import clsx from 'clsx';
import { STAFF_DIRECTORY, cleanStaffName } from './ObservationFlow';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Observation {
  id: string;
  educatorName: string;
  school: string;
  mode: string;
  createdAt: string;
  durationMs: number;
  events?: { kind: string; tMs: number }[];
  notes?: string;
  curriculaMaterialsUsed?: string;
  lessonTargetPosted?: string;
  uid: string;
}

export default function Dashboard({ user }: { user: User }) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [dbStaff, setDbStaff] = useState<{name: string, school: string, email: string, role?: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [expandedRawDataIds, setExpandedRawDataIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    const qStaff = query(collection(db, 'staff'));
    const unsubscribeStaff = onSnapshot(qStaff, (snapshot) => {
      setDbStaff(snapshot.docs.map(doc => ({
        name: doc.data().name,
        school: doc.data().school,
        email: doc.data().email,
        role: doc.data().role
      })));
    }, (error) => {
      console.error('Error fetching staff', error);
    });
    return () => unsubscribeStaff();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'observations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const obs = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          educatorName: cleanStaffName(data.educatorName)
        } as Observation;
      });
      obs.sort((a: Observation, b: Observation) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setObservations(obs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'observations');
    });
    return () => unsubscribe();
  }, []);

  const currentUserRoleInfo = useMemo(() => {
    let role = '';
    let school = '';
    
    if (user.email) {
      const emailMatch = dbStaff.find(s => s.email?.toLowerCase() === user.email?.toLowerCase());
      if (emailMatch) {
        role = emailMatch.role || '';
        school = emailMatch.school || '';
      }
    }
    
    // Fallback to static directory for school
    if (!school && user.displayName) {
      const allStaff = [...STAFF_DIRECTORY, ...dbStaff];
      const match = allStaff.find(s => {
        const parts = s.name.split(', ');
        if (parts.length === 2) {
          return `${parts[1]} ${parts[0]}`.toLowerCase() === user.displayName?.toLowerCase();
        }
        return false;
      });
      if (match && match.school) {
        school = match.school;
      }
    }

    const roleLower = role.toLowerCase();
    const isDistrictAdmin = user.email === 'jacobn@cbk12.com' || roleLower.includes('superintendent') || roleLower.includes('hr') || roleLower.includes('director') || roleLower.includes('district');
    const isBuildingAdmin = isDistrictAdmin || roleLower.includes('principal'); // captures vice/assistant principal
    
    return { role, school, isDistrictAdmin, isBuildingAdmin };
  }, [user.displayName, user.email, dbStaff]);

  const userSchools = useMemo(() => {
    const { school, isDistrictAdmin } = currentUserRoleInfo;
    
    if (isDistrictAdmin) {
      return [
        "Sunset Intermediate School",
        "Millicoma Intermediate School",
        "Madison Elementary School",
        "Little Pirates Pre-School",
        "Eastside Elementary School",
        ...Array.from(new Set(dbStaff.map(s => s.school).filter(Boolean)))
      ];
    }
    
    if (school) {
      return [school];
    }

    // Default to schools from their observations if no match
    return Array.from(new Set(observations.filter(o => o.uid === user.uid).map(o => o.school))).filter(Boolean) as string[];
  }, [currentUserRoleInfo, observations, dbStaff]);

  const filteredObservations = observations.filter(obs => {
    const isOwn = obs.uid === user.uid;
    const { school, isBuildingAdmin, isDistrictAdmin } = currentUserRoleInfo;
    
    let hasAccess = false;
    if (isDistrictAdmin) hasAccess = true;
    else if (isBuildingAdmin && obs.school === school) hasAccess = true;
    else if (isOwn) hasAccess = true;

    if (!hasAccess) return false;

    let q = searchQuery.toLowerCase();
    if (!q) {
      return true; // if they have access, they see everything by default in their view
    }

    if (q.includes("coos bay")) {
      const districtSchools = [
        "sunset",
        "millicoma",
        "eastside",
        "madison",
        "little pirates"
      ];
      return districtSchools.some(s => obs.school?.toLowerCase().includes(s));
    }

    const matchStaff = obs.educatorName?.toLowerCase().includes(q);
    const matchSchool = obs.school?.toLowerCase().includes(q);
    return matchStaff || matchSchool;
  });

  const exportChart = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { backgroundColor: '#ffffff' });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export chart', err);
    }
  };

  const startEditingNotes = (obs: Observation) => {
    setEditingNotesId(obs.id);
    setTempNotes(obs.notes || '');
  };

  const saveNotes = async (obsId: string) => {
    try {
      await updateDoc(doc(db, 'observations', obsId), { notes: tempNotes });
      setEditingNotesId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `observations/${obsId}`);
    }
  };

  const deleteObservation = async (obsId: string) => {
    if (!window.confirm("Are you sure you want to delete this observation?")) return;
    try {
      await deleteDoc(doc(db, 'observations', obsId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `observations/${obsId}`);
    }
  };

  const { isDistrictAdmin, isBuildingAdmin, school } = currentUserRoleInfo;
  let allowedSchoolsWithDistrict = ["Coos Bay School District"];
  if (isDistrictAdmin) {
    allowedSchoolsWithDistrict = [...allowedSchoolsWithDistrict, ...userSchools];
  } else if (isBuildingAdmin) {
    allowedSchoolsWithDistrict = [...allowedSchoolsWithDistrict, school];
  } else {
    allowedSchoolsWithDistrict = [];
  }

  // Determine allowed staff for suggestions
  let allowedStaffForSuggestions: string[] = [];
  const compositeStaffDirectory = [...STAFF_DIRECTORY, ...dbStaff];
  
  if (isDistrictAdmin) {
    allowedStaffForSuggestions = compositeStaffDirectory.map(s => s.name);
  } else if (isBuildingAdmin) {
    allowedStaffForSuggestions = compositeStaffDirectory.filter(s => s.school === school).map(s => s.name);
  } else {
    // Only show themselves
    const selfStaff = compositeStaffDirectory.find(s => s.email?.toLowerCase() === user.email?.toLowerCase());
    if (selfStaff) allowedStaffForSuggestions.push(selfStaff.name);
  }

  const allSuggestions = Array.from(new Set([...allowedSchoolsWithDistrict, ...allowedStaffForSuggestions])).filter(Boolean);
  const filteredSuggestions = searchQuery 
    ? allSuggestions.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()) && s !== searchQuery)
    : [];

  // Aggregate Data Calculation
  const otrObs = filteredObservations.filter(o => o.mode === 'OTRs');
  const praiseObs = filteredObservations.filter(o => o.mode === 'Praise');
  const engObs = filteredObservations.filter(o => o.mode === 'Engagement');

  const otrCounts = { group: 0, warm: 0, cold: 0, volunteer: 0 };
  otrObs.forEach(obs => obs.events?.forEach((e: { kind: string }) => { if (otrCounts[e.kind as keyof typeof otrCounts] !== undefined) otrCounts[e.kind as keyof typeof otrCounts]++; }));
  const otrData = [
    { name: 'Whole Group', value: otrCounts.group, fill: '#a855f7' },
    { name: 'Warm Call', value: otrCounts.warm, fill: '#0b2a6f' },
    { name: 'Cold Call', value: otrCounts.cold, fill: '#1a4fff' },
    { name: 'Volunteer', value: otrCounts.volunteer, fill: '#9fb8ff' }
  ];

  const praiseCounts = { specific: 0, general: 0, corrective: 0, redirect: 0, genCrit: 0, indCrit: 0 };
  praiseObs.forEach(obs => obs.events?.forEach((e: { kind: string }) => { if (praiseCounts[e.kind as keyof typeof praiseCounts] !== undefined) praiseCounts[e.kind as keyof typeof praiseCounts]++; }));
  const praiseData = [
    { name: 'Specific Praise', value: praiseCounts.specific, fill: '#1f9d55' },
    { name: 'General Praise', value: praiseCounts.general, fill: '#86efac' },
    { name: 'Corrective', value: praiseCounts.corrective, fill: '#3b82f6' },
    { name: 'Redirective', value: praiseCounts.redirect, fill: '#f97316' },
    { name: 'Gen. Criticism', value: praiseCounts.genCrit, fill: '#ef4444' },
    { name: 'Ind. Criticism', value: praiseCounts.indCrit, fill: '#b91c1c' }
  ];

  const engCounts = { engWhole: 0, engSmall: 0, engPartners: 0, engChoral: 0, engCloze: 0, engWhiteboard: 0 };
  engObs.forEach(obs => obs.events?.forEach((e: { kind: string }) => { if (engCounts[e.kind as keyof typeof engCounts] !== undefined) engCounts[e.kind as keyof typeof engCounts]++; }));
  const engData = [
    { name: 'Whole Group', value: engCounts.engWhole, fill: '#0369a1' },
    { name: 'Small Group', value: engCounts.engSmall, fill: '#0284c7' },
    { name: 'Partners', value: engCounts.engPartners, fill: '#38bdf8' },
    { name: 'Choral', value: engCounts.engChoral, fill: '#d97706' },
    { name: 'Cloze', value: engCounts.engCloze, fill: '#f59e0b' },
    { name: 'Whiteboard', value: engCounts.engWhiteboard, fill: '#fbbf24' }
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f5] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Welcome, {user.displayName}</p>
          </div>
          <div className="flex gap-4">
            {user.email === 'jacobn@cbk12.com' && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 bg-[#1f9d55] border border-[#1f9d55] text-white px-4 py-3 rounded-full font-bold hover:bg-[#15803d] transition shadow-sm"
              >
                <ShieldCheck className="w-5 h-5" />
                Admin Panel
              </button>
            )}
            <button
              onClick={() => signOut(auth)}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-full font-bold hover:bg-gray-50 transition shadow-sm"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Prominent New Observation Button */}
        <div className="mb-10 bg-gradient-to-r from-[#1f9d55] to-[#15803d] rounded-3xl p-8 md:p-10 text-white shadow-lg flex flex-col md:flex-row items-center justify-between">
          <div className="text-center md:text-left mb-6 md:mb-0">
            <h2 className="text-3xl font-bold mb-2">Ready for a Walkthrough?</h2>
            <p className="text-green-100 text-lg">Record a new observation for OTRs, Praise, or Engagement.</p>
          </div>
          <button
            onClick={() => navigate('/record')}
            className="flex items-center gap-3 bg-white text-[#1f9d55] px-8 py-4 rounded-full font-bold text-xl hover:bg-gray-50 transition shadow-md w-full md:w-auto justify-center"
          >
            <Plus className="w-6 h-6" />
            New Observation
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 mb-10">
          <h2 className="text-lg font-semibold mb-4">Search Observations</h2>
          <div className="max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search staff member or school..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5"
            />
            {showSuggestions && searchQuery && filteredSuggestions.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 max-h-60 overflow-auto shadow-lg">
                {filteredSuggestions.map(suggestion => (
                  <li
                    key={suggestion}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchQuery(suggestion);
                      setShowSuggestions(false);
                    }}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-gray-700 border-b border-gray-50 last:border-0"
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Combined Data Section */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="w-6 h-6 text-gray-700" />
            <h2 className="text-2xl font-bold text-gray-900">Combined Data</h2>
          </div>
          
          {filteredObservations.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-black/5 text-center text-gray-500">
              No data exists for the selected staff member or school.
            </div>
          ) : (
            <div className="flex overflow-x-auto gap-6 pb-6 snap-x custom-scrollbar">
              {/* OTRs Aggregate */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 w-[85vw] md:w-[450px] shrink-0 snap-start">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900">Total OTRs</h3>
                  <button onClick={() => exportChart('chart-aggregate-otrs', 'total-otrs')} className="text-gray-500 hover:text-black transition" title="Export Chart">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
                <div id="chart-aggregate-otrs" className="h-96 bg-white p-2 flex flex-col">
                  <h4 className="text-center font-bold text-gray-800 mb-2">Total OTRs by Type</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={otrData} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10 }} 
                        interval={0} 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        label={{ value: 'OTR Type', position: 'insideBottom', offset: -30, style: { fontSize: 12, fontWeight: 'bold' } }}
                      />
                      <YAxis 
                        allowDecimals={false} 
                        label={{ value: 'Total Count', angle: -90, position: 'insideLeft', style: { fontSize: 12, fontWeight: 'bold' } }}
                      />
                      <RechartsTooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {otrData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-center text-sm font-medium text-gray-600 mt-4">Goal: 3-5 per min. whole group</p>
              </div>

              {/* Praise Aggregate */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 w-[85vw] md:w-[450px] shrink-0 snap-start">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900">Total Praise & Feedback</h3>
                  <button onClick={() => exportChart('chart-aggregate-praise', 'total-praise')} className="text-gray-500 hover:text-black transition" title="Export Chart">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
                <div id="chart-aggregate-praise" className="h-96 bg-white p-2 flex flex-col">
                  <h4 className="text-center font-bold text-gray-800 mb-2">Total Praise & Feedback by Type</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={praiseData} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10 }} 
                        interval={0} 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        label={{ value: 'Feedback Type', position: 'insideBottom', offset: -30, style: { fontSize: 12, fontWeight: 'bold' } }}
                      />
                      <YAxis 
                        allowDecimals={false} 
                        label={{ value: 'Total Count', angle: -90, position: 'insideLeft', style: { fontSize: 12, fontWeight: 'bold' } }}
                      />
                      <RechartsTooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {praiseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-center text-sm font-medium text-gray-600 mt-4">Goal: 5 positive to 1 negative</p>
              </div>

              {/* Engagement Aggregate */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 w-[85vw] md:w-[450px] shrink-0 snap-start">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900">Total Engagement</h3>
                  <button onClick={() => exportChart('chart-aggregate-eng', 'total-engagement')} className="text-gray-500 hover:text-black transition" title="Export Chart">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
                <div id="chart-aggregate-eng" className="h-96 bg-white p-2 flex flex-col">
                  <h4 className="text-center font-bold text-gray-800 mb-2">Total Engagement by Type</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={engData} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10 }} 
                        interval={0} 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        label={{ value: 'Engagement Type', position: 'insideBottom', offset: -30, style: { fontSize: 12, fontWeight: 'bold' } }}
                      />
                      <YAxis 
                        allowDecimals={false} 
                        label={{ value: 'Total Count', angle: -90, position: 'insideLeft', style: { fontSize: 12, fontWeight: 'bold' } }}
                      />
                      <RechartsTooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {engData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Individual Observations List */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <List className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl font-bold text-gray-900">
                Individual Observations <span className="text-gray-500 font-normal">({filteredObservations.length})</span>
              </h2>
            </div>
            <div className="text-sm text-gray-500 hidden md:block">Swipe to view past observations &rarr;</div>
          </div>
          
          {filteredObservations.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-black/5 text-center text-gray-500">
              No data exists for the selected staff member or school.
            </div>
          ) : (
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 -mx-4 px-4 md:mx-0 md:px-0 custom-scrollbar">
              {filteredObservations.map(obs => (
              <div key={obs.id} className="flex-none w-full lg:w-[calc(50%-12px)] snap-center bg-white p-6 rounded-2xl shadow-sm border border-black/5 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full uppercase tracking-wider">
                    {obs.mode}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {format(new Date(obs.createdAt), 'MMM d, yyyy')}
                    </span>
                    <button onClick={() => exportChart(`chart-obs-${obs.id}`, `observation-${obs.educatorName.replace(/\s+/g, '-')}-${obs.mode}`)} className="text-gray-500 hover:text-black transition flex items-center gap-1 text-sm font-medium bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded-md" title="Export Chart">
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Export</span>
                    </button>
                    {user.uid === obs.uid && (
                      <button onClick={() => deleteObservation(obs.id)} className="text-red-500 hover:text-red-700 transition flex items-center gap-1 text-sm font-medium bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md" title="Delete Observation">
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-1">{obs.educatorName}</h3>
                <p className="text-gray-500 text-sm mb-4">{obs.school}</p>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Duration</p>
                    <p className="font-mono font-medium">{formatElapsed(obs.durationMs)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Events</p>
                    <p className="font-mono font-medium">{obs.events?.length || 0}</p>
                  </div>
                </div>

                <div className="mt-auto pt-2 border-t border-gray-100">
                  <div id={`chart-obs-${obs.id}`} className="mb-6 h-auto bg-white p-2">
                    <Chart events={obs.events || []} durationMs={obs.durationMs} mode={obs.mode} />
                  </div>
                  
                  {obs.mode === 'OTRs' && (
                    <p className="text-center text-sm font-medium text-gray-600 mb-4">Goal: 3-5 per min. whole group</p>
                  )}
                  {obs.mode === 'Praise' && (
                    <p className="text-center text-sm font-medium text-gray-600 mb-4">Goal: 5 positive to 1 negative</p>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg flex flex-col items-start">
                      <span className="block text-gray-500 mb-2">Curricula Used</span>
                      <span className={clsx("font-bold px-2 py-1 rounded-md text-sm", obs.curriculaMaterialsUsed === 'Yes' ? 'bg-green-100 text-green-800' : obs.curriculaMaterialsUsed === 'No' ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-800')}>
                        {obs.curriculaMaterialsUsed || 'N/A'}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg flex flex-col items-start">
                      <span className="block text-gray-500 mb-2">Target Referenced</span>
                      <span className={clsx("font-bold px-2 py-1 rounded-md text-sm", obs.lessonTargetPosted === 'Yes' ? 'bg-green-100 text-green-800' : obs.lessonTargetPosted === 'No' ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-800')}>
                        {obs.lessonTargetPosted || 'N/A'}
                      </span>
                    </div>
                    
                                        {/* Notes Section */}
                    <div className="col-span-1 sm:col-span-2 bg-[#f7f7f5] text-black p-4 rounded-xl mt-2 border border-black/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-xs text-gray-500 uppercase tracking-wider">Notes</span>
                        {user.uid === obs.uid && editingNotesId !== obs.id && (
                          <button onClick={() => startEditingNotes(obs)} className="text-gray-400 hover:text-black flex items-center gap-1 text-sm transition-colors">
                            <Edit2 className="w-4 h-4" /> Edit
                          </button>
                        )}
                      </div>
                      {editingNotesId === obs.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={tempNotes}
                            onChange={(e) => setTempNotes(e.target.value)}
                            className="w-full p-3 rounded-xl border border-black/10 bg-[#f7f7f5] text-black focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none min-h-[100px] text-sm font-sans resize-y"
                            placeholder="Type notes here..."
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingNotesId(null)} className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition">Cancel</button>
                            <button onClick={() => saveNotes(obs.id)} className="px-3 py-1.5 text-sm font-medium bg-black text-white hover:bg-gray-800 rounded-lg transition flex items-center gap-1">
                              <Save className="w-4 h-4" /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-700 whitespace-pre-wrap text-sm font-sans">{obs.notes || <span className="text-gray-400 italic">No notes added.</span>}</p>
                      )}
                    </div>
                    
                    {/* Raw Data Toggle Section */}
                    <div className="col-span-1 sm:col-span-2 mt-4 border-t border-gray-100 pt-4">
                      <button 
                        onClick={() => {
                          const newExpanded = new Set(expandedRawDataIds);
                          if (newExpanded.has(obs.id)) {
                            newExpanded.delete(obs.id);
                          } else {
                            newExpanded.add(obs.id);
                          }
                          setExpandedRawDataIds(newExpanded);
                        }}
                        className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                          <Table className="w-4 h-4" />
                          <span>Raw Data ({(obs.events || []).length} events)</span>
                        </div>
                        <div className="text-gray-400">
                          {expandedRawDataIds.has(obs.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>
                      
                      {expandedRawDataIds.has(obs.id) && (
                        <div className="mt-4 max-h-[300px] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-inner">
                          <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                              <tr>
                                <th scope="col" className="px-6 py-3">Time</th>
                                <th scope="col" className="px-6 py-3">Event Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(obs.events || []).map((event, idx) => (
                                <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                                  <td className="px-6 py-3 font-mono font-medium text-gray-900">{formatElapsed(event.tMs)}</td>
                                  <td className="px-6 py-3 capitalize">{event.kind.replace(/([A-Z])/g, ' $1').trim()}</td>
                                </tr>
                              ))}
                              {(!obs.events || obs.events.length === 0) && (
                                <tr>
                                  <td colSpan={2} className="px-6 py-4 text-center text-gray-500 italic">No events recorded</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function formatElapsed(ms: number) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
