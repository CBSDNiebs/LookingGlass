import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { collection, addDoc, query, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

import { ArrowLeft } from 'lucide-react';

export const cleanStaffName = (name: string) => {
  if (!name) return name;
  let cleaned = name.split('-')[0].trim();
  cleaned = cleaned.replace(/ Intervention Spec.*$/, '').trim();
  cleaned = cleaned.replace(/ Case Manager.*$/, '').trim();
  return cleaned;
};

export default function ObservationFlow({ user }: { user: User }) {
  const navigate = useNavigate();
  const [dbStaff, setDbStaff] = useState<{name: string, school: string, email: string, role: string}[]>([]);
  
  useEffect(() => {
    const qStaff = query(collection(db, 'staff'));
    const unsubscribeStaff = onSnapshot(qStaff, (snapshot) => {
      setDbStaff(snapshot.docs.map(doc => ({
        name: doc.data().name,
        school: doc.data().school,
        email: doc.data().email,
        role: doc.data().role || ''
      })));
    });
    return () => unsubscribeStaff();
  }, []);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'SAVE_OBSERVATION') {
        const payload = event.data.payload;
        
        let selectedSchool = 'Unknown School';
        // Look up school by matching the educator name dynamically
        const searchName = payload.educatorName.toLowerCase().trim();
        let exactMatch = dbStaff.find(s => s.name.toLowerCase() === searchName);
        
        if (!exactMatch) {
          const parts = searchName.split(/[\s,]+/);
          if (parts.length >= 2) {
            exactMatch = dbStaff.find(s => {
              const dbName = s.name.toLowerCase();
              return dbName.includes(parts[0]) && dbName.includes(parts[parts.length - 1]);
            });
          }
        }
        
        if (exactMatch) {
          selectedSchool = exactMatch.school;
        }

        try {
          await addDoc(collection(db, 'observations'), {
            uid: user.uid,
            educatorName: exactMatch ? exactMatch.name : cleanStaffName(payload.educatorName),
            school: selectedSchool,
            mode: payload.mode,
            lessonTargetPosted: payload.lessonTargetPosted,
            curriculaMaterialsUsed: payload.curriculaMaterialsUsed,
            durationMs: payload.durationMs,
            startedAt: payload.startedAt,
            stoppedAt: payload.stoppedAt,
            events: payload.events || [],
            notes: payload.notes || "",
            createdAt: new Date().toISOString()
          });
        } catch (error) {
          console.error("Error publishing observation:", error);
        }
      } else if (event.data?.type === 'OBSERVATION_SAVED') {
        navigate('/');
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [user, navigate, dbStaff]);

  return (
    <div className="min-h-screen bg-[#f7f7f5] flex flex-col font-sans relative">
      <div className="p-4 md:p-8 pb-0">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-black font-medium transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>
      <iframe 
        src="/walkthrough.html" 
        className="w-full flex-1 border-none mt-4"
        title="Observation Flow"
      />
    </div>
  );
}

export const STAFF_DIRECTORY: {name: string, school: string, email?: string, role?: string}[] = [];
