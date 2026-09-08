import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';
import { ArrowLeft, Upload, Trash2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StaffMember {
  id: string;
  email: string;
  name: string;
  school: string;
  role?: string;
}

export default function AdminPanel({ user: _user }: { user: User }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [csvData, setCsvData] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Only jacobn@cbk12.com or a valid admin should be here, but we enforce it via backend rules
    const q = query(collection(db, 'staff'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StaffMember[];
      setStaff(staffList);
    });
    return () => unsubscribe();
  }, []);

  const handleCsvUpload = async () => {
    if (!csvData.trim()) return;
    setIsProcessing(true);
    
    try {
      const lines = csvData.split('\n');
      // Expected formats: 
      // First Name, Last Name, Email, School, Role
      // Or First, Last, Email, School
      // Or Name, Email, School
      
      let processedCount = 0;
      for (const line of lines) {
        if (!line.trim()) continue;
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        
        let name = '', email = '', school = '', role = '';
        if (cols.length >= 5) {
          // Assuming: First, Last, Email, School, Role
          name = `${cols[1]}, ${cols[0]}`;
          email = cols[2];
          school = cols[3];
          role = cols[4];
        } else if (cols.length === 4) {
          // Assuming: First, Last, Email, School
          name = `${cols[1]}, ${cols[0]}`;
          email = cols[2];
          school = cols[3];
        } else if (cols.length === 3) {
          // Assuming Name, Email, School
          name = cols[0];
          email = cols[1];
          school = cols[2];
        }

        if (email && email.includes('@')) {
          await setDoc(doc(db, 'staff', email.toLowerCase()), {
            name,
            email: email.toLowerCase(),
            school,
            role
          });
          processedCount++;
        }
      }
      
      alert(`Successfully processed ${processedCount} staff members.`);
      setCsvData('');
    } catch (error) {
      console.error('Error uploading CSV:', error);
      alert('Failed to upload CSV. Check the format and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const removeStaff = async (id: string, email: string) => {
    if (window.confirm(`Are you sure you want to remove ${email}?`)) {
      try {
        await deleteDoc(doc(db, 'staff', id));
      } catch (error) {
        console.error('Error deleting staff:', error);
        alert('Failed to remove staff.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-white rounded-full transition">
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-8 h-8 text-[#1f9d55]" />
                Admin Panel
              </h1>
              <p className="text-gray-500">Manage Staff Directory & Access</p>
            </div>
          </div>
        </header>

        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-black/5 mb-8">
          <h2 className="text-xl font-bold mb-4">Bulk Import Staff (CSV)</h2>
          <p className="text-gray-500 mb-4 text-sm">
            Paste your CSV data here. Expected columns: <strong>First Name, Last Name, Email Address, School, Role</strong> (Where Role is optional. Use 'Principal', 'Superintendent', 'Teacher' etc).
          </p>
          <textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            className="w-full h-48 p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 font-mono text-sm mb-4"
            placeholder="Jane,Smith,jane@cbk12.com,Eastside Elementary School,Principal&#10;John,Doe,john@cbk12.com,Sunset Intermediate School,Teacher"
          />
          <button
            onClick={handleCsvUpload}
            disabled={isProcessing || !csvData.trim()}
            className="flex items-center gap-2 bg-[#1f9d55] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#15803d] transition disabled:opacity-50"
          >
            <Upload className="w-5 h-5" />
            {isProcessing ? 'Processing...' : 'Upload Data'}
          </button>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-black/5">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Current Staff Directory ({staff.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm">Name</th>
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm">Email</th>
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm">School</th>
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm">Role</th>
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-gray-900 font-medium">{s.name}</td>
                    <td className="py-3 px-4 text-gray-600">{s.email}</td>
                    <td className="py-3 px-4 text-gray-600">
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs">{s.school}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">{s.role || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => removeStaff(s.id, s.email)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">No staff members found. Upload a CSV to get started.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
